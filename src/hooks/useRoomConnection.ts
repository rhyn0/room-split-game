import PartySocket from 'partysocket';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RoomGameEngine } from '../../shared/engine';
import type {
  ClientRoomState,
  ClientToServerMessage,
  ServerToClientMessage,
} from '../../shared/types';

export interface ToastNotification {
  id: string;
  message: string;
  variant: 'info' | 'success' | 'warning' | 'error';
}

const SESSION_PLAYER_ID_KEY = 'split_room_player_id';
const LOCAL_PLAYER_NAME_KEY = 'split_room_player_name';

export function getOrCreateSessionPlayerId(): string {
  const params = new URLSearchParams(window.location.search);
  const queryPid = params.get('pid');
  if (queryPid) return queryPid;

  let stored = sessionStorage.getItem(SESSION_PLAYER_ID_KEY);
  if (!stored) {
    stored = `p_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
    sessionStorage.setItem(SESSION_PLAYER_ID_KEY, stored);
  }
  return stored;
}

export function getStoredPlayerName(): string {
  return localStorage.getItem(LOCAL_PLAYER_NAME_KEY) || '';
}

export function setStoredPlayerName(name: string): void {
  localStorage.setItem(LOCAL_PLAYER_NAME_KEY, name);
}

function resolvePartyHost(): string {
  const envHost = (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_PARTYKIT_HOST;
  if (envHost) return envHost;

  const { hostname, port, host } = window.location;
  // When running Vite dev server on 5173, connect to local PartyKit dev server on 1999
  if (port === '5173' || port === '4173') {
    return `${hostname}:1999`;
  }
  return host;
}

export function useRoomConnection() {
  const [roomCode, setRoomCode] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room');
    return code ? code.toUpperCase() : null;
  });

  const [playerName, setPlayerName] = useState<string>(() => getStoredPlayerName());
  const [playerId, setPlayerId] = useState<string>(() => getOrCreateSessionPlayerId());
  const [isSandboxMode, setIsSandboxMode] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<
    'disconnected' | 'connecting' | 'connected'
  >('disconnected');
  const [roomState, setRoomState] = useState<ClientRoomState | null>(null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const socketRef = useRef<PartySocket | null>(null);
  const sandboxEngineRef = useRef<RoomGameEngine | null>(null);
  const activeSandboxViewerRef = useRef<string>(playerId);

  const pushToast = useCallback(
    (message: string, variant: 'info' | 'success' | 'warning' | 'error' = 'info') => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Connect to PartyKit or Local Sandbox when roomCode is set
  const joinRoom = useCallback(
    (
      code: string,
      name: string,
      options?: { isSpectator?: boolean; sandbox?: boolean }
    ) => {
      const cleanCode = code.trim().toUpperCase();
      const cleanName = name.trim() || 'Player';
      setStoredPlayerName(cleanName);
      setPlayerName(cleanName);
      setRoomCode(cleanCode);

      // Update URL without reload so sharing the URL works
      const url = new URL(window.location.href);
      url.searchParams.set('room', cleanCode);
      window.history.replaceState({}, '', url.toString());

      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }

      if (options?.sandbox) {
        setIsSandboxMode(true);
        setConnectionStatus('connected');
        const engine = new RoomGameEngine(cleanCode, {
          onBroadcastState: () => {
            if (sandboxEngineRef.current) {
              setRoomState(
                sandboxEngineRef.current.getStateForPlayer(
                  activeSandboxViewerRef.current
                )
              );
            }
          },
          onSendToast: (targetId, msg, variant) => {
            if (targetId === activeSandboxViewerRef.current) {
              pushToast(msg, variant);
            }
          },
          onSendError: (targetId, msg) => {
            if (targetId === activeSandboxViewerRef.current) {
              pushToast(msg, 'error');
            }
          },
          onScheduleTimer: (delayMs, cb) => {
            setTimeout(cb, delayMs);
          },
        });
        sandboxEngineRef.current = engine;
        activeSandboxViewerRef.current = playerId;
        engine.handleMessage(playerId, {
          type: 'JOIN_ROOM',
          playerId,
          name: cleanName,
          isSpectator: options?.isSpectator,
        });
        return;
      }

      setIsSandboxMode(false);
      setConnectionStatus('connecting');

      const ws = new PartySocket({
        host: resolvePartyHost(),
        room: cleanCode,
        query: { playerId },
      });

      ws.addEventListener('open', () => {
        setConnectionStatus('connected');
        const joinMsg: ClientToServerMessage = {
          type: 'JOIN_ROOM',
          playerId,
          name: cleanName,
          isSpectator: options?.isSpectator,
        };
        ws.send(JSON.stringify(joinMsg));
      });

      ws.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data) as ServerToClientMessage;
          if (data.type === 'STATE_SYNC') {
            setRoomState(data.state);
          } else if (data.type === 'TOAST') {
            pushToast(data.message, data.variant);
          } else if (data.type === 'ERROR') {
            pushToast(data.message, 'error');
          }
        } catch {
          // Ignore malformed packets
        }
      });

      ws.addEventListener('close', () => {
        setConnectionStatus('disconnected');
      });

      socketRef.current = ws;
    },
    [playerId, pushToast]
  );

  const sendMessage = useCallback(
    (msg: ClientToServerMessage) => {
      if (isSandboxMode && sandboxEngineRef.current) {
        sandboxEngineRef.current.handleMessage(activeSandboxViewerRef.current, msg);
        return;
      }
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify(msg));
      } else {
        pushToast('Reconnecting to room server...', 'warning');
      }
    },
    [isSandboxMode, pushToast]
  );

  const leaveRoom = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    sandboxEngineRef.current = null;
    setRoomState(null);
    setRoomCode(null);
    setConnectionStatus('disconnected');
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.replaceState({}, '', url.toString());
  }, []);

  // Sandbox helper: add a simulated human seat or switch perspective between seats
  const switchSandboxPerspective = useCallback((targetPlayerId: string) => {
    if (!sandboxEngineRef.current) return;
    activeSandboxViewerRef.current = targetPlayerId;
    setPlayerId(targetPlayerId);
    setRoomState(sandboxEngineRef.current.getStateForPlayer(targetPlayerId));
  }, []);

  const addSandboxHumanSeat = useCallback((seatName: string) => {
    if (!sandboxEngineRef.current) return;
    const newSeatId = `seat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    sandboxEngineRef.current.handleMessage(newSeatId, {
      type: 'JOIN_ROOM',
      playerId: newSeatId,
      name: seatName,
    });
  }, []);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  return {
    roomCode,
    playerName,
    playerId,
    isSandboxMode,
    connectionStatus,
    roomState,
    toasts,
    joinRoom,
    sendMessage,
    leaveRoom,
    dismissToast,
    pushToast,
    switchSandboxPerspective,
    addSandboxHumanSeat,
  };
}

import type * as Party from 'partykit/server';
import { RoomGameEngine } from '../shared/engine';
import type { ClientToServerMessage, ServerToClientMessage } from '../shared/types';

export default class SplitTheRoomServer implements Party.Server {
  private engine: RoomGameEngine;
  private connToPlayerId: Map<string, string> = new Map();
  private activeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(readonly room: Party.Room) {
    this.engine = new RoomGameEngine(room.id, {
      onBroadcastState: () => this.broadcastPersonalizedStates(),
      onSendToast: (playerId, message, variant) =>
        this.sendToPlayer(playerId, { type: 'TOAST', message, variant }),
      onSendError: (playerId, message) =>
        this.sendToPlayer(playerId, { type: 'ERROR', message }),
      onScheduleTimer: (delayMs, callback) => {
        if (this.activeTimer) {
          clearTimeout(this.activeTimer);
        }
        this.activeTimer = setTimeout(() => {
          this.activeTimer = null;
          callback();
        }, delayMs);
      },
    });
  }

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext): void {
    const url = new URL(ctx.request.url);
    const queryPlayerId = url.searchParams.get('playerId') || conn.id;
    this.connToPlayerId.set(conn.id, queryPlayerId);

    // Send initial state snapshot
    const state = this.engine.getStateForPlayer(queryPlayerId);
    const syncMsg: ServerToClientMessage = { type: 'STATE_SYNC', state };
    conn.send(JSON.stringify(syncMsg));
  }

  onMessage(message: string, sender: Party.Connection): void {
    try {
      const parsed = JSON.parse(message) as ClientToServerMessage;
      if (parsed.type === 'JOIN_ROOM' && parsed.playerId) {
        this.connToPlayerId.set(sender.id, parsed.playerId);
      }
      const playerId = this.connToPlayerId.get(sender.id) ?? sender.id;
      this.engine.handleMessage(playerId, parsed);
    } catch {
      const errMsg: ServerToClientMessage = {
        type: 'ERROR',
        message: 'Invalid message format received.',
      };
      sender.send(JSON.stringify(errMsg));
    }
  }

  onClose(conn: Party.Connection): void {
    const playerId = this.connToPlayerId.get(conn.id);
    this.connToPlayerId.delete(conn.id);
    if (!playerId) return;

    // Only mark disconnected if no other active connection uses this playerId
    const stillConnected = Array.from(this.connToPlayerId.values()).includes(playerId);
    if (!stillConnected) {
      this.engine.handleDisconnect(playerId);
    }
  }

  private broadcastPersonalizedStates(): void {
    for (const conn of this.room.getConnections()) {
      const playerId = this.connToPlayerId.get(conn.id) ?? conn.id;
      const state = this.engine.getStateForPlayer(playerId);
      const msg: ServerToClientMessage = { type: 'STATE_SYNC', state };
      conn.send(JSON.stringify(msg));
    }
  }

  private sendToPlayer(playerId: string, msg: ServerToClientMessage): void {
    const payload = JSON.stringify(msg);
    for (const conn of this.room.getConnections()) {
      const mappedId = this.connToPlayerId.get(conn.id) ?? conn.id;
      if (mappedId === playerId) {
        conn.send(payload);
      }
    }
  }
}

SplitTheRoomServer satisfies Party.Worker;

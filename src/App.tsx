import {
  Clock,
  Gavel,
  LogOut,
  Monitor,
  Plus,
  Scale,
  Sparkles,
  Trophy,
  UserPlus,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { JudgePromptView } from './components/JudgePromptView';
import { LobbyView } from './components/LobbyView';
import { LockInView } from './components/LockInView';
import { PersuasionBoard } from './components/PersuasionBoard';
import { PostGameView } from './components/PostGameView';
import { RevealView } from './components/RevealView';
import { useRoomConnection } from './hooks/useRoomConnection';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const App: React.FC = () => {
  const {
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
  } = useRoomConnection();

  const [nameInput, setNameInput] = useState(playerName || '');
  const [joinCodeInput, setJoinCodeInput] = useState(roomCode || '');
  const [joinAsSpectator, setJoinAsSpectator] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  // Countdown timer ticker
  useEffect(() => {
    const deadlineMs = roomState?.phaseDeadlineMs;
    if (!deadlineMs) {
      setSecondsLeft(null);
      return;
    }
    const updateTimer = () => {
      const diff = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
      setSecondsLeft(diff);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [roomState?.phaseDeadlineMs]);

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = nameInput.trim() || 'Player 1';
    const newCode = generateRoomCode();
    joinRoom(newCode, cleanName, { isSpectator: false, sandbox: false });
  };

  const handleJoinExisting = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = nameInput.trim() || 'Player';
    const cleanCode = joinCodeInput.trim().toUpperCase();
    if (!cleanCode) return;
    joinRoom(cleanCode, cleanName, {
      isSpectator: joinAsSpectator,
      sandbox: false,
    });
  };

  const handleStartSandbox = () => {
    const cleanName = nameInput.trim() || 'Host Player';
    const code = 'DEMO';
    joinRoom(code, cleanName, { isSpectator: false, sandbox: true });
  };

  return (
    <div className="app-shell">
      {/* Toast Notifications */}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast-item toast-${t.variant}`}
            onClick={() => dismissToast(t.id)}
          >
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Top Navigation / Status Header */}
      <header className="top-navbar">
        <div className="brand-group">
          <div className="brand-logo-icon">
            <Scale size={20} />
          </div>
          <div>
            <span className="brand-title">SPLIT THE ROOM</span>
            <span className="brand-subtitle">Social Deduction & Persuasion</span>
          </div>
        </div>

        {roomState && (
          <div className="navbar-room-meta">
            <div className="room-pill">
              <span className="room-pill-label">ROOM</span>
              <strong>{roomState.roomCode}</strong>
            </div>

            {roomState.phase !== 'LOBBY' && (
              <div className="round-pill" data-testid="round-counter-pill">
                Round {roomState.currentRound} / {roomState.totalRounds}
              </div>
            )}

            {secondsLeft !== null && (
              <div
                className={`timer-pill ${secondsLeft <= 10 ? 'timer-pill-urgent' : ''}`}
              >
                <Clock size={15} /> {secondsLeft}s
              </div>
            )}

            <div className="conn-indicator">
              {connectionStatus === 'connected' ? (
                <span className="conn-ok">
                  <Wifi size={14} /> {isSandboxMode ? 'Local Sandbox' : 'Live Edge'}
                </span>
              ) : (
                <span className="conn-warn">
                  <WifiOff size={14} /> {connectionStatus}
                </span>
              )}
            </div>

            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={leaveRoom}
              title="Leave Room"
            >
              <LogOut size={15} /> Leave
            </button>
          </div>
        )}
      </header>

      {/* Sandbox Multi-Seat Switcher Bar (when in Local Sandbox Mode) */}
      {isSandboxMode && roomState && (
        <div className="sandbox-switcher-bar" data-testid="sandbox-bar">
          <div className="sandbox-bar-left">
            <span className="sandbox-badge">MULTI-SEAT SANDBOX</span>
            <span className="sandbox-hint">
              Switch active player perspective to test secret roles & votes:
            </span>
          </div>
          <div className="sandbox-seats">
            {roomState.players
              .filter((p) => !p.isBot)
              .map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`seat-btn ${p.id === playerId ? 'seat-btn-active' : ''}`}
                  onClick={() => switchSandboxPerspective(p.id)}
                  data-testid={`switch-seat-${p.name}`}
                >
                  {p.name}
                  {p.id === roomState.judgeId ? ' (Judge)' : ''}
                </button>
              ))}
            {roomState.phase === 'LOBBY' && (
              <button
                type="button"
                className="seat-btn seat-btn-add"
                onClick={() => {
                  const humanCount = roomState.players.filter((p) => !p.isBot).length;
                  addSandboxHumanSeat(`Player ${humanCount + 1}`);
                }}
                data-testid="add-sandbox-seat-btn"
              >
                <UserPlus size={14} /> + Add Human Seat
              </button>
            )}
          </div>
        </div>
      )}

      {/* Scoreboard Ribbon during active rounds */}
      {roomState &&
        roomState.phase !== 'LOBBY' &&
        roomState.phase !== 'POST_GAME_SUMMARY' && (
          <div className="scoreboard-ribbon">
            {roomState.players
              .filter((p) => !p.isSpectator)
              .map((p) => {
                const isJudge = p.id === roomState.judgeId;
                const isMe = p.id === roomState.myPlayerId;
                return (
                  <div
                    key={p.id}
                    className={`ribbon-player ${isJudge ? 'ribbon-player-judge' : ''} ${isMe ? 'ribbon-player-me' : ''}`}
                  >
                    <span
                      className="avatar-dot avatar-xs"
                      style={{ backgroundColor: p.avatarColor }}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="ribbon-name">{p.name}</span>
                    {isJudge && (
                      <span className="ribbon-judge-icon" title="Current Judge">
                        <Gavel size={13} />
                      </span>
                    )}
                    <span className="ribbon-score">
                      {roomState.settings.voteRevealMode === 'fog_of_war'
                        ? '? pts'
                        : `${p.score} pts`}
                    </span>
                  </div>
                );
              })}
          </div>
        )}

      {/* Main Content Area */}
      <main className="main-container">
        {!roomState ? (
          <div className="landing-wrapper">
            <div className="landing-hero">
              <span className="hero-pill">
                <Sparkles size={14} /> ONLINE SOCIAL DEDUCTION & PERSUASION
              </span>
              <h1 className="hero-title">
                Ask One Question.
                <br />
                <span className="hero-gradient-text">Split the Room.</span>
              </h1>
              <p className="hero-lead">
                Each round, the <strong>Judge</strong> writes a free-form 2-choice
                dilemma to divide the group and hunt for the{' '}
                <strong>smallest non-zero minority</strong>. Everyone else locks in
                secretly, receives a hidden <strong>Role Card</strong>, and bluffs on
                the persuasion board to bait the Judge!
              </p>
            </div>

            <div className="landing-cards-grid">
              {/* Create or Join Live Multiplayer Room */}
              <div className="card auth-card">
                <h2 className="card-title">
                  <Users size={19} /> Play Live with Friends
                </h2>
                <p className="card-subtitle">
                  Powered by PartyKit real-time edge rooms — zero sign-up required
                </p>

                <div className="form-field">
                  <label htmlFor="player-name-input" className="field-label">
                    Your Display Name
                  </label>
                  <input
                    id="player-name-input"
                    type="text"
                    className="text-input"
                    maxLength={20}
                    placeholder="e.g. Alex"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    data-testid="player-name-input"
                  />
                </div>

                <div className="landing-actions-stack">
                  <button
                    type="button"
                    className="btn-primary btn-lg btn-full"
                    onClick={handleCreateRoom}
                    data-testid="create-room-btn"
                  >
                    <Plus size={18} /> Create New Room
                  </button>

                  <div className="divider-text">OR JOIN BY 4-LETTER CODE</div>

                  <form onSubmit={handleJoinExisting} className="join-row">
                    <input
                      type="text"
                      className="text-input code-input"
                      maxLength={6}
                      placeholder="ABCD"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                      data-testid="join-code-input"
                    />
                    <button
                      type="submit"
                      className="btn-secondary btn-lg"
                      disabled={!joinCodeInput.trim()}
                      data-testid="join-room-btn"
                    >
                      Join Room
                    </button>
                  </form>

                  <label className="spectator-checkbox-row">
                    <input
                      type="checkbox"
                      checked={joinAsSpectator}
                      onChange={(e) => setJoinAsSpectator(e.target.checked)}
                    />
                    <Monitor size={15} />
                    <span>Join as Shared TV / Discord Stage Display (Spectator)</span>
                  </label>
                </div>

                <div className="sandbox-callout">
                  <div>
                    <strong>Testing solo or offline?</strong>
                    <p>
                      Launch a multi-seat sandbox right in your browser to test roles,
                      bots, and multiple player views side-by-side.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={handleStartSandbox}
                    data-testid="start-sandbox-btn"
                  >
                    Launch Local Sandbox
                  </button>
                </div>
              </div>

              {/* How It Works Guide */}
              <div className="card rules-preview-card">
                <h2 className="card-title">
                  <Trophy size={19} /> How Scoring & Deduction Work
                </h2>
                <div className="rules-steps">
                  <div className="rule-step">
                    <div className="rule-num">1</div>
                    <div>
                      <h4>The Judge Writes a 2-Choice Dilemma</h4>
                      <p>
                        Strictly free-form: ask a philosophical question, hot take, or
                        trap designed to divide your friends into Option A vs. Option B.
                      </p>
                    </div>
                  </div>
                  <div className="rule-step">
                    <div className="rule-num">2</div>
                    <div>
                      <h4>Secret Lock-In & Hidden Role Cards</h4>
                      <p>
                        All <strong>N</strong> voters secretly lock in A or B and
                        receive a secret Role Card (like <em>The Baiter</em>,{' '}
                        <em>The Lone Wolf</em>, <em>The Forger</em>, or{' '}
                        <em>The Saboteur</em>).
                      </p>
                    </div>
                  </div>
                  <div className="rule-step">
                    <div className="rule-num">3</div>
                    <div>
                      <h4>Persuasion & Active Powers</h4>
                      <p>
                        Post pitch cards on the board (or bluff over Discord!). Trigger
                        active powers to wiretap a vote, forge a card under a friend’s
                        name, or secretly nudge someone’s choice!
                      </p>
                    </div>
                  </div>
                  <div className="rule-step">
                    <div className="rule-num">4</div>
                    <div>
                      <h4>The Non-Zero Minority Verdict</h4>
                      <p>
                        The Judge picks A or B. If <strong>k</strong> players are on
                        that side, the Judge scores <strong>(N − k) pts</strong>—but
                        scores <strong>0 pts</strong> if baited into an empty side (
                        <strong>k = 0</strong>) or unanimous side (
                        <strong>k = N</strong>)! Voters on the Judge’s side earn{' '}
                        <strong>+2 base pts</strong> + Role Bonuses!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {roomState.phase === 'LOBBY' && (
              <LobbyView
                state={roomState}
                sendMessage={sendMessage}
                onCopySuccess={(msg) => pushToast(msg, 'success')}
              />
            )}
            {roomState.phase === 'PHASE1_JUDGE_QUESTION' && (
              <JudgePromptView state={roomState} sendMessage={sendMessage} />
            )}
            {roomState.phase === 'PHASE2_SECRET_LOCK_IN' && (
              <LockInView state={roomState} sendMessage={sendMessage} />
            )}
            {(roomState.phase === 'PHASE3_PERSUASION' ||
              roomState.phase === 'PHASE4_JUDGE_DECISION') && (
              <PersuasionBoard state={roomState} sendMessage={sendMessage} />
            )}
            {roomState.phase === 'PHASE5_REVEAL_AND_SCORE' && (
              <RevealView state={roomState} sendMessage={sendMessage} />
            )}
            {roomState.phase === 'POST_GAME_SUMMARY' && (
              <PostGameView state={roomState} sendMessage={sendMessage} />
            )}
          </>
        )}
      </main>
    </div>
  );
};

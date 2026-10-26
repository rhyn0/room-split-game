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
import { Badge, Button, Card, Input } from './components/ui';
import { useRoomConnection } from './hooks/useRoomConnection';
import { cn } from './lib/utils';

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
    <div className="min-h-screen flex flex-col">
      {/* Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => dismissToast(t.id)}
            className={cn(
              'px-4 py-3 rounded-xl text-xs font-semibold shadow-2xl cursor-pointer border text-white',
              t.variant === 'success' && 'bg-emerald-950/95 border-emerald-500',
              t.variant === 'warning' && 'bg-amber-950/95 border-amber-500',
              t.variant === 'error' && 'bg-rose-950/95 border-rose-500',
              t.variant === 'info' && 'bg-slate-900/95 border-slate-700'
            )}
          >
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Top Navigation / Status Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-b border-slate-800/80 bg-[#090b12]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <Scale size={20} />
          </div>
          <div>
            <span className="block font-display font-extrabold text-base tracking-wider">
              SPLIT THE ROOM
            </span>
            <span className="block text-[11px] text-slate-400">
              Social Deduction & Persuasion
            </span>
          </div>
        </div>

        {roomState && (
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge variant="muted" size="md">
              <span className="text-slate-400 font-normal">ROOM</span>
              <strong className="text-white">{roomState.roomCode}</strong>
            </Badge>

            {roomState.phase !== 'LOBBY' && (
              <Badge variant="default" size="md" data-testid="round-counter-pill">
                Round {roomState.currentRound} / {roomState.totalRounds}
              </Badge>
            )}

            {secondsLeft !== null && (
              <Badge variant={secondsLeft <= 10 ? 'danger' : 'muted'} size="md">
                <Clock size={14} /> {secondsLeft}s
              </Badge>
            )}

            <div className="text-xs font-medium px-1">
              {connectionStatus === 'connected' ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-400">
                  <Wifi size={14} /> {isSandboxMode ? 'Local Sandbox' : 'Live Edge'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-amber-400">
                  <WifiOff size={14} /> {connectionStatus}
                </span>
              )}
            </div>

            <Button variant="ghost" size="sm" onClick={leaveRoom} title="Leave Room">
              <LogOut size={15} /> Leave
            </Button>
          </div>
        )}
      </header>

      {/* Sandbox Multi-Seat Switcher Bar (when in Local Sandbox Mode) */}
      {isSandboxMode && roomState && (
        <div
          className="bg-indigo-500/15 border-b border-indigo-500/35 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3"
          data-testid="sandbox-bar"
        >
          <div className="flex items-center gap-2.5 text-xs">
            <Badge variant="default">MULTI-SEAT SANDBOX</Badge>
            <span className="text-slate-300">
              Switch active player perspective to test secret roles & votes:
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {roomState.players
              .filter((p) => !p.isBot)
              .map((p) => (
                <Button
                  key={p.id}
                  variant={p.id === playerId ? 'primary' : 'secondary'}
                  size="xs"
                  onClick={() => switchSandboxPerspective(p.id)}
                  data-testid={`switch-seat-${p.name}`}
                >
                  {p.name}
                  {p.id === roomState.judgeId ? ' (Judge)' : ''}
                </Button>
              ))}
            {roomState.phase === 'LOBBY' && (
              <Button
                variant="ghost"
                size="xs"
                className="border-dashed border-indigo-400/50 text-indigo-300"
                onClick={() => {
                  const humanCount = roomState.players.filter((p) => !p.isBot).length;
                  addSandboxHumanSeat(`Player ${humanCount + 1}`);
                }}
                data-testid="add-sandbox-seat-btn"
              >
                <UserPlus size={13} /> + Add Human Seat
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Scoreboard Ribbon during active rounds */}
      {roomState &&
        roomState.phase !== 'LOBBY' &&
        roomState.phase !== 'POST_GAME_SUMMARY' && (
          <div className="flex items-center gap-2 px-6 py-2.5 bg-slate-950/75 border-b border-slate-800/80 overflow-x-auto">
            {roomState.players
              .filter((p) => !p.isSpectator)
              .map((p) => {
                const isJudge = p.id === roomState.judgeId;
                const isMe = p.id === roomState.myPlayerId;
                return (
                  <div
                    key={p.id}
                    className={cn(
                      'inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs whitespace-nowrap bg-slate-900/70',
                      isJudge
                        ? 'border-amber-500/55 bg-amber-500/10'
                        : isMe
                          ? 'border-indigo-500/55'
                          : 'border-slate-800'
                    )}
                  >
                    <span
                      className="w-5 h-5 rounded-full inline-flex items-center justify-center font-extrabold text-[10px] text-white"
                      style={{ backgroundColor: p.avatarColor }}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="font-semibold">{p.name}</span>
                    {isJudge && (
                      <span
                        className="text-amber-400 inline-flex"
                        title="Current Judge"
                      >
                        <Gavel size={12} />
                      </span>
                    )}
                    <span className="text-slate-400 font-bold text-[11px]">
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
      <main className="flex-1 w-full max-w-6xl mx-auto px-5 pt-6 pb-14">
        {!roomState ? (
          <div className="flex flex-col gap-8">
            <div className="text-center max-w-2xl mx-auto mt-2">
              <Badge variant="default" size="md" className="mb-3">
                <Sparkles size={13} /> ONLINE SOCIAL DEDUCTION & PERSUASION
              </Badge>
              <h1 className="font-display text-4xl sm:text-5xl font-extrabold leading-tight mb-3">
                Ask One Question.
                <br />
                <span className="bg-gradient-to-r from-sky-400 via-indigo-400 to-rose-400 bg-clip-text text-transparent">
                  Split the Room.
                </span>
              </h1>
              <p className="text-slate-400 text-sm sm:text-base">
                Each round, the <strong className="text-slate-200">Judge</strong> writes
                a free-form 2-choice dilemma to divide the group and hunt for the{' '}
                <strong className="text-slate-200">smallest non-zero minority</strong>.
                Everyone else locks in secretly, receives a hidden{' '}
                <strong className="text-slate-200">Role Card</strong>, and bluffs on the
                persuasion board to bait the Judge!
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Create or Join Live Multiplayer Room */}
              <Card className="lg:col-span-6">
                <h2 className="font-display text-lg font-bold flex items-center gap-2">
                  <Users size={19} className="text-indigo-400" /> Play Live with Friends
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 mb-4">
                  Powered by PartyKit real-time edge rooms — zero sign-up required
                </p>

                <div className="flex flex-col gap-1.5 mb-4">
                  <label
                    htmlFor="player-name-input"
                    className="text-xs font-bold uppercase tracking-wider text-slate-300"
                  >
                    Your Display Name
                  </label>
                  <Input
                    id="player-name-input"
                    maxLength={20}
                    placeholder="e.g. Alex"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    data-testid="player-name-input"
                  />
                </div>

                <div className="flex flex-col gap-3.5">
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={handleCreateRoom}
                    data-testid="create-room-btn"
                  >
                    <Plus size={18} /> Create New Room
                  </Button>

                  <div className="text-center text-[11px] font-bold tracking-widest text-slate-500">
                    OR JOIN BY 4-LETTER CODE
                  </div>

                  <form
                    onSubmit={handleJoinExisting}
                    className="grid grid-cols-[1fr_auto] gap-2.5"
                  >
                    <Input
                      variant="code"
                      maxLength={6}
                      placeholder="ABCD"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                      data-testid="join-code-input"
                    />
                    <Button
                      type="submit"
                      variant="secondary"
                      size="lg"
                      disabled={!joinCodeInput.trim()}
                      data-testid="join-room-btn"
                    >
                      Join Room
                    </Button>
                  </form>

                  <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={joinAsSpectator}
                      onChange={(e) => setJoinAsSpectator(e.target.checked)}
                    />
                    <Monitor size={15} />
                    <span>Join as Shared TV / Discord Stage Display (Spectator)</span>
                  </label>
                </div>

                <div className="mt-5 p-4 rounded-xl bg-indigo-500/10 border border-dashed border-indigo-500/35 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="max-w-xs">
                    <strong className="text-white">Testing solo or offline?</strong>
                    <p className="text-slate-400 mt-0.5">
                      Launch a multi-seat sandbox right in your browser to test roles,
                      bots, and multiple player views side-by-side.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleStartSandbox}
                    data-testid="start-sandbox-btn"
                  >
                    Launch Local Sandbox
                  </Button>
                </div>
              </Card>

              {/* How It Works Guide */}
              <Card className="lg:col-span-6">
                <h2 className="font-display text-lg font-bold flex items-center gap-2 mb-4">
                  <Trophy size={19} className="text-amber-400" /> How Scoring &
                  Deduction Work
                </h2>
                <div className="flex flex-col gap-4">
                  {[
                    {
                      num: 1,
                      title: 'The Judge Writes a 2-Choice Dilemma',
                      desc: 'Strictly free-form: ask a philosophical question, hot take, or trap designed to divide your friends into Option A vs. Option B.',
                    },
                    {
                      num: 2,
                      title: 'Secret Lock-In & Hidden Role Cards',
                      desc: 'All N voters secretly lock in A or B and receive a secret Role Card (like The Baiter, The Lone Wolf, The Forger, or The Saboteur).',
                    },
                    {
                      num: 3,
                      title: 'Persuasion & Active Powers',
                      desc: 'Post pitch cards on the board (or bluff over Discord!). Trigger active powers to wiretap a vote, forge a card under a friend’s name, or secretly nudge someone’s choice!',
                    },
                    {
                      num: 4,
                      title: 'The Non-Zero Minority Verdict',
                      desc: 'The Judge picks A or B. If k players are on that side, the Judge scores (N − k) pts—but scores 0 pts if baited into an empty side (k = 0) or unanimous side (k = N)! Voters on the Judge’s side earn +2 base pts + Role Bonuses!',
                    },
                  ].map((step) => (
                    <div key={step.num} className="flex gap-3.5 items-start">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 font-extrabold text-xs flex items-center justify-center shrink-0">
                        {step.num}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white mb-0.5">
                          {step.title}
                        </h4>
                        <p className="text-xs text-slate-400">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
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

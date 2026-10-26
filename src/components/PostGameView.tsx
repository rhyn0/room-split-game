import { Award, Crown, Gavel, RotateCcw, Trophy } from 'lucide-react';
import type React from 'react';
import type { ClientRoomState, ClientToServerMessage } from '../../shared/types';
import { cn } from '../lib/utils';
import { Badge, Button, Card } from './ui';

interface PostGameViewProps {
  state: ClientRoomState;
  sendMessage: (msg: ClientToServerMessage) => void;
}

export const PostGameView: React.FC<PostGameViewProps> = ({ state, sendMessage }) => {
  const me = state.players.find((p) => p.id === state.myPlayerId);
  const isHost = Boolean(me?.isHost);

  const sortedPlayers = [...state.players]
    .filter((p) => !p.isSpectator)
    .sort((a, b) => b.score - a.score);

  const topScore = sortedPlayers[0]?.score ?? 0;
  const winners = sortedPlayers.filter((p) => p.score === topScore);

  // Calculate fun match awards from matchHistory
  const judgeScoresByPlayer: Record<string, number> = {};
  const bonusScoresByPlayer: Record<string, number> = {};

  for (const round of state.matchHistory) {
    for (const bd of round.breakdowns) {
      if (bd.isJudge) {
        judgeScoresByPlayer[bd.playerId] =
          (judgeScoresByPlayer[bd.playerId] ?? 0) + bd.totalRoundPoints;
      } else {
        bonusScoresByPlayer[bd.playerId] =
          (bonusScoresByPlayer[bd.playerId] ?? 0) + bd.bonusPoints;
      }
    }
  }

  const bestJudgePlayer = [...sortedPlayers].sort(
    (a, b) => (judgeScoresByPlayer[b.id] ?? 0) - (judgeScoresByPlayer[a.id] ?? 0)
  )[0];

  const bestRolePlayer = [...sortedPlayers].sort(
    (a, b) => (bonusScoresByPlayer[b.id] ?? 0) - (bonusScoresByPlayer[a.id] ?? 0)
  )[0];

  return (
    <div className="flex flex-col gap-5">
      <Card padding="lg" className="text-center">
        <div className="w-18 h-18 rounded-full mx-auto mb-3 bg-amber-500/20 border border-amber-400/50 text-amber-400 flex items-center justify-center p-4">
          <Trophy size={38} />
        </div>
        <span className="text-xs font-extrabold tracking-widest uppercase text-indigo-300">
          MATCH COMPLETE
        </span>
        <h1
          className="font-display text-3xl sm:text-4xl font-extrabold my-2"
          data-testid="postgame-winner-headline"
        >
          {winners.length === 1
            ? `${winners[0]?.name} Wins the Room!`
            : `Tie at the Top: ${winners.map((w) => w.name).join(' & ')}!`}
        </h1>
        <p className="text-sm text-slate-400 mb-6">
          Final Score: <strong className="text-amber-300">{topScore} points</strong>{' '}
          across {state.matchHistory.length} rounds of persuasion & deduction
        </p>

        {isHost && (
          <Button
            variant="primary"
            size="lg"
            onClick={() => sendMessage({ type: 'RESET_TO_LOBBY' })}
            data-testid="return-lobby-btn"
          >
            <RotateCcw size={18} /> Return to Lobby & Play Again
          </Button>
        )}
      </Card>

      {/* Match Awards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bestJudgePlayer && (
          <Card className="flex items-start gap-3.5">
            <Gavel size={22} className="text-amber-400 shrink-0 mt-1" />
            <div>
              <span className="text-xs font-extrabold tracking-widest uppercase text-indigo-300">
                SHARPEST JUDGE
              </span>
              <h4 className="font-bold text-lg text-white my-0.5">
                {bestJudgePlayer.name}
              </h4>
              <p className="text-xs text-slate-400">
                Earned {judgeScoresByPlayer[bestJudgePlayer.id] ?? 0} points finding
                minority splits from the bench
              </p>
            </div>
          </Card>
        )}
        {bestRolePlayer && (
          <Card className="flex items-start gap-3.5">
            <Award size={22} className="text-amber-400 shrink-0 mt-1" />
            <div>
              <span className="text-xs font-extrabold tracking-widest uppercase text-indigo-300">
                MASTER SCHEMER
              </span>
              <h4 className="font-bold text-lg text-white my-0.5">
                {bestRolePlayer.name}
              </h4>
              <p className="text-xs text-slate-400">
                Earned +{bonusScoresByPlayer[bestRolePlayer.id] ?? 0} bonus points from
                secret role objectives
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Final Standings */}
      <Card>
        <h2 className="font-display text-lg font-bold flex items-center gap-2 mb-4">
          <Crown size={18} className="text-amber-400" /> Final Standings
        </h2>
        <div className="flex flex-col gap-2">
          {sortedPlayers.map((p, index) => (
            <div
              key={p.id}
              className={cn(
                'flex items-center justify-between px-4 py-3 rounded-xl border bg-slate-950/65',
                index === 0
                  ? 'border-amber-500/55 bg-amber-500/10'
                  : 'border-slate-800/80'
              )}
            >
              <div className="flex items-center gap-3">
                <span className="font-display font-extrabold text-slate-400 w-7">
                  #{index + 1}
                </span>
                <span
                  className="w-8 h-8 rounded-full inline-flex items-center justify-center font-extrabold text-sm text-white shrink-0"
                  style={{ backgroundColor: p.avatarColor }}
                >
                  {p.name.charAt(0).toUpperCase()}
                </span>
                <span className="font-bold text-sm">
                  {p.name}
                  {p.id === state.myPlayerId && (
                    <Badge variant="default" className="ml-2">
                      YOU
                    </Badge>
                  )}
                </span>
              </div>
              <div className="font-display font-extrabold text-lg text-amber-400">
                {p.score} pts
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Match Round History */}
      <Card>
        <h2 className="font-display text-lg font-bold mb-4">
          Round-by-Round Match Log
        </h2>
        <div className="flex flex-col gap-3">
          {state.matchHistory.map((round) => (
            <div
              key={round.roundNumber}
              className="p-4 rounded-xl bg-slate-950/65 border border-slate-800/80"
            >
              <div className="flex flex-wrap justify-between gap-2 mb-1.5">
                <span className="text-xs font-extrabold tracking-widest uppercase text-indigo-300">
                  ROUND {round.roundNumber} • JUDGE: {round.judgeName}
                </span>
                <span className="text-xs text-slate-400">
                  Option A ({round.countA}) vs Option B ({round.countB}) • Judge picked
                  Option {round.judgeChoice}
                </span>
              </div>
              <p className="font-bold text-sm mb-2">“{round.prompt.question}”</p>
              <div className="flex flex-wrap gap-3 text-xs">
                <Badge
                  variant={round.judgeChoice === 'A' ? 'optionA' : 'muted'}
                  size="md"
                >
                  A: {round.prompt.optionA} ({round.countA})
                </Badge>
                <Badge
                  variant={round.judgeChoice === 'B' ? 'optionB' : 'muted'}
                  size="md"
                >
                  B: {round.prompt.optionB} ({round.countB})
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

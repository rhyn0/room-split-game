import {
  ArrowRight,
  Eye,
  EyeOff,
  FileWarning,
  Gavel,
  ShieldAlert,
  Sparkles,
  Trophy,
} from 'lucide-react';
import type React from 'react';
import type { ClientRoomState, ClientToServerMessage } from '../../shared/types';
import { cn } from '../lib/utils';
import { Badge, Button, Card } from './ui';

interface RevealViewProps {
  state: ClientRoomState;
  sendMessage: (msg: ClientToServerMessage) => void;
}

export const RevealView: React.FC<RevealViewProps> = ({ state, sendMessage }) => {
  const summary = state.currentRoundSummary;
  if (!summary) return null;

  const me = state.players.find((p) => p.id === state.myPlayerId);
  const isHost = Boolean(me?.isHost);
  const isJudge = state.myPlayerId === state.judgeId;
  const canAdvance = isJudge || isHost;

  const myBreakdown = summary.breakdowns.find((b) => b.playerId === state.myPlayerId);
  const judgeBreakdown = summary.breakdowns.find((b) => b.isJudge);

  const pctA =
    summary.totalVoters > 0
      ? Math.round((summary.countA / summary.totalVoters) * 100)
      : 50;
  const pctB = 100 - pctA;

  const forgedCards = state.statements.filter((s) => s.isForged);

  return (
    <div className="flex flex-col gap-5">
      {/* Dramatic Split Verdict Card */}
      <Card padding="lg" className="text-center">
        <span className="text-xs font-extrabold tracking-widest uppercase text-indigo-300">
          ROUND {summary.roundNumber} VERDICT
        </span>
        <h2
          className="font-display text-3xl sm:text-4xl font-extrabold my-2"
          data-testid="reveal-verdict-headline"
        >
          Judge <strong>{summary.judgeName}</strong> Chose{' '}
          <span
            className={summary.judgeChoice === 'A' ? 'text-sky-400' : 'text-rose-400'}
          >
            Option {summary.judgeChoice}
          </span>
          !
        </h2>
        <div className="mt-2">
          <Badge variant="judge" size="md" className="px-4 py-1.5 text-sm">
            <Gavel size={15} />{' '}
            <strong>
              {summary.judgeName} earned +{judgeBreakdown?.totalRoundPoints ?? 0} pts
            </strong>{' '}
            — {judgeBreakdown?.bonusReason}
          </Badge>
        </div>

        {/* Visual Room Split Bar */}
        <div className="my-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 text-left">
            <Card
              variant={summary.judgeChoice === 'A' ? 'optionA' : 'default'}
              padding="sm"
            >
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-sky-400">
                OPTION A {summary.judgeChoice === 'A' && '• JUDGE CHOSE THIS'}
              </div>
              <div className="font-bold text-base mt-0.5">{summary.prompt.optionA}</div>
              <div
                className="text-xs font-semibold text-slate-300 mt-1"
                data-testid="count-a-badge"
              >
                {summary.countA} voter{summary.countA === 1 ? '' : 's'} ({pctA}
                %)
              </div>
            </Card>

            <Card
              variant={summary.judgeChoice === 'B' ? 'optionB' : 'default'}
              padding="sm"
            >
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-rose-400">
                OPTION B {summary.judgeChoice === 'B' && '• JUDGE CHOSE THIS'}
              </div>
              <div className="font-bold text-base mt-0.5">{summary.prompt.optionB}</div>
              <div
                className="text-xs font-semibold text-slate-300 mt-1"
                data-testid="count-b-badge"
              >
                {summary.countB} voter{summary.countB === 1 ? '' : 's'} ({pctB}
                %)
              </div>
            </Card>
          </div>

          <div className="h-4 rounded-full overflow-hidden flex bg-slate-950 border border-slate-800">
            <div
              className="bg-gradient-to-r from-sky-600 to-sky-400 transition-all duration-500"
              style={{ width: `${Math.max(pctA, 6)}%` }}
            />
            <div
              className="bg-gradient-to-r from-rose-400 to-rose-600 transition-all duration-500"
              style={{ width: `${Math.max(pctB, 6)}%` }}
            />
          </div>
        </div>

        {/* Player Choice Vote Reveal Toggle */}
        {state.settings.voteRevealMode === 'player_choice' &&
          myBreakdown &&
          !myBreakdown.isJudge && (
            <div className="mt-4 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/35 flex flex-wrap items-center justify-between gap-4 text-left">
              <div>
                <strong className="text-sm text-white">
                  Your Final Vote: Option {myBreakdown.finalChoice}
                </strong>
                {myBreakdown.wasNudgedBySaboteur && (
                  <span className="text-rose-300 font-bold text-xs ml-1.5">
                    (Nudged from Option {myBreakdown.initialChoice} by a Saboteur!)
                  </span>
                )}
                <p className="text-xs text-slate-400 mt-0.5">
                  In Player Choice mode, your vote stays hidden unless you choose to
                  show it.
                </p>
              </div>
              <Button
                variant={myBreakdown.voluntarilyRevealedVote ? 'secondary' : 'primary'}
                onClick={() => sendMessage({ type: 'TOGGLE_REVEAL_MY_VOTE' })}
                data-testid="toggle-reveal-vote-btn"
              >
                {myBreakdown.voluntarilyRevealedVote ? (
                  <>
                    <EyeOff size={16} /> Conceal My Vote
                  </>
                ) : (
                  <>
                    <Eye size={16} /> Reveal My Vote to Room
                  </>
                )}
              </Button>
            </div>
          )}
      </Card>

      {/* Forged Statements Unmasked */}
      {forgedCards.length > 0 && state.settings.voteRevealMode !== 'fog_of_war' && (
        <Card variant="danger">
          <h3 className="font-display text-lg font-bold flex items-center gap-2 mb-3">
            <FileWarning size={18} className="text-rose-400" /> Unmasked Forgeries on
            the Board!
          </h3>
          <div className="flex flex-col gap-2">
            {forgedCards.map((fc) => (
              <div
                key={fc.id}
                className="flex flex-wrap items-center gap-2.5 p-3 rounded-xl bg-rose-500/10 text-sm"
              >
                <Badge variant="danger">
                  PLANTED BY {fc.trueAuthorName.toUpperCase()}
                </Badge>
                <span className="text-slate-200">
                  Disguised as <strong>{fc.displayedAuthorName}</strong>: “{fc.text}”
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Round Breakdown & Leaderboard */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <h3 className="font-display text-lg font-bold flex items-center gap-2">
              <Sparkles size={18} className="text-indigo-400" /> Round{' '}
              {summary.roundNumber} Roles, Powers & Points
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {state.settings.voteRevealMode === 'fog_of_war'
                ? 'Fog of War Mode is active: other players’ roles, votes, and scores are concealed until the end of the match!'
                : 'Full breakdown of secret roles, active powers used, and points earned'}
            </p>
          </div>
          {canAdvance && (
            <Button
              variant="primary"
              size="lg"
              onClick={() => sendMessage({ type: 'NEXT_ROUND' })}
              data-testid="next-round-btn"
            >
              {state.currentRound < state.totalRounds ? (
                <>
                  Next Round ({state.currentRound + 1}/{state.totalRounds}){' '}
                  <ArrowRight size={18} />
                </>
              ) : (
                <>
                  <Trophy size={18} /> View Final Standings
                </>
              )}
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          {summary.breakdowns.map((b) => {
            const playerObj = state.players.find((p) => p.id === b.playerId);
            const isMaskedFog =
              state.settings.voteRevealMode === 'fog_of_war' &&
              !b.isJudge &&
              b.playerId !== state.myPlayerId;

            return (
              <div
                key={b.playerId}
                className={cn(
                  'grid grid-cols-1 md:grid-cols-[220px_1fr_auto] items-center gap-4 p-3.5 rounded-xl border bg-slate-950/65',
                  b.playerId === state.myPlayerId
                    ? 'border-indigo-500/60'
                    : 'border-slate-800/80'
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-8 h-8 rounded-full inline-flex items-center justify-center font-extrabold text-sm text-white shrink-0"
                    style={{
                      backgroundColor: playerObj?.avatarColor ?? '#6366f1',
                    }}
                  >
                    {b.playerName.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <div className="font-bold text-sm flex items-center gap-1.5">
                      {b.playerName}
                      {b.isJudge && <Badge variant="judge">JUDGE</Badge>}
                    </div>
                    <div className="text-xs text-indigo-300">
                      {b.isJudge
                        ? 'Asked the Question'
                        : isMaskedFog
                          ? 'Classified Role (Fog of War)'
                          : (b.roleName ?? 'Voter')}
                    </div>
                  </div>
                </div>

                <div>
                  {!b.isJudge && !isMaskedFog && (
                    <div className="flex flex-wrap items-center gap-2">
                      {b.finalChoice ? (
                        <Badge
                          variant={b.finalChoice === 'A' ? 'optionA' : 'optionB'}
                          size="md"
                        >
                          Voted Option {b.finalChoice}
                          {b.wasNudgedBySaboteur &&
                            ` (Nudged from ${b.initialChoice}!)`}
                          {b.switchedViaTurncoat && ' (Turncoat Flip)'}
                        </Badge>
                      ) : (
                        <Badge variant="muted" size="md">
                          Vote Concealed
                        </Badge>
                      )}

                      {b.powerLogSummary && (
                        <Badge variant="activePower" size="md">
                          <ShieldAlert size={12} /> {b.powerLogSummary}
                        </Badge>
                      )}
                    </div>
                  )}
                  {b.bonusReason && !isMaskedFog && (
                    <div className="text-xs text-slate-300 mt-1">{b.bonusReason}</div>
                  )}
                </div>

                <div className="md:text-right flex flex-col md:items-end">
                  {isMaskedFog ? (
                    <Badge variant="muted" size="md">
                      ? pts
                    </Badge>
                  ) : (
                    <>
                      <span className="font-display text-lg font-extrabold text-emerald-400">
                        +{b.totalRoundPoints} pts
                      </span>
                      <span className="text-xs text-slate-400">
                        Total: {playerObj?.score ?? 0} pts
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

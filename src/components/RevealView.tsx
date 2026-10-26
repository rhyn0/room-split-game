import React from 'react';
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
import { ClientRoomState, ClientToServerMessage } from '../../shared/types';

interface RevealViewProps {
  state: ClientRoomState;
  sendMessage: (msg: ClientToServerMessage) => void;
}

export const RevealView: React.FC<RevealViewProps> = ({
  state,
  sendMessage,
}) => {
  const summary = state.currentRoundSummary;
  if (!summary) return null;

  const me = state.players.find((p) => p.id === state.myPlayerId);
  const isHost = Boolean(me?.isHost);
  const isJudge = state.myPlayerId === state.judgeId;
  const canAdvance = isJudge || isHost;

  const myBreakdown = summary.breakdowns.find(
    (b) => b.playerId === state.myPlayerId
  );
  const judgeBreakdown = summary.breakdowns.find((b) => b.isJudge);

  const pctA =
    summary.totalVoters > 0
      ? Math.round((summary.countA / summary.totalVoters) * 100)
      : 50;
  const pctB = 100 - pctA;

  const forgedCards = state.statements.filter((s) => s.isForged);

  return (
    <div className="phase-container">
      {/* Dramatic Split Verdict Card */}
      <div className="card reveal-hero-card">
        <div className="reveal-verdict-banner">
          <span className="section-eyebrow">
            ROUND {summary.roundNumber} VERDICT
          </span>
          <h2 className="reveal-headline" data-testid="reveal-verdict-headline">
            Judge <strong>{summary.judgeName}</strong> Chose{' '}
            <span
              className={
                summary.judgeChoice === 'A' ? 'highlight-a' : 'highlight-b'
              }
            >
              Option {summary.judgeChoice}
            </span>
            !
          </h2>
          <p className="reveal-judge-score">
            <Gavel size={16} />{' '}
            <strong>
              {summary.judgeName} earned +{judgeBreakdown?.totalRoundPoints ?? 0}{' '}
              pts
            </strong>{' '}
            — {judgeBreakdown?.bonusReason}
          </p>
        </div>

        {/* Visual Room Split Bar */}
        <div className="split-meter-wrapper">
          <div className="split-meter-labels">
            <div
              className={`split-side-summary ${summary.judgeChoice === 'A' ? 'chosen-side-pill-a' : ''}`}
            >
              <span className="split-opt-tag">OPTION A</span>
              <strong>{summary.prompt.optionA}</strong>
              <span className="split-count-badge" data-testid="count-a-badge">
                {summary.countA} voter{summary.countA === 1 ? '' : 's'} ({pctA}
                %)
              </span>
            </div>

            <div
              className={`split-side-summary split-side-right ${summary.judgeChoice === 'B' ? 'chosen-side-pill-b' : ''}`}
            >
              <span className="split-opt-tag">OPTION B</span>
              <strong>{summary.prompt.optionB}</strong>
              <span className="split-count-badge" data-testid="count-b-badge">
                {summary.countB} voter{summary.countB === 1 ? '' : 's'} ({pctB}
                %)
              </span>
            </div>
          </div>

          <div className="split-bar-track">
            <div
              className="split-bar-fill-a"
              style={{ width: `${Math.max(pctA, 6)}%` }}
            />
            <div
              className="split-bar-fill-b"
              style={{ width: `${Math.max(pctB, 6)}%` }}
            />
          </div>
        </div>

        {/* Player Choice Vote Reveal Toggle */}
        {state.settings.voteRevealMode === 'player_choice' &&
          myBreakdown &&
          !myBreakdown.isJudge && (
            <div className="vote-reveal-optin-bar">
              <div>
                <strong>Your Final Vote: Option {myBreakdown.finalChoice}</strong>
                {myBreakdown.wasNudgedBySaboteur && (
                  <span className="saboteur-alert-inline">
                    {' '}
                    (Nudged from Option {myBreakdown.initialChoice} by a
                    Saboteur!)
                  </span>
                )}
                <p className="optin-sub">
                  In Player Choice mode, your vote stays hidden unless you
                  choose to show it.
                </p>
              </div>
              <button
                type="button"
                className={
                  myBreakdown.voluntarilyRevealedVote
                    ? 'btn-secondary'
                    : 'btn-primary'
                }
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
              </button>
            </div>
          )}
      </div>

      {/* Forged Statements Unmasked */}
      {forgedCards.length > 0 &&
        state.settings.voteRevealMode !== 'fog_of_war' && (
          <div className="card forgery-reveal-card">
            <h3 className="card-title">
              <FileWarning size={18} /> Unmasked Forgeries on the Board!
            </h3>
            <div className="forged-list">
              {forgedCards.map((fc) => (
                <div key={fc.id} className="forged-item">
                  <span className="forged-stamp">
                    PLANTED BY {fc.trueAuthorName.toUpperCase()}
                  </span>
                  <span>
                    Disguised as <strong>{fc.displayedAuthorName}</strong>: “
                    {fc.text}”
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Round Breakdown & Leaderboard */}
      <div className="card">
        <div className="card-header-row">
          <div>
            <h3 className="card-title">
              <Sparkles size={18} /> Round {summary.roundNumber} Roles, Powers &
              Points
            </h3>
            <p className="card-subtitle">
              {state.settings.voteRevealMode === 'fog_of_war'
                ? 'Fog of War Mode is active: other players’ roles, votes, and scores are concealed until the end of the match!'
                : 'Full breakdown of secret roles, active powers used, and points earned'}
            </p>
          </div>
          {canAdvance && (
            <button
              type="button"
              className="btn-primary btn-lg"
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
            </button>
          )}
        </div>

        <div className="breakdown-table">
          {summary.breakdowns.map((b) => {
            const playerObj = state.players.find((p) => p.id === b.playerId);
            const isMaskedFog =
              state.settings.voteRevealMode === 'fog_of_war' &&
              !b.isJudge &&
              b.playerId !== state.myPlayerId;

            return (
              <div
                key={b.playerId}
                className={`breakdown-row ${b.playerId === state.myPlayerId ? 'breakdown-row-me' : ''}`}
              >
                <div className="breakdown-player-col">
                  <span
                    className="avatar-dot"
                    style={{
                      backgroundColor: playerObj?.avatarColor ?? '#6366f1',
                    }}
                  >
                    {b.playerName.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <div className="breakdown-name">
                      {b.playerName}
                      {b.isJudge && (
                        <span className="judge-mini-tag">JUDGE</span>
                      )}
                    </div>
                    <div className="breakdown-role-sub">
                      {b.isJudge
                        ? 'Asked the Question'
                        : isMaskedFog
                          ? 'Classified Role (Fog of War)'
                          : (b.roleName ?? 'Voter')}
                    </div>
                  </div>
                </div>

                <div className="breakdown-details-col">
                  {!b.isJudge && !isMaskedFog && (
                    <div className="breakdown-tags">
                      {b.finalChoice ? (
                        <span
                          className={`vote-chip vote-chip-${b.finalChoice.toLowerCase()}`}
                        >
                          Voted Option {b.finalChoice}
                          {b.wasNudgedBySaboteur &&
                            ` (Nudged from ${b.initialChoice}!)`}
                          {b.switchedViaTurncoat && ' (Turncoat Flip)'}
                        </span>
                      ) : (
                        <span className="vote-chip vote-chip-hidden">
                          Vote Concealed
                        </span>
                      )}

                      {b.powerLogSummary && (
                        <span className="power-used-tag">
                          <ShieldAlert size={13} /> {b.powerLogSummary}
                        </span>
                      )}
                    </div>
                  )}
                  {b.bonusReason && !isMaskedFog && (
                    <div className="breakdown-reason">{b.bonusReason}</div>
                  )}
                </div>

                <div className="breakdown-score-col">
                  {isMaskedFog ? (
                    <span className="score-pill-masked">? pts</span>
                  ) : (
                    <>
                      <span className="round-pts-badge">
                        +{b.totalRoundPoints} pts
                      </span>
                      <span className="total-pts-sub">
                        Total: {playerObj?.score ?? 0} pts
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

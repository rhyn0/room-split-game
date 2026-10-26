import { Award, Crown, Gavel, RotateCcw, Trophy } from 'lucide-react';
import type React from 'react';
import type { ClientRoomState, ClientToServerMessage } from '../../shared/types';

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
    <div className="phase-container">
      <div className="card postgame-hero-card">
        <div className="trophy-circle">
          <Trophy size={40} />
        </div>
        <span className="section-eyebrow">MATCH COMPLETE</span>
        <h1 className="postgame-title" data-testid="postgame-winner-headline">
          {winners.length === 1
            ? `${winners[0]?.name} Wins the Room!`
            : `Tie at the Top: ${winners.map((w) => w.name).join(' & ')}!`}
        </h1>
        <p className="phase-subtext">
          Final Score: <strong>{topScore} points</strong> across{' '}
          {state.matchHistory.length} rounds of persuasion & deduction
        </p>

        {isHost && (
          <button
            type="button"
            className="btn-primary btn-lg"
            onClick={() => sendMessage({ type: 'RESET_TO_LOBBY' })}
            data-testid="return-lobby-btn"
          >
            <RotateCcw size={18} /> Return to Lobby & Play Again
          </button>
        )}
      </div>

      {/* Match Awards */}
      <div className="awards-grid">
        {bestJudgePlayer && (
          <div className="card award-card">
            <Gavel size={22} className="award-icon" />
            <div>
              <span className="section-eyebrow">SHARPEST JUDGE</span>
              <h4>{bestJudgePlayer.name}</h4>
              <p>
                Earned {judgeScoresByPlayer[bestJudgePlayer.id] ?? 0} points finding
                minority splits from the bench
              </p>
            </div>
          </div>
        )}
        {bestRolePlayer && (
          <div className="card award-card">
            <Award size={22} className="award-icon" />
            <div>
              <span className="section-eyebrow">MASTER SCHEMER</span>
              <h4>{bestRolePlayer.name}</h4>
              <p>
                Earned +{bonusScoresByPlayer[bestRolePlayer.id] ?? 0} bonus points from
                secret role objectives
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Final Standings */}
      <div className="card">
        <h2 className="card-title">
          <Crown size={18} /> Final Standings
        </h2>
        <div className="leaderboard-list">
          {sortedPlayers.map((p, index) => (
            <div
              key={p.id}
              className={`leaderboard-row ${index === 0 ? 'leaderboard-row-first' : ''}`}
            >
              <div className="leaderboard-left">
                <span className="rank-number">#{index + 1}</span>
                <span className="avatar-dot" style={{ backgroundColor: p.avatarColor }}>
                  {p.name.charAt(0).toUpperCase()}
                </span>
                <span className="leaderboard-name">
                  {p.name}
                  {p.id === state.myPlayerId && <span className="you-tag">YOU</span>}
                </span>
              </div>
              <div className="leaderboard-score">{p.score} pts</div>
            </div>
          ))}
        </div>
      </div>

      {/* Match Round History */}
      <div className="card">
        <h2 className="card-title">Round-by-Round Match Log</h2>
        <div className="history-list">
          {state.matchHistory.map((round) => (
            <div key={round.roundNumber} className="history-round-item">
              <div className="history-round-header">
                <span className="section-eyebrow">
                  ROUND {round.roundNumber} • JUDGE: {round.judgeName}
                </span>
                <span className="history-split-pill">
                  Option A ({round.countA}) vs Option B ({round.countB}) • Judge picked
                  Option {round.judgeChoice}
                </span>
              </div>
              <p className="history-question">“{round.prompt.question}”</p>
              <div className="history-options-row">
                <span
                  className={round.judgeChoice === 'A' ? 'opt-picked' : 'opt-unpicked'}
                >
                  A: {round.prompt.optionA} ({round.countA})
                </span>
                <span
                  className={round.judgeChoice === 'B' ? 'opt-picked' : 'opt-unpicked'}
                >
                  B: {round.prompt.optionB} ({round.countB})
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

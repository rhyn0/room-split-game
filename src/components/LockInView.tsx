import { CheckCircle2, Clock, Lock } from 'lucide-react';
import type React from 'react';
import type {
  ChoiceOption,
  ClientRoomState,
  ClientToServerMessage,
} from '../../shared/types';
import { RoleCardBanner } from './RoleCardBanner';

interface LockInViewProps {
  state: ClientRoomState;
  sendMessage: (msg: ClientToServerMessage) => void;
}

export const LockInView: React.FC<LockInViewProps> = ({ state, sendMessage }) => {
  const isJudge = state.myPlayerId === state.judgeId;
  const me = state.players.find((p) => p.id === state.myPlayerId);
  const isVoter = Boolean(me && !me.isSpectator && !isJudge);
  const voters = state.players.filter((p) => !p.isSpectator && p.id !== state.judgeId);
  const lockedCount = voters.filter((v) => v.hasLockedIn).length;
  const judgePlayer = state.players.find((p) => p.id === state.judgeId);

  const handleSelectOption = (choice: ChoiceOption) => {
    if (!isVoter) return;
    sendMessage({ type: 'LOCK_IN_CHOICE', choice });
  };

  return (
    <div className="phase-container">
      {!isJudge && state.myRole && (
        <RoleCardBanner
          assignment={state.myRole}
          myLockedChoice={state.myLockedChoice}
        />
      )}

      <div className="card question-showcase-card">
        <div className="question-meta">
          <span className="section-eyebrow">
            JUDGE {judgePlayer?.name.toUpperCase()} ASKS:
          </span>
        </div>
        <h2 className="question-text" data-testid="active-question-text">
          “{state.prompt?.question}”
        </h2>

        <div className="choice-cards-grid">
          <button
            type="button"
            disabled={!isVoter}
            onClick={() => handleSelectOption('A')}
            className={`choice-card choice-card-a ${state.myLockedChoice === 'A' ? 'choice-card-selected' : ''}`}
            data-testid="lock-option-a-btn"
          >
            <div className="choice-card-badge">OPTION A</div>
            <div className="choice-card-label">{state.prompt?.optionA}</div>
            {isVoter && (
              <div className="choice-card-footer">
                {state.myLockedChoice === 'A' ? (
                  <span className="locked-confirm">
                    <Lock size={15} /> Secretly Locked In
                  </span>
                ) : (
                  <span>Click to Lock In Option A</span>
                )}
              </div>
            )}
          </button>

          <button
            type="button"
            disabled={!isVoter}
            onClick={() => handleSelectOption('B')}
            className={`choice-card choice-card-b ${state.myLockedChoice === 'B' ? 'choice-card-selected' : ''}`}
            data-testid="lock-option-b-btn"
          >
            <div className="choice-card-badge">OPTION B</div>
            <div className="choice-card-label">{state.prompt?.optionB}</div>
            {isVoter && (
              <div className="choice-card-footer">
                {state.myLockedChoice === 'B' ? (
                  <span className="locked-confirm">
                    <Lock size={15} /> Secretly Locked In
                  </span>
                ) : (
                  <span>Click to Lock In Option B</span>
                )}
              </div>
            )}
          </button>
        </div>
      </div>

      <div className="card lockin-status-card">
        <div className="card-header-row">
          <h3 className="card-title">
            <Lock size={17} /> Secret Lock-In Progress ({lockedCount}/{voters.length})
          </h3>
          <span className="card-subtitle">
            {isJudge
              ? 'You are the Judge — wait for all voters to secretly lock in their choice!'
              : 'All votes are strictly hidden until Persuasion begins'}
          </span>
        </div>
        <div className="voter-lock-pills">
          {voters.map((v) => (
            <div
              key={v.id}
              className={`voter-status-pill ${v.hasLockedIn ? 'voter-status-ready' : 'voter-status-waiting'}`}
            >
              {v.hasLockedIn ? <CheckCircle2 size={15} /> : <Clock size={15} />}
              <span>{v.name}</span>
              <span className="status-tag">
                {v.hasLockedIn ? 'Locked' : 'Choosing...'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

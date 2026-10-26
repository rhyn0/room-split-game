import { Gavel, Scale, Send } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import type { ClientRoomState, ClientToServerMessage } from '../../shared/types';
import { RoleCardBanner } from './RoleCardBanner';

interface JudgePromptViewProps {
  state: ClientRoomState;
  sendMessage: (msg: ClientToServerMessage) => void;
}

export const JudgePromptView: React.FC<JudgePromptViewProps> = ({
  state,
  sendMessage,
}) => {
  const [question, setQuestion] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');

  const isJudge = state.myPlayerId === state.judgeId;
  const judgePlayer = state.players.find((p) => p.id === state.judgeId);
  const voterCount = state.players.filter(
    (p) => !p.isSpectator && p.id !== state.judgeId
  ).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !optionA.trim() || !optionB.trim()) return;
    sendMessage({
      type: 'SUBMIT_QUESTION',
      prompt: {
        question: question.trim(),
        optionA: optionA.trim(),
        optionB: optionB.trim(),
      },
    });
  };

  return (
    <div className="phase-container">
      {!isJudge && state.myRole && (
        <RoleCardBanner
          assignment={state.myRole}
          myLockedChoice={state.myLockedChoice}
        />
      )}

      {isJudge ? (
        <div className="card judge-composer-card">
          <div className="judge-composer-header">
            <span className="judge-crown-badge">
              <Gavel size={16} /> YOU ARE THE JUDGE THIS ROUND
            </span>
            <h2 className="phase-headline">
              Write a 2-Choice Question to Split the Room
            </h2>
            <p className="phase-subtext">
              There are <strong>{voterCount} voters</strong> this round. You will score{' '}
              <strong>(N − k) points</strong> for picking a side with <strong>k</strong>{' '}
              players (max <strong>{Math.max(1, voterCount - 1)} pts</strong> if exactly
              1 player picks it!). Beware: picking an{' '}
              <strong>empty side (k = 0)</strong> or a{' '}
              <strong>unanimous side (k = {voterCount})</strong> scores{' '}
              <strong>0 points</strong>!
            </p>
          </div>

          <form onSubmit={handleSubmit} className="judge-form">
            <div className="form-field">
              <label htmlFor="judge-question-input" className="field-label">
                Your Dilemma / Question
              </label>
              <textarea
                id="judge-question-input"
                className="text-input textarea-lg"
                rows={3}
                maxLength={240}
                placeholder="Type a dilemma, hot take, or 'would you rather' question that will divide your friends..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                required
                data-testid="judge-question-input"
              />
            </div>

            <div className="options-split-inputs">
              <div className="form-field option-field-a">
                <label htmlFor="judge-opt-a" className="field-label label-a">
                  Option A
                </label>
                <input
                  id="judge-opt-a"
                  type="text"
                  className="text-input input-option-a"
                  maxLength={120}
                  placeholder="First choice..."
                  value={optionA}
                  onChange={(e) => setOptionA(e.target.value)}
                  required
                  data-testid="judge-option-a-input"
                />
              </div>

              <div className="form-field option-field-b">
                <label htmlFor="judge-opt-b" className="field-label label-b">
                  Option B
                </label>
                <input
                  id="judge-opt-b"
                  type="text"
                  className="text-input input-option-b"
                  maxLength={120}
                  placeholder="Second choice..."
                  value={optionB}
                  onChange={(e) => setOptionB(e.target.value)}
                  required
                  data-testid="judge-option-b-input"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary btn-lg btn-full"
              disabled={!question.trim() || !optionA.trim() || !optionB.trim()}
              data-testid="submit-question-btn"
            >
              <Send size={18} /> Pose Question to the Room
            </button>
          </form>
        </div>
      ) : (
        <div className="card waiting-judge-card">
          <div className="pulse-icon-ring">
            <Scale size={32} />
          </div>
          <span className="section-eyebrow">PHASE 1 — THE DILEMMA</span>
          <h2 className="phase-headline">
            Judge <strong>{judgePlayer?.name ?? 'Player'}</strong> is crafting a
            2-choice question...
          </h2>
          <p className="phase-subtext">
            Study your secret Role Card above and plan how you will bluff or persuade{' '}
            <strong>{judgePlayer?.name}</strong> once the question drops!
          </p>
        </div>
      )}
    </div>
  );
};

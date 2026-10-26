import { Gavel, Scale, Send } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import type { ClientRoomState, ClientToServerMessage } from '../../shared/types';
import { RoleCardBanner } from './RoleCardBanner';
import { Badge, Button, Card, Input, Textarea } from './ui';

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
    <div className="flex flex-col gap-5">
      {!isJudge && state.myRole && (
        <RoleCardBanner
          assignment={state.myRole}
          myLockedChoice={state.myLockedChoice}
        />
      )}

      {isJudge ? (
        <Card padding="lg">
          <div className="text-center max-w-2xl mx-auto mb-6">
            <Badge variant="judge" size="md" className="mb-3">
              <Gavel size={15} /> YOU ARE THE JUDGE THIS ROUND
            </Badge>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold mb-2">
              Write a 2-Choice Question to Split the Room
            </h2>
            <p className="text-sm text-slate-400">
              There are <strong className="text-slate-200">{voterCount} voters</strong>{' '}
              this round. You will score{' '}
              <strong className="text-slate-200">(N − k) points</strong> for picking a
              side with <strong className="text-slate-200">k</strong> players (max{' '}
              <strong className="text-amber-300">
                {Math.max(1, voterCount - 1)} pts
              </strong>{' '}
              if exactly 1 player picks it!). Beware: picking an{' '}
              <strong className="text-rose-300">empty side (k = 0)</strong> or a{' '}
              <strong className="text-rose-300">
                unanimous side (k = {voterCount})
              </strong>{' '}
              scores <strong className="text-rose-300">0 points</strong>!
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="judge-question-input"
                className="text-xs font-bold uppercase tracking-wider text-slate-300"
              >
                Your Dilemma / Question
              </label>
              <Textarea
                id="judge-question-input"
                rows={3}
                maxLength={240}
                placeholder="Type a dilemma, hot take, or 'would you rather' question that will divide your friends..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                required
                data-testid="judge-question-input"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="judge-opt-a"
                  className="text-xs font-extrabold uppercase tracking-wider text-sky-400"
                >
                  Option A
                </label>
                <Input
                  id="judge-opt-a"
                  variant="optionA"
                  maxLength={120}
                  placeholder="First choice..."
                  value={optionA}
                  onChange={(e) => setOptionA(e.target.value)}
                  required
                  data-testid="judge-option-a-input"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="judge-opt-b"
                  className="text-xs font-extrabold uppercase tracking-wider text-rose-400"
                >
                  Option B
                </label>
                <Input
                  id="judge-opt-b"
                  variant="optionB"
                  maxLength={120}
                  placeholder="Second choice..."
                  value={optionB}
                  onChange={(e) => setOptionB(e.target.value)}
                  required
                  data-testid="judge-option-b-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={!question.trim() || !optionA.trim() || !optionB.trim()}
              data-testid="submit-question-btn"
            >
              <Send size={18} /> Pose Question to the Room
            </Button>
          </form>
        </Card>
      ) : (
        <Card padding="lg" className="text-center py-12">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 bg-indigo-500/15 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Scale size={32} />
          </div>
          <span className="text-xs font-extrabold tracking-widest uppercase text-indigo-300">
            PHASE 1 — THE DILEMMA
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold mt-2 mb-3">
            Judge{' '}
            <strong className="text-amber-300">{judgePlayer?.name ?? 'Player'}</strong>{' '}
            is crafting a 2-choice question...
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Study your secret Role Card above and plan how you will bluff or persuade{' '}
            <strong className="text-slate-200">{judgePlayer?.name}</strong> once the
            question drops!
          </p>
        </Card>
      )}
    </div>
  );
};

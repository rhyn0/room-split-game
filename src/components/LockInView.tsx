import { CheckCircle2, Clock, Lock } from 'lucide-react';
import type React from 'react';
import type {
  ChoiceOption,
  ClientRoomState,
  ClientToServerMessage,
} from '../../shared/types';
import { cn } from '../lib/utils';
import { RoleCardBanner } from './RoleCardBanner';
import { Badge, Card, ChoiceSideLabel, choiceCardVariants } from './ui';

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
    <div className="flex flex-col gap-5">
      {!isJudge && state.myRole && (
        <RoleCardBanner
          assignment={state.myRole}
          myLockedChoice={state.myLockedChoice}
        />
      )}

      <Card padding="lg" className="text-center">
        <span className="text-xs font-extrabold tracking-widest uppercase text-indigo-300">
          JUDGE {judgePlayer?.name.toUpperCase()} ASKS:
        </span>
        <h2
          className="font-display text-2xl sm:text-3xl font-extrabold mt-2 mb-6"
          data-testid="active-question-text"
        >
          “{state.prompt?.question}”
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            disabled={!isVoter}
            onClick={() => handleSelectOption('A')}
            className={cn(
              choiceCardVariants({
                side: 'A',
                selected: state.myLockedChoice === 'A',
                interactive: isVoter,
              })
            )}
            data-testid="lock-option-a-btn"
          >
            <ChoiceSideLabel side="A" />
            <div className="text-xl font-bold">{state.prompt?.optionA}</div>
            {isVoter && (
              <div className="text-xs text-slate-400">
                {state.myLockedChoice === 'A' ? (
                  <span className="inline-flex items-center gap-1.5 font-bold text-emerald-400">
                    <Lock size={14} /> Secretly Locked In
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
            className={cn(
              choiceCardVariants({
                side: 'B',
                selected: state.myLockedChoice === 'B',
                interactive: isVoter,
              })
            )}
            data-testid="lock-option-b-btn"
          >
            <ChoiceSideLabel side="B" />
            <div className="text-xl font-bold">{state.prompt?.optionB}</div>
            {isVoter && (
              <div className="text-xs text-slate-400">
                {state.myLockedChoice === 'B' ? (
                  <span className="inline-flex items-center gap-1.5 font-bold text-emerald-400">
                    <Lock size={14} /> Secretly Locked In
                  </span>
                ) : (
                  <span>Click to Lock In Option B</span>
                )}
              </div>
            )}
          </button>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className="font-display text-lg font-bold flex items-center gap-2">
            <Lock size={17} className="text-indigo-400" /> Secret Lock-In Progress (
            {lockedCount}/{voters.length})
          </h3>
          <span className="text-xs text-slate-400">
            {isJudge
              ? 'You are the Judge — wait for all voters to secretly lock in their choice!'
              : 'All votes are strictly hidden until Persuasion begins'}
          </span>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {voters.map((v) => (
            <Badge
              key={v.id}
              variant={v.hasLockedIn ? 'success' : 'muted'}
              size="md"
              className="py-1.5 px-3.5"
            >
              {v.hasLockedIn ? <CheckCircle2 size={14} /> : <Clock size={14} />}
              <span>{v.name}</span>
              <span className="opacity-75 font-normal">
                • {v.hasLockedIn ? 'Locked' : 'Choosing...'}
              </span>
            </Badge>
          ))}
        </div>
      </Card>
    </div>
  );
};

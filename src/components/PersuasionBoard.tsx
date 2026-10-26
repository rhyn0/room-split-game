import {
  CheckCircle2,
  Eye,
  FileWarning,
  Gavel,
  MessageSquarePlus,
  RefreshCw,
  Send,
  Shuffle,
  Zap,
} from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { getRoleDefinition } from '../../shared/roles';
import type {
  ChoiceOption,
  ClientRoomState,
  ClientToServerMessage,
} from '../../shared/types';
import { cn } from '../lib/utils';
import { RoleCardBanner } from './RoleCardBanner';
import {
  Badge,
  Button,
  Card,
  ChoiceSideLabel,
  choiceCardVariants,
  Input,
  Select,
  Textarea,
} from './ui';

interface PersuasionBoardProps {
  state: ClientRoomState;
  sendMessage: (msg: ClientToServerMessage) => void;
}

export const PersuasionBoard: React.FC<PersuasionBoardProps> = ({
  state,
  sendMessage,
}) => {
  const [stmtText, setStmtText] = useState('');
  const [claimedSide, setClaimedSide] = useState<ChoiceOption | 'NEUTRAL'>('A');

  // Active Power states
  const [targetPlayerId, setTargetPlayerId] = useState('');
  const [forgedText, setForgedText] = useState('');
  const [forgedAsId, setForgedAsId] = useState<string>('anonymous');
  const [forgedSide, setForgedSide] = useState<ChoiceOption | 'NEUTRAL'>('A');

  const isJudge = state.myPlayerId === state.judgeId;
  const me = state.players.find((p) => p.id === state.myPlayerId);
  const isVoter = Boolean(me && !me.isSpectator && !isJudge);
  const isPersuasionOpen = state.phase === 'PHASE3_PERSUASION';
  const judgePlayer = state.players.find((p) => p.id === state.judgeId);
  const otherVoters = state.players.filter(
    (p) => !p.isSpectator && p.id !== state.judgeId && p.id !== state.myPlayerId
  );

  const myRoleDef = state.myRole ? getRoleDefinition(state.myRole.roleId) : null;

  const mySignedStatementsCount = state.statements.filter(
    (s) => s.displayedAuthorId === state.myPlayerId && !s.isAnonymous
  ).length;

  const handlePostStatement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stmtText.trim()) return;
    sendMessage({
      type: 'POST_STATEMENT',
      text: stmtText.trim(),
      claimedSide,
    });
    setStmtText('');
  };

  const handleTriggerPower = () => {
    if (!state.myRole || !myRoleDef?.activePower) return;
    const pType = myRoleDef.activePower.type;

    if (pType === 'PEEK') {
      const tid = targetPlayerId || otherVoters[0]?.id;
      if (!tid) return;
      sendMessage({
        type: 'USE_ACTIVE_POWER',
        powerType: 'PEEK',
        targetPlayerId: tid,
      });
    } else if (pType === 'NUDGE') {
      const tid = targetPlayerId || otherVoters[0]?.id;
      if (!tid) return;
      sendMessage({
        type: 'USE_ACTIVE_POWER',
        powerType: 'NUDGE',
        targetPlayerId: tid,
      });
    } else if (pType === 'LATE_FLIP') {
      sendMessage({
        type: 'USE_ACTIVE_POWER',
        powerType: 'LATE_FLIP',
      });
    } else if (pType === 'PLANT_EVIDENCE') {
      if (!forgedText.trim()) return;
      sendMessage({
        type: 'USE_ACTIVE_POWER',
        powerType: 'PLANT_EVIDENCE',
        forgedText: forgedText.trim(),
        forgedAsPlayerId: forgedAsId,
        forgedClaimedSide: forgedSide,
      });
      setForgedText('');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {!isJudge && state.myRole && (
        <RoleCardBanner
          assignment={state.myRole}
          myLockedChoice={state.myLockedChoice}
        />
      )}

      {/* Dilemma & Judge Verdict Header */}
      <Card padding="lg" className="text-center">
        <span className="text-xs font-extrabold tracking-widest uppercase text-indigo-300">
          {state.phase === 'PHASE3_PERSUASION'
            ? 'PHASE 3 — PERSUASION & DECEPTION'
            : 'PHASE 4 — FINAL VERDICT'}
        </span>
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold mt-2 mb-6">
          “{state.prompt?.question}”
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={choiceCardVariants({ side: 'A' })}>
            <ChoiceSideLabel side="A" />
            <div className="text-xl font-bold">{state.prompt?.optionA}</div>
            {isJudge && (
              <Button
                variant="optionA"
                fullWidth
                className="mt-2"
                onClick={() =>
                  sendMessage({ type: 'SUBMIT_JUDGE_VERDICT', choice: 'A' })
                }
                data-testid="judge-pick-a-btn"
              >
                <Gavel size={16} /> Judge Verdict: Pick Option A
              </Button>
            )}
          </div>

          <div className={choiceCardVariants({ side: 'B' })}>
            <ChoiceSideLabel side="B" />
            <div className="text-xl font-bold">{state.prompt?.optionB}</div>
            {isJudge && (
              <Button
                variant="optionB"
                fullWidth
                className="mt-2"
                onClick={() =>
                  sendMessage({ type: 'SUBMIT_JUDGE_VERDICT', choice: 'B' })
                }
                data-testid="judge-pick-b-btn"
              >
                <Gavel size={16} /> Judge Verdict: Pick Option B
              </Button>
            )}
          </div>
        </div>

        {isJudge && isPersuasionOpen && (
          <div className="mt-5 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 text-left">
            <span>
              Listen to players in Discord & read the statement cards below. You can
              lock the board first or pick Option A / B whenever you’re ready!
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => sendMessage({ type: 'ADVANCE_TO_VERDICT' })}
            >
              Lock Persuasion Board
            </Button>
          </div>
        )}
      </Card>

      <div
        className={cn(
          'grid grid-cols-1 gap-5 items-start',
          isVoter && myRoleDef?.activePower && 'lg:grid-cols-12'
        )}
      >
        {/* Left / Main Column: Live Persuasion Board */}
        <div
          className={cn(
            isVoter && myRoleDef?.activePower ? 'lg:col-span-7' : 'lg:col-span-12'
          )}
        >
          <Card>
            <div className="mb-4">
              <h3 className="font-display text-lg font-bold">
                Live Persuasion & Evidence Board ({state.statements.length})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Statements are signed by default — unless a Forger is in the room!
              </p>
            </div>

            {state.statements.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-800 text-slate-400 text-sm mb-4">
                No pitch cards posted yet. Write an argument or bluff to sway Judge{' '}
                <strong className="text-slate-200">{judgePlayer?.name}</strong>!
              </div>
            ) : (
              <div className="flex flex-col gap-3 mb-5" data-testid="statements-feed">
                {state.statements.map((stmt) => (
                  <div
                    key={stmt.id}
                    className={cn(
                      'p-4 rounded-xl bg-slate-950/80 border-l-4',
                      stmt.claimedSide === 'A'
                        ? 'border-l-sky-400'
                        : stmt.claimedSide === 'B'
                          ? 'border-l-rose-400'
                          : 'border-l-slate-500'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 text-sm">
                        <span
                          className="w-6 h-6 rounded-full inline-flex items-center justify-center font-extrabold text-xs text-white shrink-0"
                          style={{ backgroundColor: stmt.displayedAvatarColor }}
                        >
                          {stmt.isAnonymous
                            ? '?'
                            : stmt.displayedAuthorName.charAt(0).toUpperCase()}
                        </span>
                        <strong>{stmt.displayedAuthorName}</strong>
                      </div>
                      <Badge
                        variant={
                          stmt.claimedSide === 'A'
                            ? 'optionA'
                            : stmt.claimedSide === 'B'
                              ? 'optionB'
                              : 'muted'
                        }
                      >
                        {stmt.claimedSide === 'NEUTRAL'
                          ? 'Room Intel'
                          : `Pitching Option ${stmt.claimedSide}`}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-100">“{stmt.text}”</p>
                  </div>
                ))}
              </div>
            )}

            {isVoter && isPersuasionOpen && (
              <form
                onSubmit={handlePostStatement}
                className="pt-4 border-t border-slate-800 flex flex-col gap-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-200">
                    <MessageSquarePlus size={15} className="text-indigo-400" /> Post
                    Signed Statement Card ({3 - mySignedStatementsCount} left)
                  </span>
                  <div className="flex gap-1.5">
                    {(['A', 'B', 'NEUTRAL'] as const).map((side) => (
                      <Button
                        key={side}
                        variant={
                          claimedSide === side
                            ? side === 'A'
                              ? 'optionA'
                              : side === 'B'
                                ? 'optionB'
                                : 'primary'
                            : 'secondary'
                        }
                        size="xs"
                        onClick={() => setClaimedSide(side)}
                      >
                        {side === 'NEUTRAL' ? 'Neutral' : `Pitch Option ${side}`}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2.5">
                  <Input
                    maxLength={220}
                    placeholder="Convince the Judge why your option has a tiny non-zero split (or bluff!)..."
                    value={stmtText}
                    onChange={(e) => setStmtText(e.target.value)}
                    disabled={mySignedStatementsCount >= 3}
                    data-testid="statement-input"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!stmtText.trim() || mySignedStatementsCount >= 3}
                    data-testid="post-statement-btn"
                  >
                    <Send size={16} /> Post
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>

        {/* Right Column: Active Role Power Console (if Voter has Active Power) */}
        {isVoter && myRoleDef?.activePower && state.myRole && (
          <div className="lg:col-span-5">
            <Card variant="activeRole">
              <div className="mb-4">
                <Badge variant="activePower" className="mb-2">
                  <Zap size={12} /> {myRoleDef.name} Power
                </Badge>
                <h3 className="font-display text-lg font-bold">
                  {myRoleDef.activePower.name}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  {myRoleDef.activePower.description}
                </p>
              </div>

              {state.myRole.hasUsedPower ? (
                <div
                  className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-400/40 flex items-start gap-3 text-sm"
                  data-testid="power-used-confirmation"
                >
                  <CheckCircle2
                    size={20}
                    className="text-emerald-400 shrink-0 mt-0.5"
                  />
                  <div>
                    <strong className="text-emerald-300">Power Executed!</strong>
                    <p className="text-slate-200 text-xs mt-0.5">
                      {state.myRole.powerLogSummary}
                    </p>
                    {state.myRole.peekedChoice && (
                      <p className="mt-1.5 text-sky-300 text-xs font-semibold">
                        {state.myRole.powerTargetName} locked in{' '}
                        <strong>Option {state.myRole.peekedChoice}</strong>!
                      </p>
                    )}
                  </div>
                </div>
              ) : !isPersuasionOpen ? (
                <div className="p-4 rounded-xl bg-slate-950/60 text-xs text-slate-400">
                  Persuasion phase has ended.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {(myRoleDef.activePower.type === 'PEEK' ||
                    myRoleDef.activePower.type === 'NUDGE') && (
                    <>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Select Target Voter
                      </label>
                      <Select
                        value={targetPlayerId || otherVoters[0]?.id || ''}
                        onChange={(e) => setTargetPlayerId(e.target.value)}
                        data-testid="power-target-select"
                      >
                        {otherVoters.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </Select>
                      <Button
                        variant="amber"
                        fullWidth
                        onClick={handleTriggerPower}
                        data-testid="trigger-power-btn"
                      >
                        {myRoleDef.activePower.type === 'PEEK' ? (
                          <>
                            <Eye size={16} /> Wiretap Selected Player
                          </>
                        ) : (
                          <>
                            <Shuffle size={16} /> Secretly Flip Their Vote
                          </>
                        )}
                      </Button>
                    </>
                  )}

                  {myRoleDef.activePower.type === 'LATE_FLIP' && (
                    <>
                      <p className="text-xs text-slate-300">
                        You currently have{' '}
                        <strong className="text-white">
                          Option {state.myLockedChoice}
                        </strong>{' '}
                        locked in. Flipping will secretly change your vote to{' '}
                        <strong className="text-amber-300">
                          Option {state.myLockedChoice === 'A' ? 'B' : 'A'}
                        </strong>
                        .
                      </p>
                      <Button
                        variant="amber"
                        fullWidth
                        onClick={handleTriggerPower}
                        data-testid="trigger-power-btn"
                      >
                        <RefreshCw size={16} /> Flip My Vote to Option{' '}
                        {state.myLockedChoice === 'A' ? 'B' : 'A'}
                      </Button>
                    </>
                  )}

                  {myRoleDef.activePower.type === 'PLANT_EVIDENCE' && (
                    <>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Attribute Forged Card To:
                      </label>
                      <Select
                        value={forgedAsId}
                        onChange={(e) => setForgedAsId(e.target.value)}
                        data-testid="forger-attribution-select"
                      >
                        <option value="anonymous">
                          Anonymous Rumor (Unattributed)
                        </option>
                        {otherVoters.map((v) => (
                          <option key={v.id} value={v.id}>
                            Impersonate {v.name}
                          </option>
                        ))}
                      </Select>

                      <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Claimed Side:
                      </label>
                      <div className="flex gap-1.5">
                        {(['A', 'B', 'NEUTRAL'] as const).map((side) => (
                          <Button
                            key={side}
                            variant={
                              forgedSide === side
                                ? side === 'A'
                                  ? 'optionA'
                                  : side === 'B'
                                    ? 'optionB'
                                    : 'primary'
                                : 'secondary'
                            }
                            size="xs"
                            onClick={() => setForgedSide(side)}
                          >
                            {side === 'NEUTRAL' ? 'Neutral' : `Option ${side}`}
                          </Button>
                        ))}
                      </div>

                      <Textarea
                        rows={2}
                        maxLength={220}
                        placeholder="Write the forged statement or fake confession..."
                        value={forgedText}
                        onChange={(e) => setForgedText(e.target.value)}
                        data-testid="forger-text-input"
                      />

                      <Button
                        variant="amber"
                        fullWidth
                        disabled={!forgedText.trim()}
                        onClick={handleTriggerPower}
                        data-testid="trigger-power-btn"
                      >
                        <FileWarning size={16} /> Plant Forged Card on Board
                      </Button>
                    </>
                  )}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

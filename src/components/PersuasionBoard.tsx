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
import { RoleCardBanner } from './RoleCardBanner';

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
    <div className="phase-container">
      {!isJudge && state.myRole && (
        <RoleCardBanner
          assignment={state.myRole}
          myLockedChoice={state.myLockedChoice}
        />
      )}

      {/* Dilemma & Judge Verdict Header */}
      <div className="card question-showcase-card">
        <div className="question-meta">
          <span className="section-eyebrow">
            {state.phase === 'PHASE3_PERSUASION'
              ? 'PHASE 3 — PERSUASION & DECEPTION'
              : 'PHASE 4 — FINAL VERDICT'}
          </span>
        </div>
        <h2 className="question-text">“{state.prompt?.question}”</h2>

        <div className="choice-cards-grid">
          <div className="choice-card choice-card-a choice-card-static">
            <div className="choice-card-badge">OPTION A</div>
            <div className="choice-card-label">{state.prompt?.optionA}</div>
            {isJudge && (
              <button
                type="button"
                className="btn-verdict btn-verdict-a"
                onClick={() =>
                  sendMessage({ type: 'SUBMIT_JUDGE_VERDICT', choice: 'A' })
                }
                data-testid="judge-pick-a-btn"
              >
                <Gavel size={16} /> Judge Verdict: Pick Option A
              </button>
            )}
          </div>

          <div className="choice-card choice-card-b choice-card-static">
            <div className="choice-card-badge">OPTION B</div>
            <div className="choice-card-label">{state.prompt?.optionB}</div>
            {isJudge && (
              <button
                type="button"
                className="btn-verdict btn-verdict-b"
                onClick={() =>
                  sendMessage({ type: 'SUBMIT_JUDGE_VERDICT', choice: 'B' })
                }
                data-testid="judge-pick-b-btn"
              >
                <Gavel size={16} /> Judge Verdict: Pick Option B
              </button>
            )}
          </div>
        </div>

        {isJudge && isPersuasionOpen && (
          <div className="judge-lock-board-bar">
            <span>
              Listen to players in Discord & read the statement cards below. You can
              lock the board first or pick Option A / B whenever you’re ready!
            </span>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => sendMessage({ type: 'ADVANCE_TO_VERDICT' })}
            >
              Lock Persuasion Board
            </button>
          </div>
        )}
      </div>

      <div className="persuasion-layout">
        {/* Left / Main Column: Live Persuasion Board */}
        <div className="persuasion-main-col">
          <div className="card">
            <div className="card-header-row">
              <div>
                <h3 className="card-title">
                  Live Persuasion & Evidence Board ({state.statements.length})
                </h3>
                <p className="card-subtitle">
                  Statements are signed by default — unless a Forger is in the room!
                </p>
              </div>
            </div>

            {state.statements.length === 0 ? (
              <div className="empty-board-placeholder">
                No pitch cards posted yet. Write an argument or bluff to sway Judge{' '}
                <strong>{judgePlayer?.name}</strong>!
              </div>
            ) : (
              <div className="statements-feed" data-testid="statements-feed">
                {state.statements.map((stmt) => (
                  <div
                    key={stmt.id}
                    className={`statement-card statement-side-${stmt.claimedSide.toLowerCase()}`}
                  >
                    <div className="statement-header">
                      <div className="statement-author">
                        <span
                          className="avatar-dot avatar-sm"
                          style={{ backgroundColor: stmt.displayedAvatarColor }}
                        >
                          {stmt.isAnonymous
                            ? '?'
                            : stmt.displayedAuthorName.charAt(0).toUpperCase()}
                        </span>
                        <strong>{stmt.displayedAuthorName}</strong>
                      </div>
                      <span
                        className={`claim-badge claim-badge-${stmt.claimedSide.toLowerCase()}`}
                      >
                        {stmt.claimedSide === 'NEUTRAL'
                          ? 'Room Intel'
                          : `Pitching Option ${stmt.claimedSide}`}
                      </span>
                    </div>
                    <p className="statement-body">“{stmt.text}”</p>
                  </div>
                ))}
              </div>
            )}

            {isVoter && isPersuasionOpen && (
              <form onSubmit={handlePostStatement} className="statement-composer">
                <div className="composer-top-row">
                  <span className="composer-title">
                    <MessageSquarePlus size={16} /> Post Signed Statement Card (
                    {3 - mySignedStatementsCount} left)
                  </span>
                  <div className="side-tag-selector">
                    {(['A', 'B', 'NEUTRAL'] as const).map((side) => (
                      <button
                        key={side}
                        type="button"
                        className={`side-pill ${claimedSide === side ? 'side-pill-active' : ''}`}
                        onClick={() => setClaimedSide(side)}
                      >
                        {side === 'NEUTRAL' ? 'Neutral' : `Pitch Option ${side}`}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="composer-input-row">
                  <input
                    type="text"
                    className="text-input"
                    maxLength={220}
                    placeholder="Convince the Judge why your option has a tiny non-zero split (or bluff!)..."
                    value={stmtText}
                    onChange={(e) => setStmtText(e.target.value)}
                    disabled={mySignedStatementsCount >= 3}
                    data-testid="statement-input"
                  />
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={!stmtText.trim() || mySignedStatementsCount >= 3}
                    data-testid="post-statement-btn"
                  >
                    <Send size={16} /> Post
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Active Role Power Console (if Voter has Active Power) */}
        {isVoter && myRoleDef?.activePower && state.myRole && (
          <div className="persuasion-side-col">
            <div className="card power-console-card">
              <div className="power-console-header">
                <span className="role-badge">
                  <Zap size={14} /> {myRoleDef.name} Power
                </span>
                <h3 className="card-title">{myRoleDef.activePower.name}</h3>
                <p className="card-subtitle">{myRoleDef.activePower.description}</p>
              </div>

              {state.myRole.hasUsedPower ? (
                <div className="power-used-box" data-testid="power-used-confirmation">
                  <CheckCircle2 size={20} />
                  <div>
                    <strong>Power Executed!</strong>
                    <p>{state.myRole.powerLogSummary}</p>
                    {state.myRole.peekedChoice && (
                      <p className="peek-highlight">
                        {state.myRole.powerTargetName} locked in{' '}
                        <strong>Option {state.myRole.peekedChoice}</strong>!
                      </p>
                    )}
                  </div>
                </div>
              ) : !isPersuasionOpen ? (
                <div className="power-used-box">Persuasion phase has ended.</div>
              ) : (
                <div className="power-controls">
                  {(myRoleDef.activePower.type === 'PEEK' ||
                    myRoleDef.activePower.type === 'NUDGE') && (
                    <div className="form-field">
                      <label className="field-label">Select Target Voter</label>
                      <select
                        className="select-input"
                        value={targetPlayerId || otherVoters[0]?.id || ''}
                        onChange={(e) => setTargetPlayerId(e.target.value)}
                        data-testid="power-target-select"
                      >
                        {otherVoters.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn-accent btn-full"
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
                      </button>
                    </div>
                  )}

                  {myRoleDef.activePower.type === 'LATE_FLIP' && (
                    <div className="form-field">
                      <p className="power-hint">
                        You currently have{' '}
                        <strong>Option {state.myLockedChoice}</strong> locked in.
                        Flipping will secretly change your vote to{' '}
                        <strong>
                          Option {state.myLockedChoice === 'A' ? 'B' : 'A'}
                        </strong>
                        .
                      </p>
                      <button
                        type="button"
                        className="btn-accent btn-full"
                        onClick={handleTriggerPower}
                        data-testid="trigger-power-btn"
                      >
                        <RefreshCw size={16} /> Flip My Vote to Option{' '}
                        {state.myLockedChoice === 'A' ? 'B' : 'A'}
                      </button>
                    </div>
                  )}

                  {myRoleDef.activePower.type === 'PLANT_EVIDENCE' && (
                    <div className="form-field">
                      <label className="field-label">Attribute Forged Card To:</label>
                      <select
                        className="select-input"
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
                      </select>

                      <label className="field-label">Claimed Side:</label>
                      <div className="side-tag-selector">
                        {(['A', 'B', 'NEUTRAL'] as const).map((side) => (
                          <button
                            key={side}
                            type="button"
                            className={`side-pill ${forgedSide === side ? 'side-pill-active' : ''}`}
                            onClick={() => setForgedSide(side)}
                          >
                            {side === 'NEUTRAL' ? 'Neutral' : `Option ${side}`}
                          </button>
                        ))}
                      </div>

                      <textarea
                        className="text-input"
                        rows={2}
                        maxLength={220}
                        placeholder="Write the forged statement or fake confession..."
                        value={forgedText}
                        onChange={(e) => setForgedText(e.target.value)}
                        data-testid="forger-text-input"
                      />

                      <button
                        type="button"
                        className="btn-accent btn-full"
                        disabled={!forgedText.trim()}
                        onClick={handleTriggerPower}
                        data-testid="trigger-power-btn"
                      >
                        <FileWarning size={16} /> Plant Forged Card on Board
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

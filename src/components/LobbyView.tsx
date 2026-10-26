import React, { useState } from 'react';
import {
  Bot,
  Check,
  Copy,
  Crown,
  Monitor,
  Play,
  Plus,
  Settings,
  Share2,
  Shield,
  Sparkles,
  Trash2,
  Users,
  Zap,
} from 'lucide-react';
import { ALL_ROLE_IDS, ROLES_CATALOG } from '../../shared/roles';
import {
  ClientRoomState,
  ClientToServerMessage,
  RoleId,
  VoteRevealMode,
} from '../../shared/types';

interface LobbyViewProps {
  state: ClientRoomState;
  sendMessage: (msg: ClientToServerMessage) => void;
  onCopySuccess: (msg: string) => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  state,
  sendMessage,
  onCopySuccess,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const me = state.players.find((p) => p.id === state.myPlayerId);
  const isHost = Boolean(me?.isHost);
  const activePlayers = state.players.filter((p) => !p.isSpectator);
  const spectators = state.players.filter((p) => p.isSpectator);

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(state.roomCode);
    setCopiedCode(true);
    onCopySuccess(`Room code ${state.roomCode} copied!`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyInviteLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', state.roomCode);
    url.searchParams.delete('pid');
    navigator.clipboard?.writeText(url.toString());
    setCopiedLink(true);
    onCopySuccess('Invite link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const toggleRoleEnabled = (roleId: RoleId) => {
    if (!isHost) return;
    const current = state.settings.enabledRoles;
    const exists = current.includes(roleId);
    if (exists && current.length <= 1) {
      return; // Must keep at least 1 role enabled
    }
    const next = exists
      ? current.filter((id) => id !== roleId)
      : [...current, roleId];
    sendMessage({
      type: 'UPDATE_SETTINGS',
      settings: { enabledRoles: next },
    });
  };

  return (
    <div className="lobby-grid">
      {/* Left Column: Room Code & Players */}
      <div className="lobby-column">
        <div className="card room-code-card">
          <div className="room-code-header">
            <span className="section-eyebrow">ROOM CODE</span>
            <div className="room-code-display" data-testid="room-code-display">
              {state.roomCode}
            </div>
            <p className="room-code-sub">
              Share this 4-letter code or invite link with friends on Discord or mobile
            </p>
          </div>
          <div className="room-code-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCopyCode}
            >
              {copiedCode ? <Check size={16} /> : <Copy size={16} />}
              {copiedCode ? 'Copied Code' : 'Copy Code'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCopyInviteLink}
            >
              {copiedLink ? <Check size={16} /> : <Share2 size={16} />}
              {copiedLink ? 'Copied Link' : 'Copy Invite Link'}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header-row">
            <div>
              <h2 className="card-title">
                <Users size={18} /> Active Players ({activePlayers.length}/10)
              </h2>
              <p className="card-subtitle">
                Requires at least 3 active players (1 Judge + 2+ Voters)
              </p>
            </div>
            {isHost && activePlayers.length < 10 && (
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => sendMessage({ type: 'ADD_BOT' })}
                data-testid="add-bot-btn"
              >
                <Bot size={15} /> <Plus size={14} /> Add AI Bot
              </button>
            )}
          </div>

          <div className="player-roster">
            {activePlayers.map((p) => (
              <div
                key={p.id}
                className={`player-chip ${p.id === state.myPlayerId ? 'player-chip-me' : ''}`}
              >
                <div className="player-chip-left">
                  <span
                    className="avatar-dot"
                    style={{ backgroundColor: p.avatarColor }}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="player-chip-name">
                    {p.name}
                    {p.id === state.myPlayerId && (
                      <span className="you-tag">YOU</span>
                    )}
                  </span>
                  {p.isHost && (
                    <span className="badge-host" title="Room Host">
                      <Crown size={13} /> Host
                    </span>
                  )}
                  {p.isBot && (
                    <span className="badge-bot">
                      <Bot size={13} /> AI Bot
                    </span>
                  )}
                  {!p.isConnected && !p.isBot && (
                    <span className="badge-offline">Offline</span>
                  )}
                </div>
                {isHost && p.isBot && (
                  <button
                    type="button"
                    className="btn-icon-danger"
                    onClick={() =>
                      sendMessage({ type: 'REMOVE_BOT', botId: p.id })
                    }
                    title="Remove Bot"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {spectators.length > 0 && (
            <div className="spectators-section">
              <h4 className="spectators-heading">
                <Monitor size={14} /> Stage / Spectators ({spectators.length})
              </h4>
              <div className="spectators-list">
                {spectators.map((s) => (
                  <span key={s.id} className="spectator-pill">
                    {s.name} {s.id === state.myPlayerId ? '(You)' : ''}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="lobby-footer-actions">
            {me && (
              <button
                type="button"
                className="btn-ghost"
                onClick={() =>
                  sendMessage({
                    type: 'TOGGLE_SPECTATOR',
                    isSpectator: !me.isSpectator,
                  })
                }
              >
                <Monitor size={16} />
                {me.isSpectator
                  ? 'Join as Active Player'
                  : 'Switch to TV / Stage Spectator Mode'}
              </button>
            )}

            {isHost ? (
              <button
                type="button"
                className="btn-primary btn-lg"
                disabled={activePlayers.length < 3}
                onClick={() => sendMessage({ type: 'START_MATCH' })}
                data-testid="start-match-btn"
              >
                <Play size={18} />
                {activePlayers.length < 3
                  ? `Need ${3 - activePlayers.length} More Player${3 - activePlayers.length === 1 ? '' : 's'} (or Add Bots)`
                  : `Start Match (${activePlayers.length * state.settings.rotationsCount} Rounds)`}
              </button>
            ) : (
              <div className="waiting-host-note">
                Waiting for the Host to configure settings and start the match...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Match Settings & Role Deck */}
      <div className="lobby-column">
        <div className="card">
          <h2 className="card-title">
            <Settings size={18} /> Match Rules & Settings
          </h2>

          <div className="settings-group">
            <label className="setting-label">
              End-of-Round Vote & Info Reveal Mode
            </label>
            <div className="segmented-options">
              {(
                [
                  {
                    value: 'player_choice',
                    title: 'Player Choice (Default)',
                    desc: 'Roles & powers revealed; each voter chooses whether to reveal their vote.',
                  },
                  {
                    value: 'full_reveal',
                    title: 'Full Open Reveal',
                    desc: 'Every vote, role, and power is revealed automatically each round.',
                  },
                  {
                    value: 'fog_of_war',
                    title: 'Fog of War (Hardcore)',
                    desc: 'Only split counts (A vs B) shown! Roles, votes & scores hidden until game end.',
                  },
                ] as { value: VoteRevealMode; title: string; desc: string }[]
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={!isHost}
                  className={`mode-card ${state.settings.voteRevealMode === opt.value ? 'mode-card-selected' : ''}`}
                  onClick={() =>
                    sendMessage({
                      type: 'UPDATE_SETTINGS',
                      settings: { voteRevealMode: opt.value },
                    })
                  }
                >
                  <div className="mode-card-title">{opt.title}</div>
                  <div className="mode-card-desc">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="settings-row-split">
            <div className="settings-group">
              <label className="setting-label">Judge Rotations</label>
              <div className="pill-selector">
                {[1, 2, 3].map((rot) => (
                  <button
                    key={rot}
                    type="button"
                    disabled={!isHost}
                    className={`pill-btn ${state.settings.rotationsCount === rot ? 'pill-btn-active' : ''}`}
                    onClick={() =>
                      sendMessage({
                        type: 'UPDATE_SETTINGS',
                        settings: { rotationsCount: rot },
                      })
                    }
                  >
                    {rot}x ({activePlayers.length * rot} Rds)
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-group">
              <label className="setting-label">Phase Timer</label>
              <div className="pill-selector">
                {[
                  { label: 'Untimed', sec: 0 },
                  { label: '60s', sec: 60 },
                  { label: '90s', sec: 90 },
                  { label: '120s', sec: 120 },
                ].map((t) => (
                  <button
                    key={t.sec}
                    type="button"
                    disabled={!isHost}
                    className={`pill-btn ${state.settings.phaseTimerSeconds === t.sec ? 'pill-btn-active' : ''}`}
                    onClick={() =>
                      sendMessage({
                        type: 'UPDATE_SETTINGS',
                        settings: { phaseTimerSeconds: t.sec },
                      })
                    }
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header-row">
            <div>
              <h2 className="card-title">
                <Shield size={18} /> Secret Role Deck (
                {state.settings.enabledRoles.length}/{ALL_ROLE_IDS.length}{' '}
                Active)
              </h2>
              <p className="card-subtitle">
                Every non-Judge voter is dealt 1 fresh secret Role Card each
                round
              </p>
            </div>
          </div>

          <div className="roles-grid">
            {ALL_ROLE_IDS.map((roleId) => {
              const role = ROLES_CATALOG[roleId];
              const enabled = state.settings.enabledRoles.includes(roleId);
              return (
                <button
                  key={roleId}
                  type="button"
                  disabled={!isHost}
                  className={`role-deck-item ${enabled ? 'role-deck-item-on' : 'role-deck-item-off'}`}
                  onClick={() => toggleRoleEnabled(roleId)}
                >
                  <div className="role-deck-top">
                    <span className="role-deck-name">{role.name}</span>
                    <span
                      className={`role-deck-tag ${role.category === 'active' ? 'tag-active' : 'tag-passive'}`}
                    >
                      {role.category === 'active' ? (
                        <>
                          <Zap size={11} /> Power
                        </>
                      ) : (
                        <>
                          <Sparkles size={11} /> Objective
                        </>
                      )}
                    </span>
                  </div>
                  <p className="role-deck-desc">{role.objectiveDescription}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

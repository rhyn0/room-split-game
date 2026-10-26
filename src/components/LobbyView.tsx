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
import type React from 'react';
import { useState } from 'react';
import { ALL_ROLE_IDS, ROLES_CATALOG } from '../../shared/roles';
import type {
  ClientRoomState,
  ClientToServerMessage,
  RoleId,
  VoteRevealMode,
} from '../../shared/types';
import { cn } from '../lib/utils';
import { Badge, Button, Card } from './ui';

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
    const next = exists ? current.filter((id) => id !== roleId) : [...current, roleId];
    sendMessage({
      type: 'UPDATE_SETTINGS',
      settings: { enabledRoles: next },
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Room Code & Players */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <Card variant="elevated" className="text-center">
          <span className="text-xs font-extrabold tracking-widest uppercase text-indigo-300">
            ROOM CODE
          </span>
          <div
            className="font-display text-5xl font-extrabold tracking-[0.22em] text-white my-2"
            data-testid="room-code-display"
          >
            {state.roomCode}
          </div>
          <p className="text-xs text-slate-400 mb-5">
            Share this 4-letter code or invite link with friends on Discord or mobile
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="secondary" size="md" onClick={handleCopyCode}>
              {copiedCode ? <Check size={16} /> : <Copy size={16} />}
              {copiedCode ? 'Copied Code' : 'Copy Code'}
            </Button>
            <Button variant="secondary" size="md" onClick={handleCopyInviteLink}>
              {copiedLink ? <Check size={16} /> : <Share2 size={16} />}
              {copiedLink ? 'Copied Link' : 'Copy Invite Link'}
            </Button>
          </div>
        </Card>

        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <Users size={18} className="text-indigo-400" /> Active Players (
                {activePlayers.length}/10)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Requires at least 3 active players (1 Judge + 2+ Voters)
              </p>
            </div>
            {isHost && activePlayers.length < 10 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => sendMessage({ type: 'ADD_BOT' })}
                data-testid="add-bot-btn"
              >
                <Bot size={15} /> <Plus size={14} /> Add AI Bot
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {activePlayers.map((p) => (
              <div
                key={p.id}
                className={cn(
                  'flex items-center justify-between px-3.5 py-2.5 rounded-xl border bg-slate-950/65',
                  p.id === state.myPlayerId
                    ? 'border-indigo-500/60 bg-indigo-500/10'
                    : 'border-slate-800/80'
                )}
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className="w-8 h-8 rounded-full inline-flex items-center justify-center font-extrabold text-sm text-white shrink-0"
                    style={{ backgroundColor: p.avatarColor }}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="font-semibold text-sm">
                    {p.name}
                    {p.id === state.myPlayerId && (
                      <Badge variant="default" className="ml-2">
                        YOU
                      </Badge>
                    )}
                  </span>
                  {p.isHost && (
                    <Badge variant="judge" title="Room Host">
                      <Crown size={12} /> Host
                    </Badge>
                  )}
                  {p.isBot && (
                    <Badge variant="bot">
                      <Bot size={12} /> AI Bot
                    </Badge>
                  )}
                  {!p.isConnected && !p.isBot && (
                    <Badge variant="danger">Offline</Badge>
                  )}
                </div>
                {isHost && p.isBot && (
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => sendMessage({ type: 'REMOVE_BOT', botId: p.id })}
                    title="Remove Bot"
                  >
                    <Trash2 size={15} />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {spectators.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                <Monitor size={14} /> Stage / Spectators ({spectators.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {spectators.map((s) => (
                  <Badge key={s.id} variant="muted" size="md">
                    {s.name} {s.id === state.myPlayerId ? '(You)' : ''}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-col gap-3">
            {me && (
              <Button
                variant="ghost"
                fullWidth
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
              </Button>
            )}

            {isHost ? (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                disabled={activePlayers.length < 3}
                onClick={() => sendMessage({ type: 'START_MATCH' })}
                data-testid="start-match-btn"
              >
                <Play size={18} />
                {activePlayers.length < 3
                  ? `Need ${3 - activePlayers.length} More Player${3 - activePlayers.length === 1 ? '' : 's'} (or Add Bots)`
                  : `Start Match (${activePlayers.length * state.settings.rotationsCount} Rounds)`}
              </Button>
            ) : (
              <div className="text-center p-3 rounded-xl bg-slate-950/50 text-slate-400 text-xs">
                Waiting for the Host to configure settings and start the match...
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Right Column: Match Settings & Role Deck */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        <Card>
          <h2 className="font-display text-lg font-bold flex items-center gap-2 mb-4">
            <Settings size={18} className="text-indigo-400" /> Match Rules & Settings
          </h2>

          <div className="mb-5">
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              End-of-Round Vote & Info Reveal Mode
            </span>
            <div className="flex flex-col gap-2">
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
              ).map((opt) => {
                const selected = state.settings.voteRevealMode === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={!isHost}
                    onClick={() =>
                      sendMessage({
                        type: 'UPDATE_SETTINGS',
                        settings: { voteRevealMode: opt.value },
                      })
                    }
                    className={cn(
                      'text-left p-3.5 rounded-xl border transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed',
                      selected
                        ? 'border-indigo-500 bg-indigo-500/15'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    )}
                  >
                    <div className="font-bold text-sm text-white">{opt.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Judge Rotations
              </span>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3].map((rot) => (
                  <Button
                    key={rot}
                    variant={
                      state.settings.rotationsCount === rot ? 'primary' : 'secondary'
                    }
                    size="sm"
                    disabled={!isHost}
                    onClick={() =>
                      sendMessage({
                        type: 'UPDATE_SETTINGS',
                        settings: { rotationsCount: rot },
                      })
                    }
                  >
                    {rot}x ({activePlayers.length * rot} Rds)
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Phase Timer
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Untimed', sec: 0 },
                  { label: '60s', sec: 60 },
                  { label: '90s', sec: 90 },
                  { label: '120s', sec: 120 },
                ].map((t) => (
                  <Button
                    key={t.sec}
                    variant={
                      state.settings.phaseTimerSeconds === t.sec
                        ? 'primary'
                        : 'secondary'
                    }
                    size="sm"
                    disabled={!isHost}
                    onClick={() =>
                      sendMessage({
                        type: 'UPDATE_SETTINGS',
                        settings: { phaseTimerSeconds: t.sec },
                      })
                    }
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="mb-4">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <Shield size={18} className="text-indigo-400" /> Secret Role Deck (
              {state.settings.enabledRoles.length}/{ALL_ROLE_IDS.length} Active)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Every non-Judge voter is dealt 1 fresh secret Role Card each round
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {ALL_ROLE_IDS.map((roleId) => {
              const role = ROLES_CATALOG[roleId];
              const enabled = state.settings.enabledRoles.includes(roleId);
              return (
                <button
                  key={roleId}
                  type="button"
                  disabled={!isHost}
                  onClick={() => toggleRoleEnabled(roleId)}
                  className={cn(
                    'text-left p-3 rounded-xl border transition-all cursor-pointer disabled:cursor-default',
                    enabled
                      ? 'border-indigo-500/50 bg-indigo-500/10 text-slate-100'
                      : 'border-slate-800/70 bg-slate-950/50 text-slate-500 opacity-50'
                  )}
                >
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <span className="font-bold text-xs text-white">{role.name}</span>
                    <Badge
                      variant={
                        role.category === 'active' ? 'activePower' : 'passiveRole'
                      }
                    >
                      {role.category === 'active' ? (
                        <>
                          <Zap size={10} /> Power
                        </>
                      ) : (
                        <>
                          <Sparkles size={10} /> Goal
                        </>
                      )}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {role.objectiveDescription}
                  </p>
                </button>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};

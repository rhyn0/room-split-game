import { Eye, EyeOff, ShieldAlert, Sparkles, UserCheck, Zap } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { getRoleDefinition } from '../../shared/roles';
import type { ChoiceOption, PlayerRoleAssignment } from '../../shared/types';
import { Badge, Button, Card } from './ui';

interface RoleCardBannerProps {
  assignment: PlayerRoleAssignment;
  myLockedChoice: ChoiceOption | null;
}

export const RoleCardBanner: React.FC<RoleCardBannerProps> = ({
  assignment,
  myLockedChoice,
}) => {
  const [isConcealed, setIsConcealed] = useState(false);
  const roleDef = getRoleDefinition(assignment.roleId);
  const isActive = roleDef.category === 'active';

  return (
    <Card
      variant={isActive ? 'activeRole' : 'passiveRole'}
      padding="sm"
      data-testid="role-card-banner"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge variant={isActive ? 'activePower' : 'passiveRole'}>
            {isActive ? (
              <>
                <Zap size={13} /> Active Role
              </>
            ) : (
              <>
                <Sparkles size={13} /> Secret Role
              </>
            )}
          </Badge>
          <h3 className="font-display text-lg font-extrabold">
            {isConcealed ? '•••••• ••••••' : roleDef.name}
          </h3>
          {!isConcealed && (
            <span className="text-sm text-slate-300">— {roleDef.tagline}</span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {myLockedChoice && !isConcealed && (
            <Badge variant={myLockedChoice === 'A' ? 'optionA' : 'optionB'} size="md">
              Your Vote: Option {myLockedChoice}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsConcealed((prev) => !prev)}
            title="Conceal your secret role from nearby screens"
          >
            {isConcealed ? (
              <>
                <Eye size={15} /> Show Role
              </>
            ) : (
              <>
                <EyeOff size={15} /> Hide Role
              </>
            )}
          </Button>
        </div>
      </div>

      {!isConcealed && (
        <div className="mt-3.5 border-t border-white/10 pt-3.5 flex flex-col gap-2.5 text-sm">
          <div>
            <strong className="text-white">
              Bonus Objective (+{roleDef.bonusPoints} pts):
            </strong>{' '}
            <span className="text-slate-200">{roleDef.objectiveDescription}</span>
          </div>

          {assignment.roleId === 'accomplice' && assignment.accompliceTargetName && (
            <div className="flex items-center gap-2.5 rounded-xl bg-slate-950/65 px-3.5 py-2.5 text-xs text-slate-200 border border-indigo-500/30">
              <UserCheck size={16} className="text-indigo-400 shrink-0" />
              <span>
                Your Secret Partner is{' '}
                <strong className="text-white">
                  {assignment.accompliceTargetName}
                </strong>
                ! Try to lock in the exact same option as them.
              </span>
            </div>
          )}

          {roleDef.activePower && (
            <div className="flex items-center gap-2.5 rounded-xl bg-slate-950/65 px-3.5 py-2.5 text-xs text-slate-200 border border-amber-500/30">
              <Zap size={16} className="text-amber-400 shrink-0" />
              <div className="flex flex-wrap items-center gap-2">
                <span>
                  <strong className="text-white">
                    Active Power ({roleDef.activePower.name}):
                  </strong>{' '}
                  {roleDef.activePower.description}
                </span>
                <Badge variant={assignment.hasUsedPower ? 'muted' : 'activePower'}>
                  {assignment.hasUsedPower ? 'USED THIS ROUND' : 'READY IN PERSUASION'}
                </Badge>
              </div>
            </div>
          )}

          {assignment.peekedChoice && assignment.powerTargetName && (
            <div className="flex items-center gap-2.5 rounded-xl bg-sky-950/60 border border-sky-400/50 px-3.5 py-2.5 text-xs text-sky-200">
              <ShieldAlert size={16} className="text-sky-400 shrink-0" />
              <span>
                <strong>Wiretap Intel:</strong> {assignment.powerTargetName} currently
                has <strong>Option {assignment.peekedChoice}</strong> locked in!
              </span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

import { Eye, EyeOff, ShieldAlert, Sparkles, UserCheck, Zap } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { getRoleDefinition } from '../../shared/roles';
import type { ChoiceOption, PlayerRoleAssignment } from '../../shared/types';

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

  return (
    <div
      className={`role-banner ${roleDef.category === 'active' ? 'role-banner-active' : 'role-banner-passive'}`}
      data-testid="role-card-banner"
    >
      <div className="role-banner-header">
        <div className="role-banner-title-group">
          <span className="role-badge">
            {roleDef.category === 'active' ? (
              <>
                <Zap size={14} /> Active Role
              </>
            ) : (
              <>
                <Sparkles size={14} /> Secret Role
              </>
            )}
          </span>
          <h3 className="role-name">{isConcealed ? '•••••• ••••••' : roleDef.name}</h3>
          {!isConcealed && <span className="role-tagline">— {roleDef.tagline}</span>}
        </div>

        <div className="role-banner-actions">
          {myLockedChoice && !isConcealed && (
            <span className={`locked-pill locked-pill-${myLockedChoice.toLowerCase()}`}>
              Your Vote: Option {myLockedChoice}
            </span>
          )}
          <button
            type="button"
            className="btn-ghost btn-sm"
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
          </button>
        </div>
      </div>

      {!isConcealed && (
        <div className="role-banner-body">
          <div className="role-objective">
            <strong>Bonus Objective (+{roleDef.bonusPoints} pts):</strong>{' '}
            {roleDef.objectiveDescription}
          </div>

          {assignment.roleId === 'accomplice' && assignment.accompliceTargetName && (
            <div className="role-callout role-callout-partner">
              <UserCheck size={16} />
              <span>
                Your Secret Partner is{' '}
                <strong>{assignment.accompliceTargetName}</strong>! Try to lock in the
                exact same option as them.
              </span>
            </div>
          )}

          {roleDef.activePower && (
            <div className="role-callout role-callout-power">
              <Zap size={16} />
              <div>
                <strong>Active Power ({roleDef.activePower.name}):</strong>{' '}
                {roleDef.activePower.description}{' '}
                <span className="power-status-chip">
                  {assignment.hasUsedPower ? 'USED THIS ROUND' : 'READY IN PERSUASION'}
                </span>
              </div>
            </div>
          )}

          {assignment.peekedChoice && assignment.powerTargetName && (
            <div className="role-callout role-callout-intel">
              <ShieldAlert size={16} />
              <span>
                <strong>Wiretap Intel:</strong> {assignment.powerTargetName} currently
                has <strong>Option {assignment.peekedChoice}</strong> locked in!
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

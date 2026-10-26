import { getRoleDefinition } from './roles';
import {
  ChoiceOption,
  Player,
  PlayerRoleAssignment,
  PlayerRoundScoreBreakdown,
  QuestionPrompt,
  RoundSummary,
} from './types';

export interface CalculateRoundScoresInput {
  roundNumber: number;
  judge: Player;
  voters: Player[];
  prompt: QuestionPrompt;
  judgeChoice: ChoiceOption;
  initialChoices: Record<string, ChoiceOption>;
  finalChoices: Record<string, ChoiceOption>;
  roleAssignments: Record<string, PlayerRoleAssignment>;
  nudgedPlayerIds: Set<string>;
  turncoatSwitchedIds: Set<string>;
}

/**
 * Pure function to compute the Judge's score:
 * - k = 0 (empty side) -> 0 pts
 * - k = N (unanimous side) -> 0 pts
 * - 1 <= k < N -> (N - k) pts
 */
export function calculateJudgePoints(totalVoters: number, chosenSideCount: number): number {
  if (totalVoters <= 0) return 0;
  if (chosenSideCount <= 0 || chosenSideCount >= totalVoters) {
    return 0;
  }
  return totalVoters - chosenSideCount;
}

export function calculateRoundSummary(input: CalculateRoundScoresInput): RoundSummary {
  const {
    roundNumber,
    judge,
    voters,
    prompt,
    judgeChoice,
    initialChoices,
    finalChoices,
    roleAssignments,
    nudgedPlayerIds,
    turncoatSwitchedIds,
  } = input;

  let countA = 0;
  let countB = 0;
  for (const voter of voters) {
    const choice = finalChoices[voter.id] ?? 'A';
    if (choice === 'A') countA++;
    else countB++;
  }

  const totalVoters = voters.length;
  const k = judgeChoice === 'A' ? countA : countB;
  const judgePoints = calculateJudgePoints(totalVoters, k);

  let judgeReason = '';
  if (k === 0) {
    judgeReason = 'Baited into an empty side (k = 0 → 0 pts)';
  } else if (k === totalVoters) {
    judgeReason = `Unanimous room — failed to split (k = ${totalVoters}/${totalVoters} → 0 pts)`;
  } else {
    judgeReason = `Found a ${k}-player split out of ${totalVoters} (N - k = ${judgePoints} pts)`;
  }

  const breakdowns: PlayerRoundScoreBreakdown[] = [];

  // 1. Judge breakdown
  breakdowns.push({
    playerId: judge.id,
    playerName: judge.name,
    isJudge: true,
    voluntarilyRevealedVote: true,
    basePoints: judgePoints,
    bonusPoints: 0,
    totalRoundPoints: judgePoints,
    bonusReason: judgeReason,
  });

  // 2. Voter breakdowns
  for (const voter of voters) {
    const finalChoice = finalChoices[voter.id] ?? 'A';
    const initialChoice = initialChoices[voter.id] ?? finalChoice;
    const assignment = roleAssignments[voter.id];
    const roleDef = assignment ? getRoleDefinition(assignment.roleId) : undefined;
    const onJudgeSide = finalChoice === judgeChoice;

    let basePoints = 0;
    let bonusPoints = 0;
    let bonusReason: string | undefined;

    if (roleDef?.replacesBasePoints) {
      // Double Agent replaces standard base points
      basePoints = 0;
      if (!onJudgeSide) {
        bonusPoints = roleDef.bonusPoints;
        bonusReason = `${roleDef.name}: Judge picked the opposite side (+${roleDef.bonusPoints})`;
      }
    } else {
      basePoints = onJudgeSide ? 2 : 0;
      if (assignment && roleDef) {
        switch (assignment.roleId) {
          case 'baiter':
            if (k === 0) {
              bonusPoints = roleDef.bonusPoints;
              bonusReason = `The Baiter: Judge picked an empty side (+${bonusPoints})`;
            }
            break;
          case 'lone_wolf':
            if (onJudgeSide && k === 1) {
              bonusPoints = roleDef.bonusPoints;
              bonusReason = `The Lone Wolf: Sole player on Judge's chosen side (+${bonusPoints})`;
            }
            break;
          case 'union_boss':
            if (onJudgeSide && k > totalVoters / 2) {
              bonusPoints = roleDef.bonusPoints;
              bonusReason = `The Union Boss: Majority (${k}/${totalVoters}) on Judge's side (+${bonusPoints})`;
            }
            break;
          case 'accomplice':
            if (assignment.accompliceTargetId) {
              const partnerChoice = finalChoices[assignment.accompliceTargetId];
              if (partnerChoice && partnerChoice === finalChoice) {
                bonusPoints = roleDef.bonusPoints;
                bonusReason = `The Accomplice: Matched Option ${finalChoice} with ${assignment.accompliceTargetName ?? 'partner'} (+${bonusPoints})`;
              }
            }
            break;
          case 'wiretapper':
            if (onJudgeSide) {
              bonusPoints = roleDef.bonusPoints;
              bonusReason = `The Wiretapper: Chosen side bonus (+${bonusPoints})`;
            }
            break;
          case 'forger':
            if (onJudgeSide) {
              bonusPoints = roleDef.bonusPoints;
              bonusReason = `The Forger: Chosen side bonus (+${bonusPoints})`;
            }
            break;
          case 'turncoat':
            if (onJudgeSide && turncoatSwitchedIds.has(voter.id)) {
              bonusPoints = roleDef.bonusPoints;
              bonusReason = `The Turncoat: Switched via Late Flip & landed on Judge's side (+${bonusPoints})`;
            }
            break;
          case 'saboteur':
            if (judgePoints <= 1) {
              bonusPoints = roleDef.bonusPoints;
              bonusReason = `The Saboteur: Held Judge to ${judgePoints} pt${judgePoints === 1 ? '' : 's'} (+${bonusPoints})`;
            }
            break;
        }
      }
    }

    breakdowns.push({
      playerId: voter.id,
      playerName: voter.name,
      isJudge: false,
      roleId: assignment?.roleId,
      roleName: roleDef?.name,
      initialChoice,
      finalChoice,
      wasNudgedBySaboteur: nudgedPlayerIds.has(voter.id),
      switchedViaTurncoat: turncoatSwitchedIds.has(voter.id),
      voluntarilyRevealedVote: false,
      basePoints,
      bonusPoints,
      totalRoundPoints: basePoints + bonusPoints,
      bonusReason,
      powerLogSummary: assignment?.powerLogSummary,
    });
  }

  return {
    roundNumber,
    judgeId: judge.id,
    judgeName: judge.name,
    prompt,
    judgeChoice,
    countA,
    countB,
    totalVoters,
    breakdowns,
  };
}

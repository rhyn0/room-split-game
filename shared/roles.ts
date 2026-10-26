import type {
  ChoiceOption,
  PlayerRoleAssignment,
  QuestionPrompt,
  RoleDefinition,
  RoleId,
} from './types';

export const ROLES_CATALOG: Record<RoleId, RoleDefinition> = {
  baiter: {
    id: 'baiter',
    name: 'The Baiter',
    tagline: 'Lure the Judge into an empty trap.',
    category: 'passive',
    bonusPoints: 3,
    objectiveDescription:
      'Earn +3 bonus points if the Judge picks an empty side (0 players).',
  },
  lone_wolf: {
    id: 'lone_wolf',
    name: 'The Lone Wolf',
    tagline: 'Stand alone in the Judge’s spotlight.',
    category: 'passive',
    bonusPoints: 3,
    objectiveDescription:
      'Earn +3 bonus points if you are the ONLY player (k = 1) on the side the Judge picks.',
  },
  union_boss: {
    id: 'union_boss',
    name: 'The Union Boss',
    tagline: 'Strength in overwhelming numbers.',
    category: 'passive',
    bonusPoints: 2,
    objectiveDescription:
      'Earn +2 bonus points if strictly more than half of the voters (k > N/2) are on the side the Judge picks.',
  },
  accomplice: {
    id: 'accomplice',
    name: 'The Accomplice',
    tagline: 'Stick with your secret partner.',
    category: 'passive',
    bonusPoints: 2,
    objectiveDescription:
      'Earn +2 bonus points if you and your assigned secret partner lock in the exact same final option.',
  },
  double_agent: {
    id: 'double_agent',
    name: 'The Double Agent',
    tagline: 'Win by losing the Judge’s favor.',
    category: 'passive',
    bonusPoints: 2,
    replacesBasePoints: true,
    objectiveDescription:
      'Replaces standard base points: Earn +2 points if the Judge picks the OPPOSITE side of your final locked choice.',
  },
  wiretapper: {
    id: 'wiretapper',
    name: 'The Wiretapper',
    tagline: 'Intercept classified intel before pitching.',
    category: 'active',
    bonusPoints: 1,
    objectiveDescription:
      'Earn +1 bonus point if the Judge picks your side. Use your active power during Persuasion to peek at one player’s locked choice.',
    activePower: {
      type: 'PEEK',
      name: 'Wiretap Peek',
      description:
        'Secretly view which option (A or B) one target player currently has locked in.',
    },
  },
  forger: {
    id: 'forger',
    name: 'The Forger',
    tagline: 'Flood the board with fabricated alibis.',
    category: 'active',
    bonusPoints: 1,
    objectiveDescription:
      'Earn +1 bonus point if the Judge picks your side. Use your active power during Persuasion to post an Anonymous or Forged statement card under another player’s name.',
    activePower: {
      type: 'PLANT_EVIDENCE',
      name: 'Plant Forged Card',
      description:
        'Post an extra statement card attributed to "Anonymous" or forged under another player’s name.',
    },
  },
  turncoat: {
    id: 'turncoat',
    name: 'The Turncoat',
    tagline: 'Betray your side at the last second.',
    category: 'active',
    bonusPoints: 1,
    objectiveDescription:
      'Earn +1 bonus point if you use Late Flip during Persuasion AND the Judge picks your final side.',
    activePower: {
      type: 'LATE_FLIP',
      name: 'Late Flip',
      description:
        'Secretly flip your own locked vote (A ↔ B) once during the Persuasion phase.',
    },
  },
  saboteur: {
    id: 'saboteur',
    name: 'The Saboteur',
    tagline: 'Sow chaos and tank the Judge’s score.',
    category: 'active',
    bonusPoints: 2,
    objectiveDescription:
      'Earn +2 bonus points if the Judge scores 1 or 0 points this round. Use your active power to secretly flip another player’s vote.',
    activePower: {
      type: 'NUDGE',
      name: 'Secret Nudge',
      description:
        'Secretly swap one target player’s locked vote (A ↔ B) during Persuasion. They won’t know until the Reveal!',
    },
  },
};

export const ALL_ROLE_IDS: RoleId[] = Object.keys(ROLES_CATALOG) as RoleId[];

export function getRoleDefinition(roleId: RoleId): RoleDefinition {
  return ROLES_CATALOG[roleId];
}

/**
 * Deals one role card per non-judge active player for the round.
 * Shuffles the enabled roles pool (repeating only if there are more players than enabled roles).
 */
export function dealRolesForRound(
  voterPlayers: { id: string; name: string }[],
  enabledRoles: RoleId[],
  rng: () => number = Math.random
): Record<string, PlayerRoleAssignment> {
  const poolBase: RoleId[] =
    enabledRoles.length > 0 ? [...enabledRoles] : [...ALL_ROLE_IDS];

  // If fewer than 2 voters exist, filter out 'accomplice' since Accomplice needs a partner
  const usablePool =
    voterPlayers.length < 2 ? poolBase.filter((r) => r !== 'accomplice') : poolBase;

  const finalPoolBase = usablePool.length > 0 ? usablePool : ['lone_wolf' as RoleId];

  // Build shuffled deck large enough for all voters
  const deck: RoleId[] = [];
  while (deck.length < voterPlayers.length) {
    const copy = [...finalPoolBase];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    deck.push(...copy);
  }

  const assignments: Record<string, PlayerRoleAssignment> = {};

  voterPlayers.forEach((voter, index) => {
    const roleId = deck[index];
    const assignment: PlayerRoleAssignment = {
      playerId: voter.id,
      roleId,
      hasUsedPower: false,
    };

    if (roleId === 'accomplice' && voterPlayers.length >= 2) {
      const others = voterPlayers.filter((p) => p.id !== voter.id);
      const partner = others[Math.floor(rng() * others.length)];
      assignment.accompliceTargetId = partner.id;
      assignment.accompliceTargetName = partner.name;
    }

    assignments[voter.id] = assignment;
  });

  return assignments;
}

/**
 * Bot helper prompts for solo testing or filling lobbies with AI bots.
 */
export const BOT_SAMPLE_PROMPTS: QuestionPrompt[] = [
  {
    question:
      'You find a suitcase with $100,000 cash in an alley. What do you actually do?',
    optionA: 'Keep it quietly and tell nobody',
    optionB: 'Turn it in to the police station',
  },
  {
    question: 'If you had to give up one forever starting tonight, which goes?',
    optionA: 'Coffee & caffeine',
    optionB: 'Cheese & dairy',
  },
  {
    question:
      'In a zombie apocalypse, what is your survival strategy in the first 24 hours?',
    optionA: 'Fortify my current home and lay low',
    optionB: 'Hit the highway immediately for the mountains',
  },
  {
    question: 'Which superpower has the better everyday value?',
    optionA: 'Teleport anywhere with a 30-minute cooldown',
    optionB: 'Speak and understand every human language fluently',
  },
  {
    question: 'You can only eat one breakfast style for the rest of the year:',
    optionA: 'Savory (eggs, bacon, hashbrowns, toast)',
    optionB: 'Sweet (waffles, pancakes, pastries, fruit)',
  },
];

export function generateBotStatement(
  roleId: RoleId,
  lockedChoice: ChoiceOption,
  prompt: QuestionPrompt,
  rng: () => number = Math.random
): { text: string; claimedSide: ChoiceOption | 'NEUTRAL' } {
  const otherChoice: ChoiceOption = lockedChoice === 'A' ? 'B' : 'A';
  const myOptionLabel = lockedChoice === 'A' ? prompt.optionA : prompt.optionB;
  const otherOptionLabel = otherChoice === 'A' ? prompt.optionA : prompt.optionB;

  if (roleId === 'baiter' || roleId === 'double_agent') {
    return {
      text: `Pretty sure almost everyone piled into Option ${lockedChoice} ("${myOptionLabel}"). Option ${otherChoice} only has 1 person in it!`,
      claimedSide: otherChoice,
    };
  }

  if (roleId === 'lone_wolf') {
    return {
      text: `Everyone in Discord sounded like they went Option ${otherChoice} ("${otherOptionLabel}"). I might be the only person who locked ${lockedChoice}.`,
      claimedSide: lockedChoice,
    };
  }

  const templates = [
    {
      text: `Honestly ${otherOptionLabel} is way too popular—everyone I know picks ${otherChoice}. Pick ${lockedChoice} if you want the small group!`,
      claimedSide: lockedChoice,
    },
    {
      text: `Careful Judge, ${otherChoice} might literally have 0 votes this round. ${lockedChoice} is a safe 1-2 person split.`,
      claimedSide: lockedChoice,
    },
    {
      text: `I went with "${myOptionLabel}" because I knew the rest of the room would stampede toward Option ${otherChoice}.`,
      claimedSide: lockedChoice,
    },
  ];

  return templates[Math.floor(rng() * templates.length)];
}

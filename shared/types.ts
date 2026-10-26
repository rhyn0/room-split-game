export type ChoiceOption = 'A' | 'B';

export type GamePhase =
  | 'LOBBY'
  | 'PHASE1_JUDGE_QUESTION'
  | 'PHASE2_SECRET_LOCK_IN'
  | 'PHASE3_PERSUASION'
  | 'PHASE4_JUDGE_DECISION'
  | 'PHASE5_REVEAL_AND_SCORE'
  | 'POST_GAME_SUMMARY';

export type VoteRevealMode = 'player_choice' | 'full_reveal' | 'fog_of_war';

export type RoleId =
  | 'baiter'
  | 'lone_wolf'
  | 'union_boss'
  | 'accomplice'
  | 'double_agent'
  | 'wiretapper'
  | 'forger'
  | 'turncoat'
  | 'saboteur';

export type ActivePowerType = 'PEEK' | 'PLANT_EVIDENCE' | 'LATE_FLIP' | 'NUDGE';

export interface RoleDefinition {
  id: RoleId;
  name: string;
  tagline: string;
  category: 'passive' | 'active';
  bonusPoints: number;
  replacesBasePoints?: boolean;
  objectiveDescription: string;
  activePower?: {
    type: ActivePowerType;
    name: string;
    description: string;
  };
}

export interface RoomSettings {
  voteRevealMode: VoteRevealMode;
  rotationsCount: number; // Number of full Judge rotations (default: 1)
  phaseTimerSeconds: number; // 0 = untimed, or 45 / 60 / 90 / 120
  enabledRoles: RoleId[];
}

export interface Player {
  id: string;
  name: string;
  avatarColor: string;
  isHost: boolean;
  isConnected: boolean;
  isBot: boolean;
  isSpectator: boolean;
  score: number;
}

export interface QuestionPrompt {
  question: string;
  optionA: string;
  optionB: string;
}

export interface StatementCard {
  id: string;
  /** The displayed author ID (or 'anonymous' if planted anonymously) */
  displayedAuthorId: string;
  displayedAuthorName: string;
  displayedAvatarColor: string;
  /** True author ID (kept secret on server until Phase 5 reveal if forged) */
  trueAuthorId: string;
  trueAuthorName: string;
  isForged: boolean;
  isAnonymous: boolean;
  text: string;
  claimedSide: ChoiceOption | 'NEUTRAL';
  createdAt: number;
}

export interface PlayerRoleAssignment {
  playerId: string;
  roleId: RoleId;
  /** For 'accomplice', the target player ID assigned at round start */
  accompliceTargetId?: string;
  accompliceTargetName?: string;
  /** Whether the player has used their one-time active power this round */
  hasUsedPower: boolean;
  /** Result or record of power usage */
  powerTargetId?: string;
  powerTargetName?: string;
  /** If Wiretapper peeked, what option did the target have at that moment? */
  peekedChoice?: ChoiceOption;
  /** Public log string shown in Phase 5 reveal */
  powerLogSummary?: string;
}

export interface PlayerRoundScoreBreakdown {
  playerId: string;
  playerName: string;
  isJudge: boolean;
  roleId?: RoleId;
  roleName?: string;
  initialChoice?: ChoiceOption;
  finalChoice?: ChoiceOption;
  wasNudgedBySaboteur?: boolean;
  switchedViaTurncoat?: boolean;
  voluntarilyRevealedVote: boolean;
  basePoints: number;
  bonusPoints: number;
  totalRoundPoints: number;
  bonusReason?: string;
  powerLogSummary?: string;
}

export interface RoundSummary {
  roundNumber: number;
  judgeId: string;
  judgeName: string;
  prompt: QuestionPrompt;
  judgeChoice: ChoiceOption;
  countA: number;
  countB: number;
  totalVoters: number;
  breakdowns: PlayerRoundScoreBreakdown[];
}

/**
 * Personalized state snapshot sent from the PartyKit server to a specific client.
 * Secret votes and roles of other players are stripped during Phases 1-4.
 */
export interface ClientPlayerView {
  id: string;
  name: string;
  avatarColor: string;
  isHost: boolean;
  isConnected: boolean;
  isBot: boolean;
  isSpectator: boolean;
  /** In fog_of_war mode, scores stay masked at 0 during rounds until POST_GAME_SUMMARY */
  score: number;
  hasLockedIn: boolean;
  /** Only populated in Phase 5 if full_reveal, or player opted in via player_choice, or it's the viewer's own vote */
  revealedChoice?: ChoiceOption;
}

export interface ClientRoomState {
  roomCode: string;
  phase: GamePhase;
  settings: RoomSettings;
  players: ClientPlayerView[];
  myPlayerId: string;
  currentRound: number;
  totalRounds: number;
  judgeId: string | null;
  prompt: QuestionPrompt | null;
  phaseDeadlineMs: number | null;
  statements: StatementCard[];
  /** Only populated for the viewing player during Phases 1-5 */
  myRole: PlayerRoleAssignment | null;
  /** Only populated for the viewing player during Phases 2-5 */
  myLockedChoice: ChoiceOption | null;
  myInitialChoice: ChoiceOption | null;
  /** Populated in Phase 5 */
  currentRoundSummary: RoundSummary | null;
  /** Populated in Post-Game Summary */
  matchHistory: RoundSummary[];
}

export type ClientToServerMessage =
  | {
      type: 'JOIN_ROOM';
      playerId: string;
      name: string;
      isSpectator?: boolean;
    }
  | {
      type: 'TOGGLE_SPECTATOR';
      isSpectator: boolean;
    }
  | {
      type: 'UPDATE_SETTINGS';
      settings: Partial<RoomSettings>;
    }
  | {
      type: 'ADD_BOT';
    }
  | {
      type: 'REMOVE_BOT';
      botId: string;
    }
  | {
      type: 'START_MATCH';
    }
  | {
      type: 'SUBMIT_QUESTION';
      prompt: QuestionPrompt;
    }
  | {
      type: 'LOCK_IN_CHOICE';
      choice: ChoiceOption;
    }
  | {
      type: 'POST_STATEMENT';
      text: string;
      claimedSide: ChoiceOption | 'NEUTRAL';
    }
  | {
      type: 'USE_ACTIVE_POWER';
      powerType: ActivePowerType;
      targetPlayerId?: string;
      forgedText?: string;
      forgedClaimedSide?: ChoiceOption | 'NEUTRAL';
      forgedAsPlayerId?: string | 'anonymous';
    }
  | {
      type: 'ADVANCE_TO_VERDICT';
    }
  | {
      type: 'SUBMIT_JUDGE_VERDICT';
      choice: ChoiceOption;
    }
  | {
      type: 'TOGGLE_REVEAL_MY_VOTE';
    }
  | {
      type: 'NEXT_ROUND';
    }
  | {
      type: 'RESET_TO_LOBBY';
    };

export type ServerToClientMessage =
  | {
      type: 'STATE_SYNC';
      state: ClientRoomState;
    }
  | {
      type: 'ERROR';
      message: string;
    }
  | {
      type: 'TOAST';
      message: string;
      variant: 'info' | 'success' | 'warning';
    };

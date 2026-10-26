import {
  ALL_ROLE_IDS,
  BOT_SAMPLE_PROMPTS,
  dealRolesForRound,
  generateBotStatement,
  getRoleDefinition,
} from './roles';
import { calculateRoundSummary } from './scoring';
import type {
  ActivePowerType,
  ChoiceOption,
  ClientPlayerView,
  ClientRoomState,
  ClientToServerMessage,
  GamePhase,
  Player,
  PlayerRoleAssignment,
  QuestionPrompt,
  RoomSettings,
  RoundSummary,
  StatementCard,
} from './types';

const AVATAR_COLORS = [
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
  '#f43f5e', // Rose
  '#14b8a6', // Teal
  '#eab308', // Yellow
  '#3b82f6', // Blue
];

const BOT_NAMES = [
  'Cipher',
  'Vesper',
  'Rook',
  'Nyx',
  'Jinx',
  'Maverick',
  'Sloane',
  'Echo',
];

export interface EngineCallbacks {
  onBroadcastState: () => void;
  onSendToast?: (
    playerId: string,
    message: string,
    variant: 'info' | 'success' | 'warning'
  ) => void;
  onSendError?: (playerId: string, message: string) => void;
  onScheduleTimer?: (delayMs: number, callback: () => void) => void;
}

export class RoomGameEngine {
  public readonly roomCode: string;
  public phase: GamePhase = 'LOBBY';
  public settings: RoomSettings = {
    voteRevealMode: 'player_choice',
    rotationsCount: 1,
    phaseTimerSeconds: 0,
    enabledRoles: [...ALL_ROLE_IDS],
  };

  public players: Player[] = [];
  public currentRound = 0;
  public totalRounds = 0;
  public judgeRotationOrder: string[] = [];
  public judgeId: string | null = null;
  public prompt: QuestionPrompt | null = null;
  public phaseDeadlineMs: number | null = null;

  public roleAssignments: Record<string, PlayerRoleAssignment> = {};
  public initialChoices: Record<string, ChoiceOption> = {};
  /** What the player themselves believes they have locked in (updates on Turncoat flip, NOT on Saboteur nudge) */
  public playerKnownChoices: Record<string, ChoiceOption> = {};
  /** Canonical server choice (updates on both Turncoat flip AND Saboteur nudge) */
  public finalChoices: Record<string, ChoiceOption> = {};
  public nudgedPlayerIds: Set<string> = new Set();
  public turncoatSwitchedIds: Set<string> = new Set();
  public statements: StatementCard[] = [];
  public currentRoundSummary: RoundSummary | null = null;
  public matchHistory: RoundSummary[] = [];

  private usedBotPromptIndices: Set<number> = new Set();
  private callbacks: EngineCallbacks;
  private rng: () => number;

  constructor(
    roomCode: string,
    callbacks: EngineCallbacks,
    rng: () => number = Math.random
  ) {
    this.roomCode = roomCode.toUpperCase();
    this.callbacks = callbacks;
    this.rng = rng;
  }

  public getActivePlayers(): Player[] {
    return this.players.filter((p) => !p.isSpectator);
  }

  public getVoterPlayers(): Player[] {
    return this.players.filter((p) => !p.isSpectator && p.id !== this.judgeId);
  }

  public handleDisconnect(playerId: string): void {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return;
    player.isConnected = false;

    // If host disconnected and another connected human exists, reassign host
    if (player.isHost) {
      const nextHost = this.players.find(
        (p) => p.id !== playerId && !p.isBot && p.isConnected
      );
      if (nextHost) {
        player.isHost = false;
        nextHost.isHost = true;
      }
    }

    this.callbacks.onBroadcastState();
  }

  public handleMessage(senderId: string, msg: ClientToServerMessage): void {
    switch (msg.type) {
      case 'JOIN_ROOM':
        this.handleJoinRoom(
          msg.playerId || senderId,
          msg.name,
          Boolean(msg.isSpectator)
        );
        break;
      case 'TOGGLE_SPECTATOR':
        this.handleToggleSpectator(senderId, msg.isSpectator);
        break;
      case 'UPDATE_SETTINGS':
        this.handleUpdateSettings(senderId, msg.settings);
        break;
      case 'ADD_BOT':
        this.handleAddBot(senderId);
        break;
      case 'REMOVE_BOT':
        this.handleRemoveBot(senderId, msg.botId);
        break;
      case 'START_MATCH':
        this.handleStartMatch(senderId);
        break;
      case 'SUBMIT_QUESTION':
        this.handleSubmitQuestion(senderId, msg.prompt);
        break;
      case 'LOCK_IN_CHOICE':
        this.handleLockInChoice(senderId, msg.choice);
        break;
      case 'POST_STATEMENT':
        this.handlePostStatement(senderId, msg.text, msg.claimedSide);
        break;
      case 'USE_ACTIVE_POWER':
        this.handleUseActivePower(senderId, msg);
        break;
      case 'ADVANCE_TO_VERDICT':
        this.handleAdvanceToVerdict(senderId);
        break;
      case 'SUBMIT_JUDGE_VERDICT':
        this.handleSubmitJudgeVerdict(senderId, msg.choice);
        break;
      case 'TOGGLE_REVEAL_MY_VOTE':
        this.handleToggleRevealMyVote(senderId);
        break;
      case 'NEXT_ROUND':
        this.handleNextRound(senderId);
        break;
      case 'RESET_TO_LOBBY':
        this.handleResetToLobby(senderId);
        break;
    }
  }

  private handleJoinRoom(
    playerId: string,
    rawName: string,
    isSpectator: boolean
  ): void {
    const cleanName = (rawName || 'Player').trim().slice(0, 20) || 'Player';
    const existing = this.players.find((p) => p.id === playerId);

    if (existing) {
      existing.isConnected = true;
      if (this.phase === 'LOBBY') {
        existing.name = cleanName;
      }
      // Ensure at least one human is host
      const anyHost = this.players.some((p) => p.isHost && p.isConnected);
      if (!anyHost && !existing.isBot) {
        for (const p of this.players) {
          p.isHost = false;
        }
        existing.isHost = true;
      }
      this.callbacks.onBroadcastState();
      return;
    }

    const hasHumanHost = this.players.some((p) => p.isHost && !p.isBot);
    const color = AVATAR_COLORS[this.players.length % AVATAR_COLORS.length];

    // If joining mid-game, join as spectator until next match
    const joinAsSpectator =
      isSpectator || (this.phase !== 'LOBBY' && this.phase !== 'POST_GAME_SUMMARY');

    const newPlayer: Player = {
      id: playerId,
      name: cleanName,
      avatarColor: color,
      isHost: !hasHumanHost,
      isConnected: true,
      isBot: false,
      isSpectator: joinAsSpectator,
      score: 0,
    };

    this.players.push(newPlayer);
    this.callbacks.onBroadcastState();
  }

  private handleToggleSpectator(playerId: string, isSpectator: boolean): void {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return;
    if (this.phase !== 'LOBBY') {
      this.callbacks.onSendError?.(
        playerId,
        'Spectator mode can only be toggled in the Lobby.'
      );
      return;
    }
    player.isSpectator = isSpectator;
    this.callbacks.onBroadcastState();
  }

  private handleUpdateSettings(playerId: string, partial: Partial<RoomSettings>): void {
    const player = this.players.find((p) => p.id === playerId);
    if (!player?.isHost) {
      this.callbacks.onSendError?.(playerId, 'Only the Room Host can change settings.');
      return;
    }
    if (this.phase !== 'LOBBY') {
      this.callbacks.onSendError?.(
        playerId,
        'Settings can only be updated in the Lobby.'
      );
      return;
    }

    if (partial.voteRevealMode) {
      this.settings.voteRevealMode = partial.voteRevealMode;
    }
    if (
      typeof partial.rotationsCount === 'number' &&
      partial.rotationsCount >= 1 &&
      partial.rotationsCount <= 3
    ) {
      this.settings.rotationsCount = partial.rotationsCount;
    }
    if (
      typeof partial.phaseTimerSeconds === 'number' &&
      partial.phaseTimerSeconds >= 0 &&
      partial.phaseTimerSeconds <= 300
    ) {
      this.settings.phaseTimerSeconds = partial.phaseTimerSeconds;
    }
    if (Array.isArray(partial.enabledRoles) && partial.enabledRoles.length > 0) {
      this.settings.enabledRoles = partial.enabledRoles;
    }

    this.callbacks.onBroadcastState();
  }

  private handleAddBot(playerId: string): void {
    const player = this.players.find((p) => p.id === playerId);
    if (!player?.isHost) {
      this.callbacks.onSendError?.(playerId, 'Only the Host can add bots.');
      return;
    }
    if (this.phase !== 'LOBBY') {
      this.callbacks.onSendError?.(playerId, 'Bots can only be added in the Lobby.');
      return;
    }
    if (this.getActivePlayers().length >= 10) {
      this.callbacks.onSendError?.(playerId, 'Maximum of 10 active players reached.');
      return;
    }

    const existingNames = new Set(this.players.map((p) => p.name));
    const availableName =
      BOT_NAMES.find((n) => !existingNames.has(`Bot ${n}`)) ??
      `Bot #${this.players.filter((p) => p.isBot).length + 1}`;
    const botName = availableName.startsWith('Bot ')
      ? availableName
      : `Bot ${availableName}`;

    const botId = `bot_${Date.now()}_${Math.floor(this.rng() * 10000)}`;
    const color = AVATAR_COLORS[this.players.length % AVATAR_COLORS.length];

    this.players.push({
      id: botId,
      name: botName,
      avatarColor: color,
      isHost: false,
      isConnected: true,
      isBot: true,
      isSpectator: false,
      score: 0,
    });

    this.callbacks.onBroadcastState();
  }

  private handleRemoveBot(playerId: string, botId: string): void {
    const player = this.players.find((p) => p.id === playerId);
    if (!player?.isHost || this.phase !== 'LOBBY') return;
    this.players = this.players.filter((p) => !(p.id === botId && p.isBot));
    this.callbacks.onBroadcastState();
  }

  private handleStartMatch(playerId: string): void {
    const player = this.players.find((p) => p.id === playerId);
    if (!player?.isHost) {
      this.callbacks.onSendError?.(playerId, 'Only the Host can start the match.');
      return;
    }

    const activePlayers = this.getActivePlayers();
    if (activePlayers.length < 3) {
      this.callbacks.onSendError?.(
        playerId,
        'Need at least 3 active players (1 Judge + at least 2 Voters) to split the room! Add a Bot or invite friends.'
      );
      return;
    }

    // Reset scores & history
    this.players.forEach((p) => {
      p.score = 0;
    });
    this.matchHistory = [];
    this.usedBotPromptIndices.clear();

    // Build rotation order
    this.judgeRotationOrder = [];
    for (let r = 0; r < this.settings.rotationsCount; r++) {
      for (const p of activePlayers) {
        this.judgeRotationOrder.push(p.id);
      }
    }
    this.totalRounds = this.judgeRotationOrder.length;

    this.startRound(1);
  }

  private startRound(roundNum: number): void {
    this.currentRound = roundNum;
    this.judgeId =
      this.judgeRotationOrder[roundNum - 1] ?? this.getActivePlayers()[0].id;
    this.prompt = null;
    this.initialChoices = {};
    this.playerKnownChoices = {};
    this.finalChoices = {};
    this.nudgedPlayerIds.clear();
    this.turncoatSwitchedIds.clear();
    this.statements = [];
    this.currentRoundSummary = null;

    const voters = this.getVoterPlayers();
    this.roleAssignments = dealRolesForRound(
      voters.map((v) => ({ id: v.id, name: v.name })),
      this.settings.enabledRoles,
      this.rng
    );

    this.setPhase('PHASE1_JUDGE_QUESTION');

    // If the Judge is a Bot, automatically submit a question
    const judge = this.players.find((p) => p.id === this.judgeId);
    if (judge?.isBot) {
      this.runBotJudgePrompt();
    }
  }

  private setPhase(newPhase: GamePhase): void {
    this.phase = newPhase;
    if (
      this.settings.phaseTimerSeconds > 0 &&
      (newPhase === 'PHASE1_JUDGE_QUESTION' ||
        newPhase === 'PHASE2_SECRET_LOCK_IN' ||
        newPhase === 'PHASE3_PERSUASION' ||
        newPhase === 'PHASE4_JUDGE_DECISION')
    ) {
      const durationMs = this.settings.phaseTimerSeconds * 1000;
      this.phaseDeadlineMs = Date.now() + durationMs;
      const expectedRound = this.currentRound;
      const expectedPhase = newPhase;

      this.callbacks.onScheduleTimer?.(durationMs, () => {
        if (this.currentRound === expectedRound && this.phase === expectedPhase) {
          this.handlePhaseTimeout();
        }
      });
    } else {
      this.phaseDeadlineMs = null;
    }

    this.callbacks.onBroadcastState();
  }

  public handlePhaseTimeout(): void {
    if (this.phase === 'PHASE1_JUDGE_QUESTION') {
      // Fallback question if Judge ran out of time
      this.runBotJudgePrompt();
    } else if (this.phase === 'PHASE2_SECRET_LOCK_IN') {
      // Lock in random choices for any voter who hasn't locked in yet
      for (const voter of this.getVoterPlayers()) {
        if (!this.initialChoices[voter.id]) {
          const fallback: ChoiceOption = this.rng() < 0.5 ? 'A' : 'B';
          this.initialChoices[voter.id] = fallback;
          this.playerKnownChoices[voter.id] = fallback;
          this.finalChoices[voter.id] = fallback;
        }
      }
      this.enterPersuasionPhase();
    } else if (this.phase === 'PHASE3_PERSUASION') {
      this.setPhase('PHASE4_JUDGE_DECISION');
      const judge = this.players.find((p) => p.id === this.judgeId);
      if (judge?.isBot) {
        this.runBotJudgeVerdict();
      }
    } else if (this.phase === 'PHASE4_JUDGE_DECISION') {
      this.runBotJudgeVerdict();
    }
  }

  private runBotJudgePrompt(): void {
    if (!this.judgeId) return;
    let idx = Math.floor(this.rng() * BOT_SAMPLE_PROMPTS.length);
    for (let i = 0; i < BOT_SAMPLE_PROMPTS.length; i++) {
      const candidate = (idx + i) % BOT_SAMPLE_PROMPTS.length;
      if (!this.usedBotPromptIndices.has(candidate)) {
        idx = candidate;
        break;
      }
    }
    this.usedBotPromptIndices.add(idx);
    const chosenPrompt = BOT_SAMPLE_PROMPTS[idx];
    this.handleSubmitQuestion(this.judgeId, chosenPrompt);
  }

  private handleSubmitQuestion(playerId: string, prompt: QuestionPrompt): void {
    if (this.phase !== 'PHASE1_JUDGE_QUESTION') return;
    if (playerId !== this.judgeId) {
      this.callbacks.onSendError?.(
        playerId,
        'Only the current Judge can submit the question.'
      );
      return;
    }

    const question = (prompt.question || '').trim().slice(0, 240);
    const optionA = (prompt.optionA || '').trim().slice(0, 120);
    const optionB = (prompt.optionB || '').trim().slice(0, 120);

    if (!question || !optionA || !optionB) {
      this.callbacks.onSendError?.(
        playerId,
        'Please fill out the question and both Option A and Option B.'
      );
      return;
    }

    this.prompt = { question, optionA, optionB };
    this.setPhase('PHASE2_SECRET_LOCK_IN');

    // Have any Bot voters lock in their choices immediately
    for (const voter of this.getVoterPlayers()) {
      if (voter.isBot) {
        const botChoice: ChoiceOption = this.rng() < 0.5 ? 'A' : 'B';
        this.initialChoices[voter.id] = botChoice;
        this.playerKnownChoices[voter.id] = botChoice;
        this.finalChoices[voter.id] = botChoice;
      }
    }

    this.checkAllVotersLockedIn();
  }

  private handleLockInChoice(playerId: string, choice: ChoiceOption): void {
    if (this.phase !== 'PHASE2_SECRET_LOCK_IN') return;
    if (playerId === this.judgeId) {
      this.callbacks.onSendError?.(
        playerId,
        'The Judge does not lock in during Phase 2.'
      );
      return;
    }

    const voter = this.getVoterPlayers().find((v) => v.id === playerId);
    if (!voter) return;
    if (choice !== 'A' && choice !== 'B') return;

    this.initialChoices[playerId] = choice;
    this.playerKnownChoices[playerId] = choice;
    this.finalChoices[playerId] = choice;

    this.checkAllVotersLockedIn();
  }

  private checkAllVotersLockedIn(): void {
    const voters = this.getVoterPlayers();
    const allLocked = voters.every((v) => Boolean(this.initialChoices[v.id]));
    if (allLocked && voters.length > 0) {
      this.enterPersuasionPhase();
    } else {
      this.callbacks.onBroadcastState();
    }
  }

  private enterPersuasionPhase(): void {
    this.setPhase('PHASE3_PERSUASION');

    // Have bots post persuasion statements and occasionally use active powers
    if (!this.prompt) return;
    const voters = this.getVoterPlayers();

    for (const voter of voters) {
      if (!voter.isBot) continue;
      const assignment = this.roleAssignments[voter.id];
      const locked = this.finalChoices[voter.id] ?? 'A';

      if (assignment) {
        const stmt = generateBotStatement(
          assignment.roleId,
          locked,
          this.prompt,
          this.rng
        );
        this.addStatementCard({
          displayedAuthorId: voter.id,
          displayedAuthorName: voter.name,
          displayedAvatarColor: voter.avatarColor,
          trueAuthorId: voter.id,
          trueAuthorName: voter.name,
          isForged: false,
          isAnonymous: false,
          text: stmt.text,
          claimedSide: stmt.claimedSide,
        });

        // Bot active power usage
        if (!assignment.hasUsedPower) {
          if (assignment.roleId === 'turncoat' && this.rng() < 0.6) {
            this.handleUseActivePower(voter.id, {
              type: 'USE_ACTIVE_POWER',
              powerType: 'LATE_FLIP',
            });
          } else if (assignment.roleId === 'saboteur' && voters.length > 1) {
            const others = voters.filter((v) => v.id !== voter.id);
            const target = others[Math.floor(this.rng() * others.length)];
            this.handleUseActivePower(voter.id, {
              type: 'USE_ACTIVE_POWER',
              powerType: 'NUDGE',
              targetPlayerId: target.id,
            });
          } else if (assignment.roleId === 'wiretapper' && voters.length > 1) {
            const others = voters.filter((v) => v.id !== voter.id);
            const target = others[Math.floor(this.rng() * others.length)];
            this.handleUseActivePower(voter.id, {
              type: 'USE_ACTIVE_POWER',
              powerType: 'PEEK',
              targetPlayerId: target.id,
            });
          } else if (assignment.roleId === 'forger') {
            this.handleUseActivePower(voter.id, {
              type: 'USE_ACTIVE_POWER',
              powerType: 'PLANT_EVIDENCE',
              forgedAsPlayerId: 'anonymous',
              forgedClaimedSide: locked === 'A' ? 'B' : 'A',
              forgedText: `Overheard in the lobby: almost everyone piled into Option ${locked === 'A' ? 'B' : 'A'}!`,
            });
          }
        }
      }
    }

    this.callbacks.onBroadcastState();
  }

  private addStatementCard(cardData: Omit<StatementCard, 'id' | 'createdAt'>): void {
    this.statements.push({
      ...cardData,
      id: `stmt_${Date.now()}_${this.statements.length}_${Math.floor(this.rng() * 1000)}`,
      createdAt: Date.now(),
    });
  }

  private handlePostStatement(
    playerId: string,
    rawText: string,
    claimedSide: ChoiceOption | 'NEUTRAL'
  ): void {
    if (this.phase !== 'PHASE3_PERSUASION') return;
    const player = this.getActivePlayers().find((p) => p.id === playerId);
    if (!player || player.id === this.judgeId) {
      this.callbacks.onSendError?.(
        playerId,
        'Only non-Judge voters can post persuasion cards.'
      );
      return;
    }

    const text = (rawText || '').trim().slice(0, 220);
    if (!text) return;

    const myRegularCount = this.statements.filter(
      (s) => s.trueAuthorId === playerId && !s.isForged
    ).length;

    if (myRegularCount >= 3) {
      this.callbacks.onSendError?.(
        playerId,
        'You have reached the maximum of 3 signed statements this round.'
      );
      return;
    }

    this.addStatementCard({
      displayedAuthorId: player.id,
      displayedAuthorName: player.name,
      displayedAvatarColor: player.avatarColor,
      trueAuthorId: player.id,
      trueAuthorName: player.name,
      isForged: false,
      isAnonymous: false,
      text,
      claimedSide,
    });

    this.callbacks.onBroadcastState();
  }

  private handleUseActivePower(
    playerId: string,
    msg: Extract<ClientToServerMessage, { type: 'USE_ACTIVE_POWER' }>
  ): void {
    if (this.phase !== 'PHASE3_PERSUASION') {
      this.callbacks.onSendError?.(
        playerId,
        'Active powers can only be used during the Persuasion phase.'
      );
      return;
    }

    const player = this.getVoterPlayers().find((v) => v.id === playerId);
    const assignment = this.roleAssignments[playerId];
    if (!player || !assignment) return;

    if (assignment.hasUsedPower) {
      this.callbacks.onSendError?.(
        playerId,
        'You have already used your active power this round.'
      );
      return;
    }

    const roleDef = getRoleDefinition(assignment.roleId);
    if (!roleDef.activePower || roleDef.activePower.type !== msg.powerType) {
      this.callbacks.onSendError?.(
        playerId,
        'Your current role does not have this active power.'
      );
      return;
    }

    const PowerHandlers: Record<ActivePowerType, () => boolean> = {
      PEEK: () => {
        const target = this.getVoterPlayers().find(
          (v) => v.id === msg.targetPlayerId && v.id !== playerId
        );
        if (!target) {
          this.callbacks.onSendError?.(playerId, 'Select a valid player to wiretap.');
          return false;
        }
        const peeked = this.finalChoices[target.id] ?? 'A';
        assignment.peekedChoice = peeked;
        assignment.powerTargetId = target.id;
        assignment.powerTargetName = target.name;
        assignment.powerLogSummary = `Wiretapped ${target.name}`;
        this.callbacks.onSendToast?.(
          playerId,
          `Wiretap Intel: ${target.name} currently has Option ${peeked} locked in!`,
          'info'
        );
        return true;
      },

      PLANT_EVIDENCE: () => {
        const forgedText = (msg.forgedText || '').trim().slice(0, 220);
        if (!forgedText) {
          this.callbacks.onSendError?.(playerId, 'Enter text for your forged card.');
          return false;
        }
        const claimedSide = msg.forgedClaimedSide ?? 'NEUTRAL';
        const impersonated =
          msg.forgedAsPlayerId && msg.forgedAsPlayerId !== 'anonymous'
            ? this.getVoterPlayers().find(
                (v) => v.id === msg.forgedAsPlayerId && v.id !== playerId
              )
            : undefined;

        if (impersonated) {
          this.addStatementCard({
            displayedAuthorId: impersonated.id,
            displayedAuthorName: impersonated.name,
            displayedAvatarColor: impersonated.avatarColor,
            trueAuthorId: player.id,
            trueAuthorName: player.name,
            isForged: true,
            isAnonymous: false,
            text: forgedText,
            claimedSide,
          });
          assignment.powerTargetId = impersonated.id;
          assignment.powerTargetName = impersonated.name;
          assignment.powerLogSummary = `Forged a statement card under ${impersonated.name}'s name`;
        } else {
          this.addStatementCard({
            displayedAuthorId: 'anonymous',
            displayedAuthorName: 'Anonymous Rumor',
            displayedAvatarColor: '#64748b',
            trueAuthorId: player.id,
            trueAuthorName: player.name,
            isForged: true,
            isAnonymous: true,
            text: forgedText,
            claimedSide,
          });
          assignment.powerLogSummary = 'Planted an Anonymous Rumor card';
        }
        this.callbacks.onSendToast?.(
          playerId,
          'Forged statement planted on the board!',
          'success'
        );
        return true;
      },

      LATE_FLIP: () => {
        const currentKnown = this.playerKnownChoices[playerId] ?? 'A';
        const flippedKnown: ChoiceOption = currentKnown === 'A' ? 'B' : 'A';
        this.playerKnownChoices[playerId] = flippedKnown;

        const currentFinal = this.finalChoices[playerId] ?? 'A';
        const flippedFinal: ChoiceOption = currentFinal === 'A' ? 'B' : 'A';
        this.finalChoices[playerId] = flippedFinal;

        this.turncoatSwitchedIds.add(playerId);
        assignment.powerLogSummary = 'Used Late Flip to secretly switch sides';
        this.callbacks.onSendToast?.(
          playerId,
          `Late Flip activated! Your locked choice is now Option ${flippedKnown}.`,
          'success'
        );
        return true;
      },

      NUDGE: () => {
        const target = this.getVoterPlayers().find(
          (v) => v.id === msg.targetPlayerId && v.id !== playerId
        );
        if (!target) {
          this.callbacks.onSendError?.(
            playerId,
            'Select another voter to secretly nudge.'
          );
          return false;
        }
        const currentTargetChoice = this.finalChoices[target.id] ?? 'A';
        this.finalChoices[target.id] = currentTargetChoice === 'A' ? 'B' : 'A';
        this.nudgedPlayerIds.add(target.id);
        assignment.powerTargetId = target.id;
        assignment.powerTargetName = target.name;
        assignment.powerLogSummary = `Secretly nudged ${target.name}'s locked vote`;
        this.callbacks.onSendToast?.(
          playerId,
          `Secretly flipped ${target.name}'s vote! They won't know until the Reveal.`,
          'warning'
        );
        return true;
      },
    };

    const succeeded = PowerHandlers[msg.powerType]();
    if (succeeded) {
      assignment.hasUsedPower = true;
      this.callbacks.onBroadcastState();
    }
  }

  private handleAdvanceToVerdict(playerId: string): void {
    if (this.phase !== 'PHASE3_PERSUASION') return;
    const caller = this.players.find((p) => p.id === playerId);
    if (playerId !== this.judgeId && !caller?.isHost) {
      this.callbacks.onSendError?.(
        playerId,
        'Only the Judge or Host can advance to the verdict.'
      );
      return;
    }

    this.setPhase('PHASE4_JUDGE_DECISION');

    const judge = this.players.find((p) => p.id === this.judgeId);
    if (judge?.isBot) {
      this.runBotJudgeVerdict();
    }
  }

  private runBotJudgeVerdict(): void {
    if (!this.judgeId) return;
    // Bot Judge looks at claimed sides on the board and tries to pick the smaller claimed group
    let claimedA = 0;
    let claimedB = 0;
    for (const s of this.statements) {
      if (s.claimedSide === 'A') claimedA++;
      if (s.claimedSide === 'B') claimedB++;
    }
    let choice: ChoiceOption;
    if (claimedA > 0 && claimedB === 0) choice = 'A';
    else if (claimedB > 0 && claimedA === 0) choice = 'B';
    else if (claimedA < claimedB) choice = 'A';
    else if (claimedB < claimedA) choice = 'B';
    else choice = this.rng() < 0.5 ? 'A' : 'B';

    this.handleSubmitJudgeVerdict(this.judgeId, choice);
  }

  private handleSubmitJudgeVerdict(playerId: string, choice: ChoiceOption): void {
    if (this.phase !== 'PHASE3_PERSUASION' && this.phase !== 'PHASE4_JUDGE_DECISION') {
      return;
    }
    if (playerId !== this.judgeId) {
      this.callbacks.onSendError?.(
        playerId,
        'Only the Judge can make the final decision.'
      );
      return;
    }
    if (choice !== 'A' && choice !== 'B') return;
    if (!this.prompt) return;

    const judge = this.players.find((p) => p.id === this.judgeId);
    if (!judge) return;

    const voters = this.getVoterPlayers();
    const summary = calculateRoundSummary({
      roundNumber: this.currentRound,
      judge,
      voters,
      prompt: this.prompt,
      judgeChoice: choice,
      initialChoices: this.initialChoices,
      finalChoices: this.finalChoices,
      roleAssignments: this.roleAssignments,
      nudgedPlayerIds: this.nudgedPlayerIds,
      turncoatSwitchedIds: this.turncoatSwitchedIds,
    });

    // Apply round points to cumulative scores
    for (const breakdown of summary.breakdowns) {
      const p = this.players.find((pl) => pl.id === breakdown.playerId);
      if (p) {
        p.score += breakdown.totalRoundPoints;
      }
      // Bots optionally reveal their votes in player_choice mode
      if (p?.isBot && this.settings.voteRevealMode === 'player_choice') {
        breakdown.voluntarilyRevealedVote = this.rng() < 0.7;
      }
    }

    this.currentRoundSummary = summary;
    this.matchHistory.push(summary);
    this.setPhase('PHASE5_REVEAL_AND_SCORE');
  }

  private handleToggleRevealMyVote(playerId: string): void {
    if (this.phase !== 'PHASE5_REVEAL_AND_SCORE' || !this.currentRoundSummary) {
      return;
    }
    const entry = this.currentRoundSummary.breakdowns.find(
      (b) => b.playerId === playerId && !b.isJudge
    );
    if (!entry) return;

    entry.voluntarilyRevealedVote = !entry.voluntarilyRevealedVote;
    this.callbacks.onBroadcastState();
  }

  private handleNextRound(playerId: string): void {
    if (this.phase !== 'PHASE5_REVEAL_AND_SCORE') return;
    const caller = this.players.find((p) => p.id === playerId);
    if (playerId !== this.judgeId && !caller?.isHost) {
      this.callbacks.onSendError?.(
        playerId,
        'Only the Judge or Host can advance to the next round.'
      );
      return;
    }

    if (this.currentRound < this.totalRounds) {
      this.startRound(this.currentRound + 1);
    } else {
      this.setPhase('POST_GAME_SUMMARY');
    }
  }

  private handleResetToLobby(playerId: string): void {
    const caller = this.players.find((p) => p.id === playerId);
    if (!caller?.isHost) {
      this.callbacks.onSendError?.(playerId, 'Only the Host can return to the Lobby.');
      return;
    }

    this.currentRound = 0;
    this.totalRounds = 0;
    this.judgeId = null;
    this.prompt = null;
    this.roleAssignments = {};
    this.initialChoices = {};
    this.playerKnownChoices = {};
    this.finalChoices = {};
    this.statements = [];
    this.currentRoundSummary = null;
    this.setPhase('LOBBY');
  }

  /**
   * Produces a privacy-filtered projection of the room state for `viewerId`.
   * Never leaks other players' hidden roles, locked choices,Saboteur nudges, or Forger identities prior to Phase 5.
   */
  public getStateForPlayer(viewerId: string): ClientRoomState {
    const isRevealOrPost =
      this.phase === 'PHASE5_REVEAL_AND_SCORE' || this.phase === 'POST_GAME_SUMMARY';
    const isFogOfWar =
      this.settings.voteRevealMode === 'fog_of_war' &&
      this.phase !== 'POST_GAME_SUMMARY';

    const clientPlayers: ClientPlayerView[] = this.players.map((p) => {
      const hasLockedIn = Boolean(this.initialChoices[p.id]);
      let revealedChoice: ChoiceOption | undefined;

      if (this.phase === 'POST_GAME_SUMMARY') {
        revealedChoice = this.finalChoices[p.id];
      } else if (this.phase === 'PHASE5_REVEAL_AND_SCORE') {
        const bd = this.currentRoundSummary?.breakdowns.find(
          (b) => b.playerId === p.id
        );
        if (
          this.settings.voteRevealMode === 'full_reveal' ||
          p.id === viewerId ||
          (this.settings.voteRevealMode === 'player_choice' &&
            bd?.voluntarilyRevealedVote)
        ) {
          revealedChoice = this.finalChoices[p.id];
        }
      } else if (p.id === viewerId && this.playerKnownChoices[viewerId]) {
        revealedChoice = this.playerKnownChoices[viewerId];
      }

      return {
        id: p.id,
        name: p.name,
        avatarColor: p.avatarColor,
        isHost: p.isHost,
        isConnected: p.isConnected,
        isBot: p.isBot,
        isSpectator: p.isSpectator,
        score: isFogOfWar ? 0 : p.score,
        hasLockedIn,
        revealedChoice,
      };
    });

    // Mask Forger's identity on statement cards until Phase 5 Reveal!
    const filteredStatements: StatementCard[] = this.statements.map((s) => {
      if (isRevealOrPost || s.trueAuthorId === viewerId) {
        return { ...s };
      }
      return {
        ...s,
        trueAuthorId: s.displayedAuthorId,
        trueAuthorName: s.displayedAuthorName,
        isForged: false,
      };
    });

    // Mask round summary fields according to VoteRevealMode in Phase 5
    let filteredSummary: RoundSummary | null = null;
    if (this.currentRoundSummary) {
      filteredSummary = {
        ...this.currentRoundSummary,
        breakdowns: this.currentRoundSummary.breakdowns.map((b) => {
          const isMe = b.playerId === viewerId;
          if (this.phase === 'POST_GAME_SUMMARY' || b.isJudge) {
            return { ...b };
          }
          if (this.settings.voteRevealMode === 'fog_of_war' && !isMe) {
            return {
              playerId: b.playerId,
              playerName: b.playerName,
              isJudge: false,
              voluntarilyRevealedVote: false,
              basePoints: 0,
              bonusPoints: 0,
              totalRoundPoints: 0,
            };
          }
          if (
            this.settings.voteRevealMode === 'player_choice' &&
            !isMe &&
            !b.voluntarilyRevealedVote
          ) {
            return {
              ...b,
              initialChoice: undefined,
              finalChoice: undefined,
            };
          }
          return { ...b };
        }),
      };
    }

    return {
      roomCode: this.roomCode,
      phase: this.phase,
      settings: { ...this.settings },
      players: clientPlayers,
      myPlayerId: viewerId,
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      judgeId: this.judgeId,
      prompt: this.prompt ? { ...this.prompt } : null,
      phaseDeadlineMs: this.phaseDeadlineMs,
      statements: filteredStatements,
      myRole: this.roleAssignments[viewerId]
        ? { ...this.roleAssignments[viewerId] }
        : null,
      myLockedChoice:
        this.phase === 'PHASE5_REVEAL_AND_SCORE' || this.phase === 'POST_GAME_SUMMARY'
          ? (this.finalChoices[viewerId] ?? null)
          : (this.playerKnownChoices[viewerId] ?? null),
      myInitialChoice: this.initialChoices[viewerId] ?? null,
      currentRoundSummary: filteredSummary,
      matchHistory: this.phase === 'POST_GAME_SUMMARY' ? this.matchHistory : [],
    };
  }
}

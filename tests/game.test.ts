import { describe, expect, it } from 'vitest';
import { RoomGameEngine } from '../shared/engine';
import { dealRolesForRound } from '../shared/roles';
import { calculateJudgePoints, calculateRoundSummary } from '../shared/scoring';
import type { Player, PlayerRoleAssignment } from '../shared/types';

function makePlayer(id: string, name: string): Player {
  return {
    id,
    name,
    avatarColor: '#6366f1',
    isHost: id === 'p1',
    isConnected: true,
    isBot: false,
    isSpectator: false,
    score: 0,
  };
}

describe('Judge & Role Scoring Engine', () => {
  it('calculates Judge non-zero minority points accurately', () => {
    // N = 5 voters
    expect(calculateJudgePoints(5, 0)).toBe(0); // Empty side -> 0 pts
    expect(calculateJudgePoints(5, 5)).toBe(0); // Unanimous side -> 0 pts
    expect(calculateJudgePoints(5, 1)).toBe(4); // k = 1 -> N - k = 4 pts
    expect(calculateJudgePoints(5, 2)).toBe(3); // k = 2 -> N - k = 3 pts
    expect(calculateJudgePoints(5, 4)).toBe(1); // k = 4 -> N - k = 1 pt
  });

  it('awards Baiter (+3) when Judge picks an empty side (k = 0)', () => {
    const judge = makePlayer('j', 'Judge');
    const voters = [makePlayer('v1', 'Alice'), makePlayer('v2', 'Bob')];
    const roles: Record<string, PlayerRoleAssignment> = {
      v1: { playerId: 'v1', roleId: 'baiter', hasUsedPower: false },
      v2: { playerId: 'v2', roleId: 'double_agent', hasUsedPower: false },
    };

    const summary = calculateRoundSummary({
      roundNumber: 1,
      judge,
      voters,
      prompt: { question: 'Q', optionA: 'A', optionB: 'B' },
      judgeChoice: 'B', // Nobody picked B (k = 0)
      initialChoices: { v1: 'A', v2: 'A' },
      finalChoices: { v1: 'A', v2: 'A' },
      roleAssignments: roles,
      nudgedPlayerIds: new Set(),
      turncoatSwitchedIds: new Set(),
    });

    const jBd = summary.breakdowns.find((b) => b.playerId === 'j');
    const v1Bd = summary.breakdowns.find((b) => b.playerId === 'v1');
    const v2Bd = summary.breakdowns.find((b) => b.playerId === 'v2');

    expect(jBd?.totalRoundPoints).toBe(0);
    // Alice (Baiter) got 0 base + 3 bonus = 3
    expect(v1Bd?.basePoints).toBe(0);
    expect(v1Bd?.bonusPoints).toBe(3);
    expect(v1Bd?.totalRoundPoints).toBe(3);
    // Bob (Double Agent) wanted Judge to pick opposite of A (Judge picked B) -> +2 pts
    expect(v2Bd?.basePoints).toBe(0);
    expect(v2Bd?.bonusPoints).toBe(2);
    expect(v2Bd?.totalRoundPoints).toBe(2);
  });

  it('awards Lone Wolf (+3), Union Boss (+2), Accomplice (+2), and Saboteur (+2)', () => {
    const judge = makePlayer('j', 'Judge');
    const voters = [
      makePlayer('v1', 'Wolf'),
      makePlayer('v2', 'Boss'),
      makePlayer('v3', 'Partner1'),
      makePlayer('v4', 'Sab'),
    ];

    // Case 1: Judge picks A where only Wolf (v1) is present (k = 1, N = 4 -> Judge gets 3 pts)
    const roles1: Record<string, PlayerRoleAssignment> = {
      v1: { playerId: 'v1', roleId: 'lone_wolf', hasUsedPower: false },
      v2: { playerId: 'v2', roleId: 'union_boss', hasUsedPower: false },
      v3: {
        playerId: 'v3',
        roleId: 'accomplice',
        accompliceTargetId: 'v4',
        accompliceTargetName: 'Sab',
        hasUsedPower: false,
      },
      v4: { playerId: 'v4', roleId: 'saboteur', hasUsedPower: false },
    };

    const summary1 = calculateRoundSummary({
      roundNumber: 1,
      judge,
      voters,
      prompt: { question: 'Q', optionA: 'A', optionB: 'B' },
      judgeChoice: 'A',
      initialChoices: { v1: 'A', v2: 'B', v3: 'B', v4: 'B' },
      finalChoices: { v1: 'A', v2: 'B', v3: 'B', v4: 'B' },
      roleAssignments: roles1,
      nudgedPlayerIds: new Set(),
      turncoatSwitchedIds: new Set(),
    });

    // Judge gets 4 - 1 = 3 pts
    expect(summary1.breakdowns.find((b) => b.playerId === 'j')?.totalRoundPoints).toBe(
      3
    );
    // Wolf gets 2 base + 3 Lone Wolf = 5 pts
    expect(summary1.breakdowns.find((b) => b.playerId === 'v1')?.totalRoundPoints).toBe(
      5
    );
    // Accomplice (v3) matched B with Sab (v4) -> 0 base + 2 bonus = 2 pts
    expect(summary1.breakdowns.find((b) => b.playerId === 'v3')?.totalRoundPoints).toBe(
      2
    );

    // Case 2: Judge picks B where 3 of 4 voters are present (k = 3 > 4/2, Judge gets 4 - 3 = 1 pt)
    const summary2 = calculateRoundSummary({
      roundNumber: 2,
      judge,
      voters,
      prompt: { question: 'Q', optionA: 'A', optionB: 'B' },
      judgeChoice: 'B',
      initialChoices: { v1: 'A', v2: 'B', v3: 'B', v4: 'B' },
      finalChoices: { v1: 'A', v2: 'B', v3: 'B', v4: 'B' },
      roleAssignments: roles1,
      nudgedPlayerIds: new Set(),
      turncoatSwitchedIds: new Set(),
    });

    // Judge gets 1 pt -> Saboteur (v4) triggers bonus (+2) + base (+2) = 4 pts!
    expect(summary2.breakdowns.find((b) => b.playerId === 'j')?.totalRoundPoints).toBe(
      1
    );
    expect(summary2.breakdowns.find((b) => b.playerId === 'v4')?.totalRoundPoints).toBe(
      4
    );
    // Union Boss (v2) has k = 3 > 2 -> 2 base + 2 bonus = 4 pts!
    expect(summary2.breakdowns.find((b) => b.playerId === 'v2')?.totalRoundPoints).toBe(
      4
    );
  });

  it('deals valid Accomplice partners and respects enabled role pools', () => {
    const voters = [
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
      { id: 'p3', name: 'Charlie' },
    ];
    const dealt = dealRolesForRound(voters, ['accomplice']);
    for (const v of voters) {
      expect(dealt[v.id].roleId).toBe('accomplice');
      expect(dealt[v.id].accompliceTargetId).toBeDefined();
      expect(dealt[v.id].accompliceTargetId).not.toBe(v.id);
    }
  });
});

describe('RoomGameEngine Full Match State Machine & Privacy Guarantees', () => {
  it('completes a full 3-player match with active powers, privacy masking, and reveal modes', () => {
    const engine = new RoomGameEngine('TEST', {
      onBroadcastState: () => {},
    });

    // 3 players join
    engine.handleMessage('p1', { type: 'JOIN_ROOM', playerId: 'p1', name: 'Alice' });
    engine.handleMessage('p2', { type: 'JOIN_ROOM', playerId: 'p2', name: 'Bob' });
    engine.handleMessage('p3', { type: 'JOIN_ROOM', playerId: 'p3', name: 'Charlie' });

    expect(engine.players).toHaveLength(3);
    expect(engine.players[0].isHost).toBe(true);

    // Start match (1 rotation = 3 rounds)
    engine.handleMessage('p1', { type: 'START_MATCH' });
    expect(engine.phase).toBe('PHASE1_JUDGE_QUESTION');
    expect(engine.judgeId).toBe('p1');
    expect(engine.totalRounds).toBe(3);

    // Override roles for Round 1 to test Forger, Saboteur, Wiretapper, Turncoat
    engine.roleAssignments.p2 = {
      playerId: 'p2',
      roleId: 'forger',
      hasUsedPower: false,
    };
    engine.roleAssignments.p3 = {
      playerId: 'p3',
      roleId: 'saboteur',
      hasUsedPower: false,
    };

    // Privacy check: p1 (Judge) cannot see p2's role
    const p1ViewPhase1 = engine.getStateForPlayer('p1');
    expect(p1ViewPhase1.myRole).toBeNull();
    expect(engine.getStateForPlayer('p2').myRole?.roleId).toBe('forger');

    // Phase 1: Judge p1 submits question
    engine.handleMessage('p1', {
      type: 'SUBMIT_QUESTION',
      prompt: {
        question: 'Best weekend trip?',
        optionA: 'Cabin in the woods',
        optionB: 'Beach resort',
      },
    });
    expect(engine.phase).toBe('PHASE2_SECRET_LOCK_IN');

    // Phase 2: Voters p2 and p3 lock in choices
    engine.handleMessage('p2', { type: 'LOCK_IN_CHOICE', choice: 'A' });
    expect(engine.phase).toBe('PHASE2_SECRET_LOCK_IN');

    // Verify p1 (Judge) sees p2 hasLockedIn=true, but revealedChoice is undefined!
    const p1MidLock = engine.getStateForPlayer('p1');
    const p2InP1View = p1MidLock.players.find((p) => p.id === 'p2');
    expect(p2InP1View?.hasLockedIn).toBe(true);
    expect(p2InP1View?.revealedChoice).toBeUndefined();

    engine.handleMessage('p3', { type: 'LOCK_IN_CHOICE', choice: 'B' });
    // All voters locked -> auto advances to PHASE3_PERSUASION!
    expect(engine.phase).toBe('PHASE3_PERSUASION');

    // Phase 3: p2 (Forger) plants a forged statement impersonating p3 (Charlie)!
    engine.handleMessage('p2', {
      type: 'USE_ACTIVE_POWER',
      powerType: 'PLANT_EVIDENCE',
      forgedAsPlayerId: 'p3',
      forgedClaimedSide: 'A',
      forgedText: 'I definitely locked in Option A!',
    });

    // Verify privacy masking on the forged card during Phase 3:
    // To p1 (Judge) and p3 (Charlie), the card looks like a normal card from Charlie (`isForged: false`, `trueAuthorId: 'p3'`)!
    const p1PersuasionView = engine.getStateForPlayer('p1');
    expect(p1PersuasionView.statements).toHaveLength(1);
    expect(p1PersuasionView.statements[0].displayedAuthorName).toBe('Charlie');
    expect(p1PersuasionView.statements[0].isForged).toBe(false);
    expect(p1PersuasionView.statements[0].trueAuthorName).toBe('Charlie');

    // Phase 3: p3 (Saboteur) secretly nudges p2's vote from A -> B!
    engine.handleMessage('p3', {
      type: 'USE_ACTIVE_POWER',
      powerType: 'NUDGE',
      targetPlayerId: 'p2',
    });

    // CRITICAL PRIVACY CHECK: p2 must still see `myLockedChoice === 'A'` during Phase 3 so they don't know they were nudged!
    expect(engine.getStateForPlayer('p2').myLockedChoice).toBe('A');
    // Meanwhile canonical server finalChoices['p2'] is now 'B'!
    expect(engine.finalChoices.p2).toBe('B');

    // Phase 4 / Verdict: Judge p1 picks Option A (which now has 0 players because p2 was nudged to B and p3 is on B!)
    engine.handleMessage('p1', { type: 'SUBMIT_JUDGE_VERDICT', choice: 'A' });
    expect(engine.phase).toBe('PHASE5_REVEAL_AND_SCORE');

    // In Phase 5, the Forger card is unmasked to everyone!
    const p1RevealView = engine.getStateForPlayer('p1');
    expect(p1RevealView.statements[0].isForged).toBe(true);
    expect(p1RevealView.statements[0].trueAuthorName).toBe('Bob');

    // And in Phase 5, p2 sees their finalChoice was 'B' (nudged from 'A')!
    expect(engine.getStateForPlayer('p2').myLockedChoice).toBe('B');

    // Test player_choice vote reveal toggle
    expect(
      engine
        .getStateForPlayer('p1')
        .currentRoundSummary?.breakdowns.find((b) => b.playerId === 'p2')?.finalChoice
    ).toBeUndefined();

    engine.handleMessage('p2', { type: 'TOGGLE_REVEAL_MY_VOTE' });
    expect(
      engine
        .getStateForPlayer('p1')
        .currentRoundSummary?.breakdowns.find((b) => b.playerId === 'p2')?.finalChoice
    ).toBe('B');
  });

  it('supports AI Bots playing full rounds automatically', () => {
    const engine = new RoomGameEngine('BOTS', {
      onBroadcastState: () => {},
    });

    engine.handleMessage('host', {
      type: 'JOIN_ROOM',
      playerId: 'host',
      name: 'HostHuman',
    });
    engine.handleMessage('host', { type: 'ADD_BOT' });
    engine.handleMessage('host', { type: 'ADD_BOT' });

    expect(engine.getActivePlayers()).toHaveLength(3);

    engine.handleMessage('host', { type: 'START_MATCH' });
    expect(engine.phase).toBe('PHASE1_JUDGE_QUESTION');

    // Round 1: HostHuman is Judge. Submit question -> Bot voters auto lock-in AND post persuasion cards!
    engine.handleMessage('host', {
      type: 'SUBMIT_QUESTION',
      prompt: {
        question: 'Coffee or Tea?',
        optionA: 'Coffee',
        optionB: 'Tea',
      },
    });

    // Since both voters are Bots, the game automatically locked in their votes and entered PHASE3_PERSUASION!
    expect(engine.phase).toBe('PHASE3_PERSUASION');
    expect(engine.statements.length).toBeGreaterThanOrEqual(2);

    // HostJudge submits verdict -> Phase 5
    engine.handleMessage('host', {
      type: 'SUBMIT_JUDGE_VERDICT',
      choice: 'A',
    });
    expect(engine.phase).toBe('PHASE5_REVEAL_AND_SCORE');

    // Advance to Round 2 where Bot 1 is the Judge!
    engine.handleMessage('host', { type: 'NEXT_ROUND' });
    // Bot Judge automatically submits a question -> transitions straight to PHASE2_SECRET_LOCK_IN!
    expect(engine.phase).toBe('PHASE2_SECRET_LOCK_IN');
    expect(engine.prompt).not.toBeNull();

    // HostHuman locks in 'B' -> enters PHASE3_PERSUASION
    engine.handleMessage('host', { type: 'LOCK_IN_CHOICE', choice: 'B' });
    expect(engine.phase).toBe('PHASE3_PERSUASION');

    // Host advances to verdict -> Bot Judge automatically submits verdict -> enters PHASE5_REVEAL_AND_SCORE!
    engine.handleMessage('host', { type: 'ADVANCE_TO_VERDICT' });
    expect(engine.phase).toBe('PHASE5_REVEAL_AND_SCORE');
  });

  it('tests Wiretapper PEEK, Turncoat LATE_FLIP, Fog of War concealment, and Full Reveal mode', () => {
    const toasts: string[] = [];
    const engine = new RoomGameEngine('EDGE', {
      onBroadcastState: () => {},
      onSendToast: (_pid, msg) => toasts.push(msg),
    });

    engine.handleMessage('p1', { type: 'JOIN_ROOM', playerId: 'p1', name: 'JudgeP1' });
    engine.handleMessage('p2', { type: 'JOIN_ROOM', playerId: 'p2', name: 'WireP2' });
    engine.handleMessage('p3', { type: 'JOIN_ROOM', playerId: 'p3', name: 'TurnP3' });

    // Configure fog_of_war mode first
    engine.handleMessage('p1', {
      type: 'UPDATE_SETTINGS',
      settings: { voteRevealMode: 'fog_of_war', rotationsCount: 1 },
    });

    engine.handleMessage('p1', { type: 'START_MATCH' });
    engine.roleAssignments.p2 = {
      playerId: 'p2',
      roleId: 'wiretapper',
      hasUsedPower: false,
    };
    engine.roleAssignments.p3 = {
      playerId: 'p3',
      roleId: 'turncoat',
      hasUsedPower: false,
    };

    engine.handleMessage('p1', {
      type: 'SUBMIT_QUESTION',
      prompt: { question: 'Test?', optionA: 'Opt A', optionB: 'Opt B' },
    });

    engine.handleMessage('p2', { type: 'LOCK_IN_CHOICE', choice: 'A' });
    engine.handleMessage('p3', { type: 'LOCK_IN_CHOICE', choice: 'B' });
    expect(engine.phase).toBe('PHASE3_PERSUASION');

    // p2 (Wiretapper) peeks at p3 -> sees 'B'
    engine.handleMessage('p2', {
      type: 'USE_ACTIVE_POWER',
      powerType: 'PEEK',
      targetPlayerId: 'p3',
    });
    expect(engine.getStateForPlayer('p2').myRole?.peekedChoice).toBe('B');
    expect(toasts.some((t) => t.includes('Option B'))).toBe(true);

    // p3 (Turncoat) uses LATE_FLIP to switch from B -> A!
    engine.handleMessage('p3', {
      type: 'USE_ACTIVE_POWER',
      powerType: 'LATE_FLIP',
    });
    expect(engine.getStateForPlayer('p3').myLockedChoice).toBe('A');
    expect(engine.finalChoices.p3).toBe('A');

    // Judge picks A -> both p2 and p3 are on A (unanimous k = 2/2 -> Judge gets 0, p2 gets 2+1=3, p3 gets 2+1=3)
    engine.handleMessage('p1', { type: 'SUBMIT_JUDGE_VERDICT', choice: 'A' });
    expect(engine.phase).toBe('PHASE5_REVEAL_AND_SCORE');

    // In fog_of_war mode during Phase 5:
    // p1 (Judge) cannot see p2's role, vote, or round points!
    const p1FogView = engine.getStateForPlayer('p1');
    const p2BreakdownInFog = p1FogView.currentRoundSummary?.breakdowns.find(
      (b) => b.playerId === 'p2'
    );
    expect(p2BreakdownInFog?.roleId).toBeUndefined();
    expect(p2BreakdownInFog?.finalChoice).toBeUndefined();
    expect(p2BreakdownInFog?.totalRoundPoints).toBe(0);
    // And cumulative scores on players list are masked to 0 during fog_of_war rounds
    expect(p1FogView.players.find((p) => p.id === 'p2')?.score).toBe(0);

    // But p2 CAN see their own breakdown (3 pts) and p3 CAN see their own breakdown (3 pts)!
    expect(
      engine
        .getStateForPlayer('p2')
        .currentRoundSummary?.breakdowns.find((b) => b.playerId === 'p2')
        ?.totalRoundPoints
    ).toBe(3);
    expect(
      engine
        .getStateForPlayer('p3')
        .currentRoundSummary?.breakdowns.find((b) => b.playerId === 'p3')
        ?.totalRoundPoints
    ).toBe(3);
  });

  it('handles disconnects, host migration, reconnection, and phase timeouts cleanly', () => {
    const engine = new RoomGameEngine('TIME', {
      onBroadcastState: () => {},
    });

    engine.handleMessage('p1', { type: 'JOIN_ROOM', playerId: 'p1', name: 'Alice' });
    engine.handleMessage('p2', { type: 'JOIN_ROOM', playerId: 'p2', name: 'Bob' });
    engine.handleMessage('p3', { type: 'JOIN_ROOM', playerId: 'p3', name: 'Charlie' });

    // Host p1 disconnects -> p2 becomes host
    engine.handleDisconnect('p1');
    expect(engine.players.find((p) => p.id === 'p1')?.isHost).toBe(false);
    expect(engine.players.find((p) => p.id === 'p2')?.isHost).toBe(true);

    // p1 reconnects
    engine.handleMessage('p1', { type: 'JOIN_ROOM', playerId: 'p1', name: 'Alice' });
    expect(engine.players.find((p) => p.id === 'p1')?.isConnected).toBe(true);

    // New host p2 starts match
    engine.handleMessage('p2', { type: 'START_MATCH' });
    expect(engine.phase).toBe('PHASE1_JUDGE_QUESTION');

    // Simulate phase timeouts across all 4 active phases!
    engine.handlePhaseTimeout(); // Phase 1 timeout -> auto-generates question -> Phase 2
    expect(engine.phase).toBe('PHASE2_SECRET_LOCK_IN');
    expect(engine.prompt).not.toBeNull();

    engine.handlePhaseTimeout(); // Phase 2 timeout -> auto-locks choices -> Phase 3
    expect(engine.phase).toBe('PHASE3_PERSUASION');

    engine.handlePhaseTimeout(); // Phase 3 timeout -> Phase 4
    expect(engine.phase).toBe('PHASE4_JUDGE_DECISION');

    engine.handlePhaseTimeout(); // Phase 4 timeout -> auto-verdict -> Phase 5
    expect(engine.phase).toBe('PHASE5_REVEAL_AND_SCORE');
  });
});

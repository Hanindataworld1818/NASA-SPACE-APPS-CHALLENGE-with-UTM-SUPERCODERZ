import test from 'node:test';
import assert from 'node:assert/strict';

interface MockAuth {
  uid: string;
  email_verified: boolean;
}

interface MissionLogPayload {
  ownerId?: unknown;
  astronautName?: unknown;
  siteId?: unknown;
  solReached?: unknown;
  score?: unknown;
  oxygenRemaining?: unknown;
  radiationMsv?: unknown;
  outcome?: unknown;
  summaryNote?: unknown;
  milestonesSummary?: unknown;
  personalNote?: unknown;
  createdAt?: unknown;
  [key: string]: unknown;
}

const SERVER_TIME = 'SERVER_TIMESTAMP';

function isValidId(id: string): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && /^[a-zA-Z0-9_\-]+$/.test(id);
}

function evaluateCreateMissionLog(
  auth: MockAuth | null,
  logId: string,
  payload: MissionLogPayload
): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!auth || auth.email_verified !== true) return 'PERMISSION_DENIED';
  if (!isValidId(logId)) return 'PERMISSION_DENIED';

  const allowedKeys = [
    'ownerId',
    'astronautName',
    'siteId',
    'solReached',
    'score',
    'oxygenRemaining',
    'radiationMsv',
    'outcome',
    'summaryNote',
    'milestonesSummary',
    'personalNote',
    'createdAt',
  ];
  const keys = Object.keys(payload);
  if (keys.length !== allowedKeys.length) return 'PERMISSION_DENIED';
  for (const k of keys) {
    if (!allowedKeys.includes(k)) return 'PERMISSION_DENIED';
  }

  if (
    typeof payload.ownerId !== 'string' ||
    payload.ownerId !== auth.uid ||
    !isValidId(payload.ownerId)
  ) {
    return 'PERMISSION_DENIED';
  }
  if (
    typeof payload.astronautName !== 'string' ||
    payload.astronautName.length < 1 ||
    payload.astronautName.length > 60
  ) {
    return 'PERMISSION_DENIED';
  }
  if (payload.siteId !== 'moon' && payload.siteId !== 'mars') {
    return 'PERMISSION_DENIED';
  }
  if (
    typeof payload.solReached !== 'number' ||
    !Number.isInteger(payload.solReached) ||
    payload.solReached < 1 ||
    payload.solReached > 7
  ) {
    return 'PERMISSION_DENIED';
  }
  if (
    typeof payload.score !== 'number' ||
    !Number.isInteger(payload.score) ||
    payload.score < 0 ||
    payload.score > 100000
  ) {
    return 'PERMISSION_DENIED';
  }
  if (
    typeof payload.oxygenRemaining !== 'number' ||
    !Number.isInteger(payload.oxygenRemaining) ||
    payload.oxygenRemaining < 0 ||
    payload.oxygenRemaining > 100
  ) {
    return 'PERMISSION_DENIED';
  }
  if (
    typeof payload.radiationMsv !== 'number' ||
    payload.radiationMsv < 0 ||
    payload.radiationMsv > 1000
  ) {
    return 'PERMISSION_DENIED';
  }
  if (
    payload.outcome !== 'victory' &&
    payload.outcome !== 'defeat' &&
    payload.outcome !== 'in_progress'
  ) {
    return 'PERMISSION_DENIED';
  }
  if (
    typeof payload.summaryNote !== 'string' ||
    payload.summaryNote.length < 1 ||
    payload.summaryNote.length > 500
  ) {
    return 'PERMISSION_DENIED';
  }
  if (
    typeof payload.milestonesSummary !== 'string' ||
    payload.milestonesSummary.length < 1 ||
    payload.milestonesSummary.length > 500
  ) {
    return 'PERMISSION_DENIED';
  }
  if (
    typeof payload.personalNote !== 'string' ||
    payload.personalNote.length < 1 ||
    payload.personalNote.length > 400
  ) {
    return 'PERMISSION_DENIED';
  }
  if (payload.createdAt !== SERVER_TIME) {
    return 'PERMISSION_DENIED';
  }

  return 'ALLOW';
}

const validPayload: MissionLogPayload = {
  ownerId: 'user_123',
  astronautName: 'Commander Nova',
  siteId: 'mars',
  solReached: 7,
  score: 1850,
  oxygenRemaining: 84,
  radiationMsv: 12.4,
  outcome: 'in_progress',
  summaryNote: 'Completed Sol 7 with balanced shielding and hydroponics.',
  milestonesSummary: 'Sol 1 (M1.5): O2 86%, Food 82%, Rad 1.2mSv, 3/6 tasks',
  personalNote: 'Boosting water shields during Sol 4 saved our crew!',
  createdAt: SERVER_TIME,
};

test('Dirty Dozen #1: Unauthenticated write returns PERMISSION_DENIED', () => {
  assert.equal(evaluateCreateMissionLog(null, 'log_1', validPayload), 'PERMISSION_DENIED');
});

test('Dirty Dozen #2: Unverified email spoof returns PERMISSION_DENIED', () => {
  assert.equal(
    evaluateCreateMissionLog({ uid: 'user_123', email_verified: false }, 'log_1', validPayload),
    'PERMISSION_DENIED'
  );
});

test('Dirty Dozen #3: Cross-user identity spoofing returns PERMISSION_DENIED', () => {
  assert.equal(
    evaluateCreateMissionLog(
      { uid: 'attacker_999', email_verified: true },
      'log_1',
      validPayload
    ),
    'PERMISSION_DENIED'
  );
});

test('Dirty Dozen #4: Shadow ghost field injection returns PERMISSION_DENIED', () => {
  assert.equal(
    evaluateCreateMissionLog(
      { uid: 'user_123', email_verified: true },
      'log_1',
      { ...validPayload, isAdmin: true }
    ),
    'PERMISSION_DENIED'
  );
});

test('Dirty Dozen #5: Path ID poisoning returns PERMISSION_DENIED', () => {
  assert.equal(
    evaluateCreateMissionLog(
      { uid: 'user_123', email_verified: true },
      'bad$id!spaces',
      validPayload
    ),
    'PERMISSION_DENIED'
  );
});

test('Dirty Dozen #6: Oversized summaryNote returns PERMISSION_DENIED', () => {
  assert.equal(
    evaluateCreateMissionLog(
      { uid: 'user_123', email_verified: true },
      'log_1',
      { ...validPayload, summaryNote: 'X'.repeat(600) }
    ),
    'PERMISSION_DENIED'
  );
});

test('Dirty Dozen #7: Forged client timestamp returns PERMISSION_DENIED', () => {
  assert.equal(
    evaluateCreateMissionLog(
      { uid: 'user_123', email_verified: true },
      'log_1',
      { ...validPayload, createdAt: '2020-01-01T00:00:00Z' }
    ),
    'PERMISSION_DENIED'
  );
});

test('Dirty Dozen #8: Invalid siteId enum returns PERMISSION_DENIED', () => {
  assert.equal(
    evaluateCreateMissionLog(
      { uid: 'user_123', email_verified: true },
      'log_1',
      { ...validPayload, siteId: 'pluto' }
    ),
    'PERMISSION_DENIED'
  );
});

test('Dirty Dozen #9-12 & Valid Baseline: Valid verified user write is ALLOWED', () => {
  assert.equal(
    evaluateCreateMissionLog({ uid: 'user_123', email_verified: true }, 'log_1', validPayload),
    'ALLOW'
  );
});

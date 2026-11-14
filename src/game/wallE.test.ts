import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialGameState } from './rules';
import {
  WALL_E_ENVIRONMENT_CHORES,
  WALL_E_KNOWLEDGE_REMINDERS,
  WALL_E_LOVE_MESSAGES,
  pickWallEAstronautExchange,
  pickWallECadetLove,
  pickWallEKnowledgeReminder,
  scanOutpostStation,
} from './wallE';

test('WALL-E picks urgent mission knowledge reminders dynamically and rotates tips', () => {
  const gs = createInitialGameState('mars');
  // Trigger critical oxygen reminder when oxygen drops low
  const lowO2State = { ...gs, oxygen: 62 };
  const urgentO2 = pickWallEKnowledgeReminder(lowO2State);
  assert.equal(urgentO2.id, 'rem-eclss-oxygen');

  // Trigger radiation shield reminder during Sol 4 X8.7 flare
  const flareState = { ...gs, sol: 4 };
  const urgentShield = pickWallEKnowledgeReminder(flareState);
  assert.equal(urgentShield.id, 'rem-donki-shield');

  // Calling with lastId returns an alternative tip cleanly
  const alt = pickWallEKnowledgeReminder(flareState, urgentShield.id);
  assert.notEqual(alt.id, urgentShield.id);
  assert.ok(WALL_E_KNOWLEDGE_REMINDERS.length >= 6);
});

test('WALL-E provides loving encouragement and astronauts always reply warmly with Thank you', () => {
  assert.ok(WALL_E_LOVE_MESSAGES.length >= 5);
  assert.ok(pickWallECadetLove(0).length > 10);

  for (const role of ['han', 'feng', 'kun', 'xin'] as const) {
    const ex0 = pickWallEAstronautExchange(role, 0);
    const ex1 = pickWallEAstronautExchange(role, 1);
    assert.ok(ex0.wallEBubble.length > 0);
    assert.match(ex0.astronautReply.toLowerCase(), /thank/);
    assert.match(ex1.astronautReply.toLowerCase(), /thank/);
  }
});

test('WALL-E environmental chores stay safely within expanded 2280x1320 outpost bounds', () => {
  assert.ok(WALL_E_ENVIRONMENT_CHORES.length >= 5);
  for (const chore of WALL_E_ENVIRONMENT_CHORES) {
    assert.ok(chore.x >= 100 && chore.x <= 2180);
    assert.ok(chore.y >= 80 && chore.y <= 1240);
    assert.ok(chore.bubble.length > 0);
  }
});

test('scanOutpostStation reads live gameState telemetry and yields tips, quips, and status badges', () => {
  const base = createInitialGameState('mars');

  const powerScan = scanOutpostStation('power', base);
  assert.equal(powerScan.statusBadge, 'OPTIMAL');
  assert.match(powerScan.liveMetricSummary, /6 kW/);
  assert.match(powerScan.engineeringTip, /Engineering Tip:/);
  assert.ok(powerScan.wallESpeechQuip.length > 10);

  const lowPower = scanOutpostStation('power', { ...base, availablePowerKw: 4 });
  assert.equal(lowPower.statusBadge, 'ALERT');

  const o2Alert = scanOutpostStation('lifesupport', { ...base, oxygen: 30 });
  assert.equal(o2Alert.statusBadge, 'ALERT');
  assert.match(o2Alert.liveMetricSummary, /30%/);

  const shieldCaution = scanOutpostStation('shield', { ...base, sol: 4, powerAllocation: { ...base.powerAllocation, shield: 1 } });
  assert.equal(shieldCaution.statusBadge, 'CAUTION');

  const academyTodo = scanOutpostStation('academy', base);
  assert.equal(academyTodo.statusBadge, 'CAUTION');
  const academyDone = scanOutpostStation('academy', { ...base, completedTasksToday: ['academy'] });
  assert.equal(academyDone.statusBadge, 'OPTIMAL');

  const corridorScan = scanOutpostStation(null, base);
  assert.equal(corridorScan.roomId, 'corridor');
  assert.equal(corridorScan.statusBadge, 'OPTIMAL');
  assert.match(corridorScan.liveMetricSummary, /Base Health:/);
});


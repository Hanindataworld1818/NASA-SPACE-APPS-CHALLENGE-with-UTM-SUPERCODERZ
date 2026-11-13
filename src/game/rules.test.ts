import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OUTPOST_ROOMS,
  OUTPOST_WORLD_H,
  OUTPOST_WORLD_W,
  calculateSolOutcome,
  checkMissionOutcome,
  computeAvailablePowerKw,
  computeCrisisSeverity,
  computeRoverScrubStep,
  createDailyMilestone,
  createInitialGameState,
  formatMilestonesSummary,
  getAdaptiveMusicContextKey,
  getThreeSolForecast,
  getTotalAllocatedPower,
  isDishAlignedWithTarget,
  isLedSpectrumOptimal,
  isPhaseInGreenZone,
} from './rules';

test('initial game state allocates all 6 kW of baseline power cleanly', () => {
  const state = createInitialGameState('mars');
  assert.equal(state.availablePowerKw, 6);
  assert.equal(getTotalAllocatedPower(state.powerAllocation), 6);
  assert.equal(checkMissionOutcome(state).status, 'playing');
});

test('engineering trade-off: shifting power from shield to hydroponics during Sol 4 X8.7 flare spikes radiation dose', () => {
  const unshieldedState = {
    ...createInitialGameState('moon'),
    sol: 4, // X8.7 Super Solar Flare (28 mSv unshielded)
    powerAllocation: {
      lifesupport: 2,
      shield: 0,
      hydroponics: 3,
      comms: 1,
    },
  };

  const shieldedState = {
    ...unshieldedState,
    powerAllocation: {
      lifesupport: 2,
      shield: 3,
      hydroponics: 0,
      comms: 1,
    },
    completedTasksToday: ['shield' as const],
  };

  const unshieldedOutcome = calculateSolOutcome(unshieldedState);
  const shieldedOutcome = calculateSolOutcome(shieldedState);

  // Unshielded takes full 28 mSv flare + 1.1 baseline = 29.1 mSv, but grows more food
  assert.equal(unshieldedOutcome.radiationDeltaMsv > 25, true);
  assert.equal(unshieldedOutcome.foodDelta > shieldedOutcome.foodDelta, true);

  // Shielded blocks 92% of the flare (only ~3.3 mSv total), at the cost of food growth
  assert.equal(shieldedOutcome.radiationDeltaMsv < 4.5, true);
  assert.equal(shieldedOutcome.foodDelta < 0, true);
});

test('dust storm on Sol 3 reduces available power unless EVA bonus power is earned', () => {
  assert.equal(computeAvailablePowerKw('mars', 3, 0), 5);
  assert.equal(computeAvailablePowerKw('mars', 3, 1), 6);
});

test('win and loss conditions trigger accurately on O2, radiation, and completing Sol 7', () => {
  const base = createInitialGameState('mars');
  assert.equal(checkMissionOutcome({ ...base, oxygen: 0 }).status, 'defeat');
  assert.equal(checkMissionOutcome({ ...base, food: 0 }).status, 'defeat');
  assert.equal(checkMissionOutcome({ ...base, radiationMsv: 62 }).status, 'defeat');
  assert.equal(checkMissionOutcome({ ...base, sol: 8 }).status, 'victory');
});

test('daily milestone creation and formatting captures Sol telemetry and decisions cleanly', () => {
  const s1 = { ...createInitialGameState('mars'), completedTasksToday: ['power' as const, 'shield' as const] };
  const m1 = createDailyMilestone(s1, 'Shield Vault');
  assert.equal(m1.sol, 1);
  assert.equal(m1.tasksCompleted.length, 2);
  const formatted = formatMilestonesSummary([m1]);
  assert.equal(formatted.includes('S1('), true);
  assert.equal(formatted.includes('2/6'), true);
  assert.equal(formatted.includes('Shield Vault'), true);
});

test('3-Sol forecast returns current + next 2 Sols with icons, risk cues, and end-of-mission clamping', () => {
  const f1 = getThreeSolForecast(1, 7);
  assert.equal(f1.length, 3);
  assert.deepEqual(
    f1.map((x) => [x.sol, x.isToday, x.iconType, x.riskLevel]),
    [
      [1, true, 'quiet', 'LOW'],
      [2, false, 'flare', 'HIGH'],
      [3, false, 'dust', 'MED'],
    ]
  );
  assert.equal(f1[2].powerPenaltyKw, 1);

  const f4 = getThreeSolForecast(4, 7);
  assert.equal(f4[0].riskLevel, 'EXTREME');
  assert.equal(f4[0].iconType, 'sep');

  const f6 = getThreeSolForecast(6, 7);
  assert.equal(f6.length, 2);
  assert.equal(f6[0].iconType, 'cme');

  const f7 = getThreeSolForecast(7, 7);
  assert.equal(f7.length, 1);
});

test('mini-game tolerance helpers validate reactor phase, LED sweet spot, dish alignment, and EVA scrub collision', () => {
  assert.equal(isPhaseInGreenZone(82), true);
  assert.equal(isPhaseInGreenZone(40), false);

  assert.equal(isLedSpectrumOptimal(76), true);
  assert.equal(isLedSpectrumOptimal(48), false);

  assert.equal(isDishAlignedWithTarget(50, 50, 58, 54, 14), true);
  assert.equal(isDishAlignedWithTarget(10, 10, 60, 60, 14), false);

  const scrub = computeRoverScrubStep(
    140,
    120,
    [
      { id: 'wingA', x: 145, y: 125, radius: 55, dustPct: 100 },
      { id: 'wingB', x: 420, y: 200, radius: 55, dustPct: 100 },
    ],
    25
  );
  assert.deepEqual(scrub.scrubbedIds, ['wingA']);
  assert.equal(scrub.targets[0].dustPct, 75);
  assert.equal(scrub.targets[1].dustPct, 100);
});

test('expanded 1560x900 outpost layout rooms fit cleanly without overlap and contain their consoles', () => {
  assert.equal(OUTPOST_WORLD_W, 1560);
  assert.equal(OUTPOST_WORLD_H, 900);
  assert.equal(OUTPOST_ROOMS.length, 6);

  for (const r of OUTPOST_ROOMS) {
    assert.equal(r.x > 0 && r.x + r.w < OUTPOST_WORLD_W, true);
    assert.equal(r.y > 0 && r.y + r.h < OUTPOST_WORLD_H, true);
    assert.equal(r.consoleX > r.x && r.consoleX < r.x + r.w, true);
    assert.equal(r.consoleY > r.y && r.consoleY < r.y + r.h, true);
  }

  for (let i = 0; i < OUTPOST_ROOMS.length; i++) {
    for (let j = i + 1; j < OUTPOST_ROOMS.length; j++) {
      const a = OUTPOST_ROOMS[i];
      const b = OUTPOST_ROOMS[j];
      const overlap =
        a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
      assert.equal(overlap, false, `${a.id} overlaps ${b.id}`);
    }
  }
});

test('adaptive music crisis severity detects calm, caution, and critical outpost states', () => {
  const base = createInitialGameState('mars');
  assert.equal(computeCrisisSeverity(base, false), 'calm');
  assert.equal(computeCrisisSeverity({ ...base, sol: 3 }, false), 'caution');
  assert.equal(computeCrisisSeverity({ ...base, oxygen: 46 }, false), 'caution');
  assert.equal(computeCrisisSeverity({ ...base, sol: 4 }, false), 'critical');
  assert.equal(computeCrisisSeverity({ ...base, oxygen: 25 }, false), 'critical');
  assert.equal(computeCrisisSeverity({ ...base, radiationMsv: 45 }, false), 'critical');
  assert.equal(computeCrisisSeverity(base, true), 'critical');

  assert.equal(getAdaptiveMusicContextKey('hydroponics', 'calm'), 'calm:hydroponics');
  assert.equal(getAdaptiveMusicContextKey(null, 'caution'), 'caution:corridor');
  assert.equal(getAdaptiveMusicContextKey('shield', 'critical'), 'critical:shield');
});




import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CSA_HYDROPONIC_CROPS,
  FUTURE_EXPANSION_PLOT,
  MESS_LOUNGE_ZONE,
  OUTPOST_ROOMS,
  OUTPOST_WORLD_H,
  OUTPOST_WORLD_W,
  SCIENCE_BOT_SCAN_TARGET,
  SPACE_RECIPES,
  calculateCsaCropLabSimulation,
  calculateNutritionExplorerHealth,
  calculateSolOutcome,
  calculateSpacePlateNutrition,
  canCookSpaceRecipe,
  checkMissionOutcome,
  computeAvailablePowerKw,
  computeCrisisSeverity,
  computeRoverScrubStep,
  consumeRecipeIngredients,
  createDailyLogEntry,
  createDailyMilestone,
  createInitialGameState,
  formatDailyLogsForSummary,
  formatMilestonesSummary,
  getAdaptiveMusicContextKey,
  getThreeSolForecast,
  getTotalAllocatedPower,
  hasScienceBotBadge,
  isDishAlignedWithTarget,
  isLedSpectrumOptimal,
  isPhaseInGreenZone,
  upsertDailyLog,
} from './rules';

test('initial game state allocates all 6 kW of baseline power cleanly', () => {
  const state = createInitialGameState('mars');
  assert.equal(state.availablePowerKw, 6);
  assert.equal(getTotalAllocatedPower(state.powerAllocation), 6);
  assert.equal(checkMissionOutcome(state).status, 'playing');
  assert.equal(state.pantry.mizuna >= 1, true);
  assert.equal(state.mealsCookedTotal, 0);
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
  assert.equal(formatted.includes(`2/${OUTPOST_ROOMS.length}`), true);
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

test('expanded 2280x1320 outpost layout rooms, Lounge, and Expansion Plot fit cleanly without overlap', () => {
  assert.equal(OUTPOST_WORLD_W, 2280);
  assert.equal(OUTPOST_WORLD_H, 1320);
  assert.equal(OUTPOST_ROOMS.length, 8);

  const shieldRoom = OUTPOST_ROOMS.find((r) => r.id === 'shield')!;
  const academyRoom = OUTPOST_ROOMS.find((r) => r.id === 'academy')!;
  assert.equal(academyRoom.x, shieldRoom.x);
  assert.equal(academyRoom.y > shieldRoom.y + shieldRoom.h, true);

  const regions = [
    ...OUTPOST_ROOMS.map((r) => ({ id: r.id, x: r.x, y: r.y, w: r.w, h: r.h })),
    {
      id: MESS_LOUNGE_ZONE.id,
      x: MESS_LOUNGE_ZONE.x,
      y: MESS_LOUNGE_ZONE.y,
      w: MESS_LOUNGE_ZONE.w,
      h: MESS_LOUNGE_ZONE.h,
    },
    {
      id: FUTURE_EXPANSION_PLOT.id,
      x: FUTURE_EXPANSION_PLOT.x,
      y: FUTURE_EXPANSION_PLOT.y,
      w: FUTURE_EXPANSION_PLOT.w,
      h: FUTURE_EXPANSION_PLOT.h,
    },
  ];

  for (const r of OUTPOST_ROOMS) {
    assert.equal(r.x > 0 && r.x + r.w < OUTPOST_WORLD_W, true);
    assert.equal(r.y > 0 && r.y + r.h < OUTPOST_WORLD_H, true);
    assert.equal(r.consoleX > r.x && r.consoleX < r.x + r.w, true);
    assert.equal(r.consoleY > r.y && r.consoleY < r.y + r.h, true);
  }

  for (let i = 0; i < regions.length; i++) {
    for (let j = i + 1; j < regions.length; j++) {
      const a = regions[i];
      const b = regions[j];
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
  assert.equal(getAdaptiveMusicContextKey('foodlab', 'calm'), 'calm:foodlab');
  assert.equal(getAdaptiveMusicContextKey(null, 'caution'), 'caution:corridor');
  assert.equal(getAdaptiveMusicContextKey('shield', 'critical'), 'critical:shield');
});

test('daily log helpers create, deduplicate by Sol+site, and format progress notes', () => {
  const e1 = createDailyLogEntry({
    sol: 1,
    siteId: 'mars',
    donkiClass: 'C2.4 Background',
    oxygen: 86,
    food: 82,
    radiationMsv: 2.1,
    scienceScore: 140,
    tasksCompletedCount: 4,
    note: 'Kept 2 kW on O2 and harvested dwarf wheat!',
    createdAtIso: '2026-11-13T10:00:00.000Z',
  });
  const e1Updated = createDailyLogEntry({
    sol: 1,
    siteId: 'mars',
    donkiClass: 'C2.4 Background',
    oxygen: 88,
    food: 84,
    radiationMsv: 2.1,
    scienceScore: 160,
    tasksCompletedCount: 7,
    note: 'Updated: Boosted Bio-Dome LEDs before Sol 2 flare!',
    createdAtIso: '2026-11-13T10:05:00.000Z',
  });
  const e2 = createDailyLogEntry({
    sol: 2,
    siteId: 'mars',
    donkiClass: 'M8.8 Flare',
    oxygen: 80,
    food: 78,
    radiationMsv: 6.4,
    scienceScore: 210,
    tasksCompletedCount: 6,
    note: 'Locked water walls in Shield Vault.',
    createdAtIso: '2026-11-13T10:15:00.000Z',
  });

  let list = upsertDailyLog([], e1);
  list = upsertDailyLog(list, e1Updated);
  list = upsertDailyLog(list, e2);

  assert.equal(list.length, 2);
  assert.equal(list[0].sol, 2);
  assert.equal(list[1].tasksCompletedCount, 7);
  assert.equal(list[1].note.includes('Updated:'), true);

  const summary = formatDailyLogsForSummary(list);
  assert.equal(summary.includes('Sol 2:'), true);
  assert.equal(summary.includes('Sol 1:'), true);
});

test('CSA astronaut space plate calculator checks 1900-3200 kcal range and fresh greens balance', () => {
  const lowEnergy = calculateSpacePlateNutrition({ protein: 1, greens: 1, grains: 1, fruit: 1 });
  assert.equal(lowEnergy.inHealthyRange, false);
  assert.equal(lowEnergy.totalKcal < 1900, true);

  const balanced = calculateSpacePlateNutrition({ protein: 3, greens: 2, grains: 3, fruit: 2 });
  assert.equal(balanced.inHealthyRange, true);
  assert.equal(balanced.totalKcal >= 1900 && balanced.totalKcal <= 3200, true);
  assert.equal(balanced.vitaminCScore >= 80, true);

  const missingGreens = calculateSpacePlateNutrition({ protein: 4, greens: 0, grains: 3, fruit: 0 });
  assert.equal(missingGreens.inHealthyRange, false);
});

test('CSA Crop Food Lab simulator and Space Kitchen recipes calculate nutrition and deduct pantry inventory accurately', () => {
  assert.equal(CSA_HYDROPONIC_CROPS.length, 6);
  const low = calculateCsaCropLabSimulation({
    mizuna: 1,
    wheat: 1,
    radish: 0,
    berries: 0,
    microgreens: 0,
    spirulina: 0,
  });
  assert.equal(low.astronautHealthState, 'Needs Fuel');
  assert.equal(low.inHealthyRange, false);

  const peak = calculateCsaCropLabSimulation({
    mizuna: 2,
    wheat: 3,
    radish: 1,
    berries: 2,
    microgreens: 2,
    spirulina: 2,
  });
  assert.equal(peak.astronautHealthState, 'Peak Energy');
  assert.equal(peak.inHealthyRange, true);
  assert.equal(peak.totalKcal >= 1900 && peak.totalKcal <= 3200, true);
  assert.equal(peak.proteinScore >= 55, true);
  assert.equal(peak.vitaminCScore >= 65, true);

  const initial = createInitialGameState('mars');
  const taco = SPACE_RECIPES[0];
  assert.equal(canCookSpaceRecipe(initial.pantry, taco), true);
  const afterCook = consumeRecipeIngredients(initial.pantry, taco);
  assert.equal(afterCook.mizuna, initial.pantry.mizuna - 1);
  assert.equal(afterCook.wheat, initial.pantry.wheat - 1);
  assert.equal(afterCook.radish, initial.pantry.radish - 1);
  assert.equal(afterCook.h2oDrops, initial.pantry.h2oDrops - 1);
});

import {
  ASTRONAUT_DAILY_SCHEDULE,
  STATION_MASTER_GUIDES,
  computeEducatorTradeoffPreview,
} from './educatorGuideData';

test('educator daily guide covers all 6 routine phases, all 8 stations, and trade-off preview logic', () => {
  assert.equal(ASTRONAUT_DAILY_SCHEDULE.length, 6);
  assert.equal(STATION_MASTER_GUIDES.length, 8);

  const danger = computeEducatorTradeoffPreview({ flareDoseMsv: 28, shieldKw: 0, hydroKw: 3 });
  assert.equal(danger.safetyVerdict, 'DANGER');
  assert.equal(danger.crewDoseReceivedMsv > 20, true);
  assert.equal(danger.foodChangePct > 0, true);

  const safe = computeEducatorTradeoffPreview({ flareDoseMsv: 14, shieldKw: 3, hydroKw: 2 });
  assert.equal(safe.safetyVerdict, 'SAFE');
  assert.equal(safe.shieldBlockedPct, 92);
  assert.equal(safe.bonusO2Pct, 4);
});

test('Nutrition Explorer Health Meter scales up dynamically as crops are harvested and meals processed in base', () => {
  const baseline = createInitialGameState('mars');
  const lowPantryState = {
    ...baseline,
    food: 35,
    pantry: { mizuna: 0, wheat: 0, radish: 0, berries: 0, microgreens: 0, spirulina: 0, h2oDrops: 1 },
    cropsHarvestedTotal: 0,
    mealsCookedTotal: 0,
  };
  const harvestedAndProcessed = {
    ...baseline,
    food: 94,
    oxygen: 90,
    pantry: { mizuna: 4, wheat: 3, radish: 3, berries: 3, microgreens: 3, spirulina: 2, h2oDrops: 5 },
    cropsHarvestedTotal: 8,
    mealsCookedTotal: 2,
  };

  const lowHealth = calculateNutritionExplorerHealth(lowPantryState);
  const peakHealth = calculateNutritionExplorerHealth(harvestedAndProcessed);
  assert.equal(lowHealth.healthMeterScore < 45, true);
  assert.equal(lowHealth.statusLabel, 'Grow & Cook Needed');
  assert.equal(peakHealth.healthMeterScore >= 85, true);
  assert.equal(peakHealth.statusLabel, 'Peak Base Health');
  assert.equal(peakHealth.harvestedUnitsCount, 8);
  assert.equal(peakHealth.processedMealsCount, 2);
});

test('Science Bot achievement badge tracks WALL-E scans across the 7-Sol mission and unlocks at 10 scans', () => {
  const initial = createInitialGameState('mars');
  assert.equal(initial.wallEScansCount, 0);
  assert.equal(SCIENCE_BOT_SCAN_TARGET, 10);
  assert.equal(hasScienceBotBadge(0), false);
  assert.equal(hasScienceBotBadge(9), false);
  assert.equal(hasScienceBotBadge(10), true);
  assert.equal(hasScienceBotBadge(14), true);
});

test('outpost map designs and game state support selectable classic and frontier variants for Mars and Moon', async () => {
  const nasa = await import('./nasaData');
  const marsClassic = nasa.getOutpostMapDesign('mars', 'classic');
  const marsFrontier = nasa.getOutpostMapDesign('mars', 'frontier');
  const moonClassic = nasa.getOutpostMapDesign('moon', 'classic');
  const moonFrontier = nasa.getOutpostMapDesign('moon', 'frontier');

  assert.notEqual(marsClassic.name, marsFrontier.name);
  assert.notEqual(marsClassic.terrainColor, marsFrontier.terrainColor);
  assert.notEqual(moonClassic.name, moonFrontier.name);
  assert.notEqual(moonClassic.terrainColor, moonFrontier.terrainColor);
  assert.notEqual(marsClassic.terrainColor, moonClassic.terrainColor);

  const defaultState = createInitialGameState('mars');
  assert.equal(defaultState.mapVariant, 'classic');
  const moonFrontierState = createInitialGameState('moon', 'frontier');
  assert.equal(moonFrontierState.siteId, 'moon');
  assert.equal(moonFrontierState.mapVariant, 'frontier');
});









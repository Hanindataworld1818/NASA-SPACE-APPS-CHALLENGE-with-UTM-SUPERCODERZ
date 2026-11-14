import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACADEMY_LESSON_DECKS,
  ACADEMY_QUIZ_BANK,
  SURVIVAL_SUPPLY_PACKS,
  buildAcademyQuizRound,
  computeAcademyClaimRewards,
  evaluateAcademyQuizScore,
} from './academyData';
import { OUTPOST_ROOMS } from './rules';
import { getSafeRoomAnchors } from './crewAndCamera';

test('Academy Station curriculum covers 6 decks and all 4 distinct quiz game patterns', () => {
  assert.equal(ACADEMY_LESSON_DECKS.length, 6);
  const patterns = new Set(ACADEMY_QUIZ_BANK.map((q) => q.pattern));
  assert.equal(patterns.has('multiple_choice'), true);
  assert.equal(patterns.has('myth_buster'), true);
  assert.equal(patterns.has('balance_slider'), true);
  assert.equal(patterns.has('sequence_order'), true);
});

test('buildAcademyQuizRound serves varied patterns in mixed mode and filters single patterns cleanly', () => {
  const mixed = buildAcademyQuizRound({ filterPattern: 'mixed', roundSeed: 0, count: 3 });
  assert.equal(mixed.length, 3);
  const uniquePatterns = new Set(mixed.map((q) => q.pattern));
  assert.equal(uniquePatterns.size, 3);

  const onlyMyths = buildAcademyQuizRound({ filterPattern: 'myth_buster', roundSeed: 1, count: 3 });
  assert.equal(onlyMyths.every((q) => q.pattern === 'myth_buster'), true);
});

test('interactive balance_slider quiz puzzles validate real engineering & nutrition constraints', () => {
  const flarePuzzle = ACADEMY_QUIZ_BANK.find((q) => q.id === 'q-bal-flare-night');
  assert.ok(flarePuzzle && flarePuzzle.pattern === 'balance_slider');
  assert.equal(flarePuzzle.evaluate(0, 3).passed, false); // unshielded flare too high
  assert.equal(flarePuzzle.evaluate(3, 2).passed, false); // over 4 kW budget
  assert.equal(flarePuzzle.evaluate(3, 0).passed, false); // zero bio-dome O2 bonus
  assert.equal(flarePuzzle.evaluate(3, 1).passed, true); // 92% shield + 1kW plants within 4 kW!

  const menuPuzzle = ACADEMY_QUIZ_BANK.find((q) => q.id === 'q-bal-space-menu');
  assert.ok(menuPuzzle && menuPuzzle.pattern === 'balance_slider');
  assert.equal(menuPuzzle.evaluate(5, 0).passed, false); // missing Vitamin C greens
  assert.equal(menuPuzzle.evaluate(5, 3).passed, true); // 5*360 + 3*120 = 2160 kcal & 96% Vit C
});

test('Academy score streaks and Survival Supply Packs compute marks & survival boosts accurately', () => {
  const firstHit = evaluateAcademyQuizScore({ baseMarks: 20, isCorrect: true, currentStreak: 0 });
  assert.equal(firstHit.earnedMarks, 20);
  assert.equal(firstHit.nextStreak, 1);

  const secondHit = evaluateAcademyQuizScore({ baseMarks: 20, isCorrect: true, currentStreak: 1 });
  assert.equal(secondHit.earnedMarks, 25);
  assert.equal(secondHit.nextStreak, 2);

  const miss = evaluateAcademyQuizScore({ baseMarks: 20, isCorrect: false, currentStreak: 2 });
  assert.equal(miss.earnedMarks, 5);
  assert.equal(miss.nextStreak, 0);

  assert.equal(SURVIVAL_SUPPLY_PACKS.length, 3);
  const firstClaim = computeAcademyClaimRewards({
    packId: 'shield_boost',
    earnedMarks: 60,
    correctCount: 3,
    isRepeatRound: false,
  });
  assert.equal(firstClaim.radiationMsv, -4);
  assert.equal(firstClaim.oxygen, 6);
  assert.equal(firstClaim.science, 90);
  assert.equal(firstClaim.pantryDelta.h2oDrops, 2);

  const repeatClaim = computeAcademyClaimRewards({
    packId: 'air_greens',
    earnedMarks: 45,
    correctCount: 3,
    isRepeatRound: true,
  });
  assert.equal(repeatClaim.oxygen, 5);
  assert.equal(repeatClaim.food, 4);
  assert.equal(repeatClaim.science, 60);
});

test('Academy Station room anchors stay clear of top header bar and fit inside console bounds', () => {
  const academy = OUTPOST_ROOMS.find((r) => r.id === 'academy')!;
  const anchors = getSafeRoomAnchors(academy);
  for (const s of [...anchors.workSlots, ...anchors.chatPairSlots]) {
    assert.equal(s.y > academy.y + 165, true);
    assert.equal(s.y < academy.y + academy.h, true);
    assert.equal(s.x > academy.x + 30 && s.x < academy.x + academy.w - 30, true);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OUTPOST_ROOMS,
  OUTPOST_WORLD_H,
  OUTPOST_WORLD_W,
  RoomId,
} from './rules';
import {
  ShuffleDeck,
  advancePathFollower,
  buildOutpostCorridorPath,
  clampCameraPosition,
  computeRadarViewportRect,
  computeZoomAtAnchor,
  detectRoomAtPoint,
  getSafeRoomAnchors,
  pickFourDistinctRooms,
  pickFreshPairAssignment,
} from './crewAndCamera';

test('computeZoomAtAnchor preserves world coordinate under cursor and clamps cleanly', () => {
  const viewW = 1480;
  const viewH = 880;
  const startCamX = 400;
  const startCamY = 200;
  const oldZoom = 1.0;
  const newZoom = 1.4;
  const anchorX = 740;
  const anchorY = 440;

  const worldBeforeX = anchorX / oldZoom + startCamX;
  const worldBeforeY = anchorY / oldZoom + startCamY;

  const next = computeZoomAtAnchor(
    startCamX,
    startCamY,
    oldZoom,
    newZoom,
    anchorX,
    anchorY,
    viewW,
    viewH,
    OUTPOST_WORLD_W,
    OUTPOST_WORLD_H
  );

  const worldAfterX = anchorX / newZoom + next.camX;
  const worldAfterY = anchorY / newZoom + next.camY;

  assert.ok(Math.abs(worldBeforeX - worldAfterX) < 0.5);
  assert.ok(Math.abs(worldBeforeY - worldAfterY) < 0.5);

  // Zooming out to 0.65 centers vertically if visH > WORLD_H
  const zoomedOut = clampCameraPosition(0, 0, 0.65, viewW, viewH, OUTPOST_WORLD_W, OUTPOST_WORLD_H);
  assert.ok(zoomedOut.visH > OUTPOST_WORLD_H);
  assert.ok(zoomedOut.camY < 0);
});

test('computeRadarViewportRect tracks panned/zoomed view strictly inside radar bounds', () => {
  const radar = { x: 1284, y: 104, w: 180, h: 104 };
  const view = clampCameraPosition(720, 410, 1.2, 1480, 880, OUTPOST_WORLD_W, OUTPOST_WORLD_H);
  const rect = computeRadarViewportRect(
    view.camX,
    view.camY,
    view.visW,
    view.visH,
    radar.x,
    radar.y,
    radar.w,
    radar.h,
    OUTPOST_WORLD_W,
    OUTPOST_WORLD_H
  );

  assert.ok(rect.x >= radar.x && rect.x + rect.w <= radar.x + radar.w + 0.01);
  assert.ok(rect.y >= radar.y && rect.y + rect.h <= radar.y + radar.h + 0.01);

  // Panning further right moves radar viewport indicator right
  const viewRight = clampCameraPosition(980, 410, 1.2, 1480, 880, OUTPOST_WORLD_W, OUTPOST_WORLD_H);
  const rectRight = computeRadarViewportRect(
    viewRight.camX,
    viewRight.camY,
    viewRight.visW,
    viewRight.visH,
    radar.x,
    radar.y,
    radar.w,
    radar.h,
    OUTPOST_WORLD_W,
    OUTPOST_WORLD_H
  );
  assert.ok(rectRight.x > rect.x);
});

test('safe room anchors never overlap workstation consoles or room headers in any outpost room', () => {
  for (const room of OUTPOST_ROOMS) {
    const anchors = getSafeRoomAnchors(room);
    const allSlots = [...anchors.workSlots, ...anchors.chatPairSlots];
    for (const slot of allSlots) {
      assert.equal(detectRoomAtPoint(slot.x, slot.y), room.id);
      assert.ok(
        slot.y >= room.y + 180,
        `Slot (${slot.x}, ${slot.y}) in ${room.id} is too high and could clip header bar`
      );
      // Console desk occupies [consoleX - 64 .. consoleX + 64] x [consoleY - 36 .. consoleY + 30]
      const insideDeskX = Math.abs(slot.x - room.consoleX) < 62;
      const insideDeskY = slot.y >= room.consoleY - 36 && slot.y <= room.consoleY + 36;
      assert.equal(
        insideDeskX && insideDeskY,
        false,
        `Slot (${slot.x}, ${slot.y}) overlapped console in ${room.id}`
      );
    }
  }
});

test('ShuffleDeck never repeats consecutively and crew selectors pick distinct rooms/pairs', () => {
  const deck = new ShuffleDeck(['a', 'b', 'c', 'd'] as const);
  let prev: string | null = null;
  for (let i = 0; i < 40; i++) {
    const val = deck.next();
    assert.notEqual(val, prev);
    prev = val;
  }

  const roomDeck = new ShuffleDeck<RoomId>([
    'power',
    'lifesupport',
    'hydroponics',
    'foodlab',
    'shield',
    'eva',
    'comms',
  ]);
  const four = pickFourDistinctRooms(roomDeck);
  const uniqueRooms = new Set(Object.values(four));
  assert.equal(uniqueRooms.size, 4);

  const pairs = pickFreshPairAssignment(1, roomDeck);
  assert.notEqual(pairs.roomA, pairs.roomB);
  assert.equal(new Set([...pairs.pairA, ...pairs.pairB]).size, 4);
});

test('crew transitions between station behaviors smoothly and rotates Crew Cafe beside-seatings', async () => {
  const mod = await import('./crewAndCamera');

  // 1. Mid-station behavior transition always moves to a different valid behavior
  for (const role of ['han', 'feng', 'kun', 'xin'] as const) {
    const start = mod.CREW_PROFILES[role].workBehaviors[0];
    const next = mod.pickNextStationBehavior(role, start);
    assert.notEqual(next, start);
    assert.ok(mod.isWorkingActivity(next));
  }

  // 2. Varied pair reactions capture bros Han+Feng and Earth-missing sisters Kun+Xin
  const fallback = new mod.ShuffleDeck(mod.SAME_ROOM_CHITCHAT_LINES);
  const bros = mod.pickPairReactionExchange('han', 'feng', fallback);
  assert.ok(bros.lineA.length > 0 && bros.lineB.length > 0);
  const sis = mod.pickPairReactionExchange('kun', 'xin', fallback);
  assert.ok(sis.lineA.length > 0 && sis.lineB.length > 0);

  // 3. Crew Cafe rotations guarantee Han beside Feng, Xin beside Han, and Feng beside Kun
  // Left side seats: 0 & 2 (% 2 === 0), Right side seats: 1 & 3 (% 2 === 1)
  const presets = [0, 1, 2].map((i) => mod.pickCrewCafeSeating(i));
  const hanBesideFeng = presets.find((p) => p.seats.han % 2 === p.seats.feng % 2);
  const xinBesideHan = presets.find((p) => p.seats.xin % 2 === p.seats.han % 2);
  const fengBesideKun = presets.find((p) => p.seats.feng % 2 === p.seats.kun % 2);

  assert.ok(hanBesideFeng, 'Han must sometimes sit beside Feng in Crew Cafe');
  assert.ok(xinBesideHan, 'Xin must sometimes sit beside Han in Crew Cafe');
  assert.ok(fengBesideKun, 'Feng must sometimes sit beside Kun in Crew Cafe');
});

test('cadet emotes cover Happy, Working, Sad, and Thinking and trigger distinct personality reactions', async () => {
  const mod = await import('./crewAndCamera');
  assert.deepEqual(
    mod.CADET_EMOTES.map((e) => [e.id, e.keyHint]),
    [
      ['happy', '1'],
      ['working', '2'],
      ['sad', '3'],
      ['thinking', '4'],
    ]
  );

  for (const emote of mod.CADET_EMOTES) {
    for (const role of ['han', 'feng', 'kun', 'xin'] as const) {
      const reaction = mod.pickCrewReactionToCadetEmote(role, emote.id);
      assert.ok(reaction.line.length > 5);
      assert.ok(reaction.activity.length > 0);
    }
  }
});

test('buildOutpostCorridorPath + advancePathFollower reaches all 8 stations, academy, mess lounge, and solar wing without stucking or facing jitter', () => {
  const destinations: Array<{ label: string; x: number; y: number; expectedZone: string | null }> = [
    ...OUTPOST_ROOMS.flatMap((room) => {
      const anchors = getSafeRoomAnchors(room);
      return [
        { label: `${room.id}-slot0`, x: anchors.workSlots[0].x, y: anchors.workSlots[0].y, expectedZone: room.id },
        { label: `${room.id}-slot2`, x: anchors.workSlots[2].x, y: anchors.workSlots[2].y, expectedZone: room.id },
      ];
    }),
    { label: 'mess-seat-top-right', x: 1878, y: 774, expectedZone: 'mess_lounge' },
    { label: 'mess-dance-pad', x: 2028, y: 846, expectedZone: 'mess_lounge' },
    { label: 'prop-solar', x: 380, y: 112, expectedZone: null },
  ];

  // Test starting from Spine, top-row Power, and bottom-row Academy
  const origins = [
    { x: 1050, y: 530 },
    { x: 155, y: 245 },
    { x: 385, y: 1180 },
  ];

  for (const origin of origins) {
    for (const dest of destinations) {
      const path = buildOutpostCorridorPath(origin.x, origin.y, dest.x, dest.y);
      assert.ok(path.length >= 1, `Empty path to ${dest.label}`);

      const actor = { x: origin.x, y: origin.y, facing: 1, path: [...path] };
      let steps = 0;
      let arrived = false;
      while (steps < 900) {
        const res = advancePathFollower(actor, 180, 0.038);
        steps += 1;
        if (res.arrived) {
          arrived = true;
          break;
        }
      }
      assert.equal(arrived, true, `Failed to arrive at ${dest.label} from (${origin.x},${origin.y})`);
      assert.ok(
        Math.hypot(actor.x - dest.x, actor.y - dest.y) < 1,
        `Final position drift on ${dest.label}: (${actor.x},${actor.y}) vs (${dest.x},${dest.y})`
      );
      if (dest.expectedZone) {
        assert.equal(detectRoomAtPoint(actor.x, actor.y), dest.expectedZone, `Wrong zone at ${dest.label}`);
      }
    }
  }
});




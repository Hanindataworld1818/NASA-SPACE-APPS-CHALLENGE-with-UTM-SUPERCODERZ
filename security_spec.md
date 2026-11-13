# Security Specification (Phase 0: Payload-First Security TDD)

## 1. Data Invariants
1. **Identity & Email Verification**: Every write operation (`create`, `update`, `delete`) across `/missionLogs/{logId}`, `/customInstructions/{userId}`, and `/soundtracks/{trackId}` requires an authenticated user (`request.auth != null`) with `request.auth.token.email_verified == true`.
2. **Ownership Binding**: Every document's `ownerId` must strictly match `request.auth.uid`, and for `/customInstructions/{userId}`, the path variable `userId` must also equal `request.auth.uid`.
3. **Strict Schema & Volumetric Bounds**: Every document write must pass `hasAll` and `hasOnly` key checks, regex ID checks (`^[a-zA-Z0-9_\-]+$`, max 128 chars), string length bounds, numeric bounds, and `request.time` timestamp validation.
4. **Query Enforcer (No Blanket Reads)**: `list` and `get` queries must explicitly verify `resource.data.ownerId == request.auth.uid` so no user can read or scrape another user's records.
5. **Terminal State & Immutable Fields**: `ownerId` and `createdAt` are immutable on updates; terminal `MissionLog` documents (`outcome in ['victory', 'defeat']`) are locked against modification.

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Write**: Creating a `/missionLogs/log_1` document with `auth == null`.
2. **Unverified Email Spoof**: Creating a `/missionLogs/log_1` document where `auth.token.email_verified == false`.
3. **Cross-User Identity Spoofing**: Creating `/missionLogs/log_1` with `ownerId: "victim_uid"` while signed in as `"attacker_uid"`.
4. **Shadow Ghost Field Injection**: Creating `/missionLogs/log_1` with all required fields plus `isAdmin: true`.
5. **Path ID Poisoning**: Creating `/missionLogs/invalid$id!with*spaces` that violates `^[a-zA-Z0-9_\-]+$`.
6. **Denial-of-Wallet Oversized String**: Creating `/missionLogs/log_1` with a 5,000-character `summaryNote` (exceeding `maxLength: 500`).
7. **Forged Client Timestamp**: Creating `/missionLogs/log_1` with a past or future `createdAt` instead of `request.time`.
8. **Enum Violation**: Creating `/missionLogs/log_1` with `siteId: "pluto"` (not in `['moon', 'mars']`).
9. **Terminal State Mutation**: Attempting to `update` a `/missionLogs/log_1` document whose existing `outcome` is `'victory'`.
10. **Immutable Owner Transfer**: Updating `/customInstructions/user_1` to change `ownerId` to another UID.
11. **Cross-User Custom Instruction Path Hijack**: User `attacker_uid` writing to `/customInstructions/victim_uid`.
12. **Blanket List Scraping**: User `attacker_uid` listing `/missionLogs` without filtering `resource.data.ownerId == request.auth.uid`.

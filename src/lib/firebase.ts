import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export async function signInAstronaut() {
  return signInWithPopup(auth, googleProvider);
}

export async function signOutAstronaut() {
  return signOut(auth);
}

export interface CustomInstructionsData {
  commanderStyle: 'among_us_crew' | 'nasa_mission_control' | 'story_adventure' | 'science_coach';
  targetAgeGroup: '7-9' | '10-12' | 'classroom';
  customRules: string;
}

export const DEFAULT_CUSTOM_INSTRUCTIONS: CustomInstructionsData = {
  commanderStyle: 'among_us_crew',
  targetAgeGroup: '7-9',
  customRules:
    'Explain space science using fun Among-Us crewmate metaphors, short energetic sentences, and clear cause-and-effect choices that kids ages 7-12 immediately understand.',
};

const VALID_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

export async function saveCustomInstructionsToCloud(data: CustomInstructionsData): Promise<void> {
  const user = auth.currentUser;
  if (!user || !VALID_ID_REGEX.test(user.uid) || user.uid.length > 128) return;

  const safeRules = (data.customRules || DEFAULT_CUSTOM_INSTRUCTIONS.customRules)
    .trim()
    .slice(0, 600);
  const path = `customInstructions/${user.uid}`;

  try {
    await setDoc(doc(db, 'customInstructions', user.uid), {
      ownerId: user.uid,
      commanderStyle: data.commanderStyle,
      targetAgeGroup: data.targetAgeGroup,
      customRules: safeRules.length > 0 ? safeRules : DEFAULT_CUSTOM_INSTRUCTIONS.customRules,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function loadCustomInstructionsFromCloud(): Promise<CustomInstructionsData | null> {
  const user = auth.currentUser;
  if (!user || !VALID_ID_REGEX.test(user.uid) || user.uid.length > 128) return null;

  const path = `customInstructions/${user.uid}`;
  try {
    const snap = await getDoc(doc(db, 'customInstructions', user.uid));
    if (!snap.exists()) return null;
    const raw = snap.data();
    return {
      commanderStyle: raw.commanderStyle || 'among_us_crew',
      targetAgeGroup: raw.targetAgeGroup || '7-9',
      customRules: String(raw.customRules || DEFAULT_CUSTOM_INSTRUCTIONS.customRules).slice(0, 600),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export interface MissionLogInput {
  astronautName: string;
  siteId: 'moon' | 'mars';
  solReached: number;
  score: number;
  oxygenRemaining: number;
  radiationMsv: number;
  outcome: 'victory' | 'defeat' | 'in_progress';
  summaryNote: string;
  milestonesSummary?: string;
  personalNote?: string;
}

export async function saveMissionLogToCloud(input: MissionLogInput): Promise<void> {
  const user = auth.currentUser;
  if (!user || !VALID_ID_REGEX.test(user.uid) || user.uid.length > 128) return;

  const logId = `log_${user.uid.slice(0, 24)}_${Date.now()}`;
  const path = `missionLogs/${logId}`;
  const safeSummary =
    (input.summaryNote || 'Completed Junior Astronaut outpost shift.').trim().slice(0, 500) ||
    'Mission shift logged.';
  const safeMilestones =
    (input.milestonesSummary || safeSummary).trim().slice(0, 500) || safeSummary;
  const safePersonal =
    (input.personalNote || safeSummary).trim().slice(0, 400) || 'Mission observation recorded.';

  try {
    await setDoc(doc(db, 'missionLogs', logId), {
      ownerId: user.uid,
      astronautName: (input.astronautName || 'Junior Crewmate').trim().slice(0, 60) || 'Crewmate',
      siteId: input.siteId === 'moon' ? 'moon' : 'mars',
      solReached: Math.max(1, Math.min(7, Math.round(input.solReached))),
      score: Math.max(0, Math.min(100000, Math.round(input.score))),
      oxygenRemaining: Math.max(0, Math.min(100, Math.round(input.oxygenRemaining))),
      radiationMsv: Math.max(0, Math.min(1000, Number(input.radiationMsv.toFixed(1)))),
      outcome: input.outcome,
      summaryNote: safeSummary,
      milestonesSummary: safeMilestones,
      personalNote: safePersonal,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function listUserMissionLogsFromCloud(): Promise<
  Array<MissionLogInput & { id: string }>
> {
  const user = auth.currentUser;
  if (!user || !VALID_ID_REGEX.test(user.uid) || user.uid.length > 128) return [];

  const path = 'missionLogs';
  try {
    const q = query(collection(db, 'missionLogs'), where('ownerId', '==', user.uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        astronautName: String(data.astronautName || 'Crewmate'),
        siteId: data.siteId === 'moon' ? 'moon' : 'mars',
        solReached: Number(data.solReached || 1),
        score: Number(data.score || 0),
        oxygenRemaining: Number(data.oxygenRemaining || 0),
        radiationMsv: Number(data.radiationMsv || 0),
        outcome: data.outcome || 'in_progress',
        summaryNote: String(data.summaryNote || ''),
        milestonesSummary: String(data.milestonesSummary || data.summaryNote || ''),
        personalNote: String(data.personalNote || data.summaryNote || ''),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export interface SoundtrackInput {
  title: string;
  prompt: string;
  mood: 'calm_orbit' | 'solar_storm_alert' | 'hydroponic_zen' | 'victory_fanfare';
  bpm: number;
  lyrics: string;
}

export async function saveSoundtrackToCloud(input: SoundtrackInput): Promise<void> {
  const user = auth.currentUser;
  if (!user || !VALID_ID_REGEX.test(user.uid) || user.uid.length > 128) return;

  const trackId = `track_${user.uid.slice(0, 24)}_${Date.now()}`;
  const path = `soundtracks/${trackId}`;

  try {
    await setDoc(doc(db, 'soundtracks', trackId), {
      ownerId: user.uid,
      title: (input.title || 'Space Outpost Anthem').trim().slice(0, 80) || 'Outpost Anthem',
      prompt: (input.prompt || 'Space adventure').trim().slice(0, 300) || 'Space adventure',
      mood: input.mood,
      bpm: Math.max(60, Math.min(180, Math.round(input.bpm))),
      lyrics: (input.lyrics || 'Crewmates working on the Moon!').trim().slice(0, 600),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

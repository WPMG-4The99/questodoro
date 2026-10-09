import { create } from "zustand";
import { localDay, shiftDay } from "@/lib/utils";
import {
  BREAK_DEFAULT_SECONDS,
  DRILL_BREAK_SECONDS,
  DRILL_WORK_SECONDS,
  WORK_DEFAULT_SECONDS,
  clampBreakSeconds,
  clampWorkSeconds,
  xpForWork,
} from "@/lib/questodoro/rules";
import {
  MAX_CHECK_INS,
  parseCheckIns,
  type CheckInEntry,
  type CheckInKind,
} from "@/lib/questodoro/check-ins";
import { readCallSign } from "@/lib/questodoro/callsign";
import {
  emptyTogether,
  makeInviteCode,
  parseTogether,
  type TogetherRole,
  type TogetherStatus,
} from "@/lib/questodoro/together";
import {
  emptyRoom,
  readRoom,
  subscribeRoom,
  writeRoom,
  type TogetherRoom,
} from "@/lib/questodoro/room";
import { getQuestConfig } from "@/lib/questodoro/nona-config";
import {
  DEFAULT_MISSIONS,
  DEFAULT_REWARDS,
  MAX_MISSIONS,
  MAX_REWARDS,
  TOGETHER_SLOT,
  MISSION_COLORS,
  MISSION_XP,
  SIDE_XP_DAILY_CAP,
  BAIL_DOCK_XP,
  xpForMission,
  applyRez,
  pausePenaltyXp,
  pausedTotalMs,
  type BreakMission,
  type Mission,
  type Reward,
  type RewardRule,
  type RewardScope,
  newId,
  nextSelectedId,
  parseMissions,
  parseRewards,
  pickMission,
  clampMissionSeconds,
  syncRewardUnlocks,
  unlockContext,
} from "@/lib/questodoro/missions";

const SESSION_BOARD_KEY = "questodoro:v1";
const LEGACY_BOARD_KEY = "questodoro:v1";

export type DailyRollup = {
  dateKey: string;
  workXp: number;
  sideXp: number;
  totalXp: number;
  workBlocksFinished: number;
  focusMinutes: number;
};

export function yesterdayQuip(todayTotal: number, yesterdayTotal: number | null) {
  if (yesterdayTotal == null || todayTotal === yesterdayTotal) {
    return "First blood today. Make it count.";
  }
  if (todayTotal > yesterdayTotal) return "Beating yesterday. Hold the line.";
  return "Yesterday's still winning. Catch up.";
}

function emptyRollup(dateKey: string): DailyRollup {
  return {
    dateKey,
    workXp: 0,
    sideXp: 0,
    totalXp: 0,
    workBlocksFinished: 0,
    focusMinutes: 0,
  };
}

function parseRollup(raw: unknown): DailyRollup | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Partial<DailyRollup>;
  if (typeof row.dateKey !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.dateKey)) {
    return null;
  }
  const workXp = Math.max(0, Math.floor(Number(row.workXp) || 0));
  const sideXp = Math.max(0, Math.floor(Number(row.sideXp) || 0));
  const storedTotal = Math.max(0, Math.floor(Number(row.totalXp) || 0));
  return {
    dateKey: row.dateKey,
    workXp,
    sideXp,
    totalXp: storedTotal > 0 ? storedTotal : workXp + sideXp,
    workBlocksFinished: Math.max(0, Math.floor(Number(row.workBlocksFinished) || 0)),
    focusMinutes: Math.max(0, Math.floor(Number(row.focusMinutes) || 0)),
  };
}
export type Phase = "idle" | "work" | "break";
export type RunState = "stopped" | "running" | "paused";

export type MissionRun = {
  id: string;
  remainingMs: number;
  totalMs: number;
  endsAt: number | null;
  runState: RunState;
  pausedMs: number;
  pausedAt: number | null;
};

export type QuestStats = {
  totalXp: number;
  todayXp: number;
  todayDate: string;
  highScore: number;
  streak: number;
  lastActiveDay: string | null;
  blocksToday: number;
  missionStreak: number;
  sideXpToday: number;
  todayRollup: DailyRollup;
  yesterday: DailyRollup | null;
};

type PersistShape = QuestStats & {
  workSeconds: number;
  breakSeconds: number;
  missions: Mission[];
  rewards: Reward[];
  selectedMissionId: string | null;
  rotateIndex: number;
  completedIds: string[];
  checkIns: CheckInEntry[];
  partnerHandle: string;
  inviteCode: string;
  challengeTitle: string;
  togetherStatus: TogetherStatus;
  togetherRole: TogetherRole;
  togetherSelfDone: boolean;
  togetherPartnerDone: boolean;
  rezSick: boolean;
};

type QuestState = QuestStats & {
  hydrated: boolean;
  phase: Phase;
  runState: RunState;
  workSeconds: number;
  breakSeconds: number;
  remainingMs: number;
  endsAt: number | null;
  lastXpGain: number;
  lastMissionXp: number;
  banner: string | null;
  missions: Mission[];
  rewards: Reward[];
  selectedMissionId: string | null;
  rotateIndex: number;
  completedIds: string[];
  breakMission: BreakMission | null;
  missionRuns: MissionRun[];
  checkIns: CheckInEntry[];
  partnerHandle: string;
  inviteCode: string;
  challengeTitle: string;
  togetherStatus: TogetherStatus;
  togetherRole: TogetherRole;
  togetherSelfDone: boolean;
  togetherPartnerDone: boolean;
  rezSick: boolean;
  hydrate: () => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  checkIn: () => void;
  logCheckIn: (kind: CheckInKind) => void;
  invitePartner: (handle: string, title: string) => void;
  markPartnerIn: () => void;
  leaveTogether: () => void;
  joinWithCode: (code: string) => void;
  skipMission: () => void;
  selectMission: (id: string) => void;
  startMission: (id: string) => void;
  pauseMission: (id: string) => void;
  completeMission: (id: string) => void;
  addMission: () => void;
  updateMission: (
    id: string,
    patch: Partial<Pick<Mission, "title" | "brief" | "seconds" | "color" | "restart">>,
  ) => void;
  removeMission: (id: string) => void;
  bailMission: (id: string) => void;
  moveMission: (id: string, dir: -1 | 1) => void;
  addReward: (title: string, rule: RewardRule, scope?: RewardScope) => void;
  updateRewardTitle: (id: string, title: string) => void;
  removeReward: (id: string) => void;
  claimReward: (id: string) => void;
  setWorkMinutes: (minutes: number) => void;
  setBreakMinutes: (minutes: number) => void;
  armDrill: () => void;
  /** Work/break clock only. Must not read or write side-mission runs. */
  tickClock: (now: number) => void;
  /** Side-mission clocks only. Must not write the work/break clock. */
  tickMissions: (now: number) => void;
  tick: (now: number) => void;
  /** Snapshot yesterday if the local calendar day changed. Does not touch clocks. */
  rollIfNeeded: () => void;
  clearBanner: () => void;
};

export function isAwaitingCheckIn(phase: Phase, runState: RunState) {
  return phase === "break" && runState === "stopped";
}

function defaultStats(): QuestStats {
  const today = localDay();
  return {
    totalXp: 0,
    todayXp: 0,
    todayDate: today,
    highScore: 0,
    streak: 0,
    lastActiveDay: null,
    blocksToday: 0,
    missionStreak: 0,
    sideXpToday: 0,
    todayRollup: emptyRollup(today),
    yesterday: null,
  };
}

function persistFields(state: PersistShape): PersistShape {
  return {
    totalXp: state.totalXp,
    todayXp: state.todayXp,
    todayDate: state.todayDate,
    highScore: state.highScore,
    streak: state.streak,
    lastActiveDay: state.lastActiveDay,
    blocksToday: state.blocksToday,
    missionStreak: state.missionStreak,
    sideXpToday: state.sideXpToday,
    todayRollup: state.todayRollup,
    yesterday: state.yesterday,
    workSeconds: state.workSeconds,
    breakSeconds: state.breakSeconds,
    missions: state.missions,
    rewards: state.rewards,
    selectedMissionId: state.selectedMissionId,
    rotateIndex: state.rotateIndex,
    completedIds: state.completedIds,
    checkIns: state.checkIns,
    partnerHandle: state.partnerHandle,
    inviteCode: state.inviteCode,
    challengeTitle: state.challengeTitle,
    togetherStatus: state.togetherStatus,
    togetherRole: state.togetherRole,
    togetherSelfDone: state.togetherSelfDone,
    togetherPartnerDone: state.togetherPartnerDone,
    rezSick: state.rezSick,
  };
}

function savedTogether(raw: unknown) {
  const together = parseTogether(raw);
  if (together.togetherRole) return together;
  if (
    (together.togetherStatus === "invited" || together.togetherStatus === "together") &&
    together.partnerHandle
  ) {
    return { ...together, togetherRole: "host" as const };
  }
  if (together.togetherStatus === "together" && together.inviteCode) {
    return { ...together, togetherRole: "guest" as const };
  }
  return together;
}

function readPersist(): PersistShape | null {
  if (typeof window === "undefined") return null;
  try {
    let raw = window.sessionStorage.getItem(SESSION_BOARD_KEY);
    if (!raw) {
      raw = window.localStorage.getItem(LEGACY_BOARD_KEY);
      if (raw) {
        window.sessionStorage.setItem(SESSION_BOARD_KEY, raw);
        window.localStorage.removeItem(LEGACY_BOARD_KEY);
      }
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistShape>;
    const today = localDay();
    const storedDate =
      typeof parsed.todayDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.todayDate)
        ? parsed.todayDate
        : today;
    const rawTodayXp = Math.max(0, Number(parsed.todayXp) || 0);
    const rawBlocks = Math.max(0, Number(parsed.blocksToday) || 0);
    const rawSide = Math.min(
      SIDE_XP_DAILY_CAP,
      Math.max(0, Number(parsed.sideXpToday) || 0),
    );
    const missions = parseMissions(parsed.missions);
    const legacyRollup: DailyRollup = {
      dateKey: storedDate,
      sideXp: rawSide,
      workXp: Math.max(0, rawTodayXp - rawSide),
      totalXp: rawTodayXp,
      workBlocksFinished: rawBlocks,
      focusMinutes: 0,
    };
    const parsedBag = parsed as PersistShape & { todayRollup?: unknown; yesterday?: unknown };
    const todayRollup = parseRollup(parsedBag.todayRollup) ?? legacyRollup;
    const stats = rollDay({
      totalXp: Math.max(0, Number(parsed.totalXp) || 0),
      todayXp: rawTodayXp,
      todayDate: storedDate,
      highScore: Math.max(0, Number(parsed.highScore) || 0),
      streak: Math.max(0, Number(parsed.streak) || 0),
      lastActiveDay: parsed.lastActiveDay ?? null,
      blocksToday: rawBlocks,
      missionStreak: Math.max(0, Number(parsed.missionStreak) || 0),
      sideXpToday: rawSide,
      todayRollup: todayRollup.dateKey === storedDate ? todayRollup : legacyRollup,
      yesterday: parseRollup(parsedBag.yesterday),
    });
    const rewards = syncRewardUnlocks(parseRewards(parsed.rewards), {
      ...unlockContext(stats.totalXp, stats.streak, stats.missionStreak),
      today,
    });
    const selectedMissionId =
      typeof parsed.selectedMissionId === "string" ? parsed.selectedMissionId : null;
    return {
      ...stats,
      workSeconds: clampWorkSeconds(Number(parsed.workSeconds) || WORK_DEFAULT_SECONDS),
      breakSeconds: clampBreakSeconds(
        Number(parsed.breakSeconds) || BREAK_DEFAULT_SECONDS,
      ),
      missions,
      rewards,
      selectedMissionId:
        selectedMissionId && missions.some((m) => m.id === selectedMissionId)
          ? selectedMissionId
          : (missions[0]?.id ?? null),
      rotateIndex: Math.max(0, Number(parsed.rotateIndex) || 0),
      completedIds: Array.isArray(parsed.completedIds)
        ? parsed.completedIds.filter((id): id is string => typeof id === "string")
        : [],
      checkIns: parseCheckIns(parsed.checkIns),
      ...savedTogether(parsed),
      rezSick: parsed.rezSick === true,
    };
  } catch {
    return null;
  }
}

function writePersist(state: PersistShape) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(SESSION_BOARD_KEY, JSON.stringify(persistFields(state)));
}

function rollDay(stats: QuestStats): QuestStats {
  const today = localDay();
  const yKey = shiftDay(today, -1);
  const yesterdayOk =
    stats.yesterday && stats.yesterday.dateKey === yKey ? stats.yesterday : null;

  if (stats.todayDate === today) {
    const rollup =
      stats.todayRollup.dateKey === today ? stats.todayRollup : emptyRollup(today);
    if (rollup === stats.todayRollup && yesterdayOk === stats.yesterday) return stats;
    return { ...stats, todayRollup: rollup, yesterday: yesterdayOk };
  }

  return {
    ...stats,
    todayDate: today,
    todayXp: 0,
    blocksToday: 0,
    sideXpToday: 0,
    todayRollup: emptyRollup(today),
    yesterday: stats.todayDate === yKey ? { ...stats.todayRollup, dateKey: yKey } : null,
  };
}

function applyWorkComplete(stats: QuestStats, xp: number, workSeconds: number): QuestStats {
  const rolled = rollDay(stats);
  const today = rolled.todayDate;
  const yesterdayKey = shiftDay(today, -1);
  const firstToday = rolled.lastActiveDay !== today;
  let streak = rolled.streak;
  if (firstToday) {
    streak = rolled.lastActiveDay === yesterdayKey ? rolled.streak + 1 : 1;
  }
  const todayXp = rolled.todayXp + xp;
  const focusMinutes = Math.max(1, Math.round(workSeconds / 60));
  return {
    ...rolled,
    totalXp: rolled.totalXp + xp,
    todayXp,
    highScore: Math.max(rolled.highScore, todayXp),
    streak,
    lastActiveDay: today,
    blocksToday: rolled.blocksToday + 1,
    todayRollup: {
      dateKey: today,
      workXp: rolled.todayRollup.workXp + xp,
      sideXp: rolled.todayRollup.sideXp,
      totalXp: rolled.todayRollup.totalXp + xp,
      workBlocksFinished: rolled.todayRollup.workBlocksFinished + 1,
      focusMinutes: rolled.todayRollup.focusMinutes + focusMinutes,
    },
  };
}

function applyBonusXp(stats: QuestStats, xp: number): QuestStats {
  const rolled = rollDay(stats);
  const todayXp = rolled.todayXp + xp;
  return {
    ...rolled,
    totalXp: rolled.totalXp + xp,
    todayXp,
    highScore: Math.max(rolled.highScore, todayXp),
    todayRollup: {
      ...rolled.todayRollup,
      dateKey: rolled.todayDate,
      totalXp: rolled.todayRollup.totalXp + xp,
    },
  };
}

function withUnlocks<T extends PersistShape>(state: T): T {
  const rewards = syncRewardUnlocks(state.rewards, {
    ...unlockContext(state.totalXp, state.streak, state.missionStreak),
    today: state.todayDate,
    togetherDone: state.togetherSelfDone && state.togetherPartnerDone,
  });
  return { ...state, rewards };
}

function persistNow() {
  const s = useQuestStore.getState();
  writePersist(persistFields(s));
}

function dropRun(runs: MissionRun[], id: string) {
  return runs.filter((run) => run.id !== id);
}

/** Insert or replace without moving the run. Tick used to append, which reshuffled the clocks under the work ring. */
function replaceRun(runs: MissionRun[], run: MissionRun) {
  const idx = runs.findIndex((item) => item.id === run.id);
  if (idx < 0) return [...runs, run];
  const next = runs.slice();
  next[idx] = run;
  return next;
}

function statPatch(stats: QuestStats): QuestStats {
  return {
    totalXp: stats.totalXp,
    todayXp: stats.todayXp,
    todayDate: stats.todayDate,
    highScore: stats.highScore,
    streak: stats.streak,
    lastActiveDay: stats.lastActiveDay,
    blocksToday: stats.blocksToday,
    missionStreak: stats.missionStreak,
    sideXpToday: stats.sideXpToday,
    todayRollup: stats.todayRollup,
    yesterday: stats.yesterday,
  };
}

function subtractSideXp(stats: QuestStats, amount: number): QuestStats {
  const cut = Math.max(0, Math.floor(amount));
  const sideCut = Math.min(stats.sideXpToday, cut);
  const totalCut = Math.min(stats.totalXp, cut);
  const todayCut = Math.min(stats.todayXp, cut);
  const rollSide = Math.min(stats.todayRollup.sideXp, cut);
  const rollTotal = Math.min(stats.todayRollup.totalXp, cut);
  return {
    ...stats,
    sideXpToday: stats.sideXpToday - sideCut,
    totalXp: stats.totalXp - totalCut,
    todayXp: stats.todayXp - todayCut,
    todayRollup: {
      ...stats.todayRollup,
      sideXp: stats.todayRollup.sideXp - rollSide,
      totalXp: stats.todayRollup.totalXp - rollTotal,
    },
  };
}

function awardMissionComplete(s: QuestState, id: string): Partial<QuestState> {
  const mission = s.missions.find((m) => m.id === id);
  const missionRunsDropped = dropRun(s.missionRuns, id);
  if (!mission) return { missionRuns: missionRunsDropped };
  if (mission.restart === "once" && s.completedIds.includes(id)) {
    return { missionRuns: missionRunsDropped };
  }

  const run = s.missionRuns.find((item) => item.id === id);
  const pausedMs = run ? pausedTotalMs(run, Date.now()) : 0;
  const penalty = pausePenaltyXp(pausedMs);
  const rolled = rollDay(s);
  const sideCap = getQuestConfig().sideXpDailyCap;
  const room = Math.max(0, sideCap - rolled.sideXpToday);
  const net = Math.max(0, xpForMission(mission.seconds) - penalty);
  const capped = Math.min(net, room);
  const awarded = applyRez(capped, s.rezSick);
  const clearRez = s.rezSick && penalty === 0;
  const bonus = awarded > 0 ? applyBonusXp(rolled, awarded) : rolled;
  const stats: QuestStats = {
    ...bonus,
    sideXpToday: rolled.sideXpToday + awarded,
    todayRollup: {
      ...bonus.todayRollup,
      sideXp: bonus.todayRollup.sideXp + awarded,
    },
  };
  const completedIds =
    mission.restart === "once" ? [...s.completedIds, id] : s.completedIds.filter((item) => item !== id);
  const freshRun: MissionRun = {
    id,
    remainingMs: mission.seconds * 1000,
    totalMs: mission.seconds * 1000,
    endsAt: Date.now() + mission.seconds * 1000,
    runState: "running",
    pausedMs: 0,
    pausedAt: null,
  };
  const missionRuns =
    mission.restart === "auto" ? replaceRun(s.missionRuns, freshRun) : missionRunsDropped;
  const next = withUnlocks({
    ...s,
    ...stats,
    rezSick: clearRez ? false : s.rezSick,
    missionStreak: s.missionStreak + 1,
    selectedMissionId: id,
    completedIds,
  });
  writePersist(persistFields(next));
  const loss = penalty > 0 ? ` PAUSE -${penalty}.` : "";
  return {
    ...statPatch(next),
    rezSick: next.rezSick,
    rewards: next.rewards,
    selectedMissionId: next.selectedMissionId,
    completedIds: next.completedIds,
    missionRuns,
    lastMissionXp: awarded,
    banner: clearRez
      ? "CLEARED"
      : awarded <= 0
        ? `MISSION DONE: ${mission.title.toUpperCase()}.${loss} SIDE XP CAPPED (${sideCap}/DAY).`
        : `MISSION COMPLETE: ${mission.title.toUpperCase()}. +${awarded} XP.${loss}`,
  };
}

function beginBreakFromWork(s: QuestState, stats: QuestStats, workXp: number, now: number) {
  const picked = pickMission(s.missions, s.rotateIndex, s.selectedMissionId);
  const next = withUnlocks({
    ...s,
    ...stats,
    workSeconds: s.workSeconds,
    breakSeconds: s.breakSeconds,
    missions: s.missions,
    rewards: s.rewards,
    selectedMissionId: picked?.id ?? s.selectedMissionId,
    rotateIndex: s.rotateIndex,
    completedIds: s.completedIds,
  });
  writePersist(persistFields(next));
  // Clock fields only. Side runs stay on their own engine.
  return {
    ...statPatch(next),
    rewards: next.rewards,
    selectedMissionId: next.selectedMissionId,
    phase: "break" as const,
    runState: "running" as const,
    remainingMs: s.breakSeconds * 1000,
    endsAt: now + s.breakSeconds * 1000,
    lastXpGain: workXp,
    breakMission: null,
    banner: `WORK COMPLETE. +${workXp} XP. REST STARTED.`,
  };
}

function resolveMission(
  s: QuestState,
  outcome: "done" | "skipped",
): Partial<QuestState> {
  const remaining =
    s.runState === "paused" || s.runState === "running"
      ? s.remainingMs
      : s.breakSeconds * 1000;
  const currentId = s.breakMission?.id ?? s.selectedMissionId;
  const selectedMissionId = nextSelectedId(s.missions, currentId);
  let stats: QuestStats = s;
  let lastMissionXp = 0;
  let missionStreak = s.missionStreak;
  if (outcome === "done" && s.breakMission?.status === "pending") {
    lastMissionXp = MISSION_XP;
    missionStreak = s.missionStreak + 1;
    stats = applyBonusXp(s, MISSION_XP);
  } else if (outcome === "skipped" && s.breakMission?.status === "pending") {
    missionStreak = 0;
  }
  const next = withUnlocks({
    ...s,
    ...stats,
    missionStreak,
    selectedMissionId,
    rotateIndex: s.rotateIndex + 1,
    completedIds:
      outcome === "done" && s.breakMission?.id
        ? Array.from(new Set([...s.completedIds, s.breakMission.id]))
        : s.completedIds,
  });
  writePersist(persistFields(next));
  const title =
    s.missions.find((m) => m.id === s.breakMission?.id)?.title ?? "mission";
  return {
    ...next,
    phase: "break",
    runState: "running",
    remainingMs: remaining,
    endsAt: Date.now() + remaining,
    lastMissionXp,
    breakMission: s.breakMission
      ? { id: s.breakMission.id, status: outcome }
      : null,
    banner:
      outcome === "done"
        ? `MISSION COMPLETE: ${title.toUpperCase()}. +${MISSION_XP} XP.`
        : "MISSION SKIPPED. REST STILL COUNTS. BACK ON THE LINE AFTER.",
  };
}

let unwatchRoom = () => {};

function myHandle() {
  return readCallSign()?.handle ?? "";
}

function bindRoom(code: string) {
  unwatchRoom();
  if (!code || typeof window === "undefined") return;
  unwatchRoom = subscribeRoom(code, () => {
    const room = readRoom(code);
    if (room) ingestRoom(room);
  });
}

function applyMissionTitle(missions: Mission[], title: string) {
  if (!title || !missions[TOGETHER_SLOT]) return missions;
  if (missions[TOGETHER_SLOT].title === title) return missions;
  const next = missions.slice();
  next[TOGETHER_SLOT] = { ...next[TOGETHER_SLOT], title };
  return next;
}

function ingestRoom(room: TogetherRoom) {
  const s = useQuestStore.getState();
  if (s.inviteCode !== room.code || (s.togetherRole !== "host" && s.togetherRole !== "guest")) return;
  const me = myHandle();
  const selfDone = s.togetherRole === "host" ? room.hostDone : room.guestDone;
  const partnerDone = s.togetherRole === "host" ? room.guestDone : room.hostDone;
  let rewards = s.rewards;
  if (s.togetherRole === "guest") {
    for (const bribe of room.bribes) {
      if (rewards.some((reward) => reward.id === bribe.id)) continue;
      rewards = [
        ...rewards,
        {
          id: bribe.id,
          title: bribe.title,
          rule: { kind: "missions", at: 3 },
          scope: "together",
          unlockedAt: null,
          claimed: false,
        },
      ];
    }
  }
  const known = new Set(s.checkIns.map((entry) => entry.id));
  const extra = room.notes
    .filter((note) => !known.has(note.id))
    .map((note) => ({
      id: note.id,
      kind: note.kind,
      at: note.at,
      from: note.from,
      to: note.from === me ? s.partnerHandle : me,
    }));
  const checkIns = extra.length ? [...s.checkIns, ...extra].slice(-MAX_CHECK_INS) : s.checkIns;
  const missions = applyMissionTitle(s.missions, room.missionTitle);
  const unlockedRewards =
    selfDone && partnerDone
      ? syncRewardUnlocks(rewards, {
          ...unlockContext(s.totalXp, s.streak, s.missionStreak),
          today: s.todayDate,
          togetherDone: true,
        })
      : rewards;
  const partnerHandle =
    s.togetherRole === "guest" ? room.hostHandle || s.partnerHandle : room.guestHandle || s.partnerHandle;
  const togetherId = missions[TOGETHER_SLOT]?.id;
  const base = {
    togetherSelfDone: selfDone,
    togetherPartnerDone: partnerDone,
    challengeTitle: room.missionTitle || s.challengeTitle,
    partnerHandle,
    rewards: unlockedRewards,
    checkIns,
    missions,
  };
  if (selfDone && partnerDone && togetherId && !s.completedIds.includes(togetherId)) {
    useQuestStore.setState({
      ...base,
      ...awardMissionComplete({ ...s, ...base }, togetherId),
    });
  } else {
    useQuestStore.setState(base);
  }
  persistNow();
}

function markTogetherDone() {
  const s = useQuestStore.getState();
  const mission = s.missions[TOGETHER_SLOT];
  if (!mission || s.togetherStatus !== "together") return;
  if (s.togetherRole !== "host" && s.togetherRole !== "guest") return;
  if (s.completedIds.includes(mission.id) || s.togetherSelfDone) return;
  const room = s.inviteCode ? readRoom(s.inviteCode) : null;
  const nextRoom = room
    ? {
        ...room,
        hostDone: s.togetherRole === "host" ? true : room.hostDone,
        guestDone: s.togetherRole === "guest" ? true : room.guestDone,
      }
    : null;
  if (nextRoom) writeRoom(nextRoom);
  const partnerDone = nextRoom
    ? s.togetherRole === "host"
      ? nextRoom.guestDone
      : nextRoom.hostDone
    : s.togetherPartnerDone;
  if (partnerDone) {
    useQuestStore.setState(
      awardMissionComplete(
        { ...s, togetherSelfDone: true, togetherPartnerDone: true },
        mission.id,
      ),
    );
  } else {
    useQuestStore.setState({
      togetherSelfDone: true,
      togetherPartnerDone: partnerDone,
      banner: "YOU MARKED THE TOGETHER MISSION. WAIT FOR YOUR PARTNER.",
    });
  }
  persistNow();
}

export const useQuestStore = create<QuestState>((set, get) => ({
  ...defaultStats(),
  hydrated: false,
  phase: "idle",
  runState: "stopped",
  workSeconds: WORK_DEFAULT_SECONDS,
  breakSeconds: BREAK_DEFAULT_SECONDS,
  remainingMs: WORK_DEFAULT_SECONDS * 1000,
  endsAt: null,
  lastXpGain: 0,
  lastMissionXp: 0,
  banner: null,
  missions: DEFAULT_MISSIONS.map((m) => ({ ...m })),
  rewards: DEFAULT_REWARDS.map((r) => ({ ...r })),
  selectedMissionId: DEFAULT_MISSIONS[0]?.id ?? null,
  rotateIndex: 0,
  completedIds: [],
  breakMission: null,
  missionRuns: [],
  checkIns: [],
  ...emptyTogether(),
  rezSick: false,

  hydrate: () => {
    if (get().hydrated) return;
    const saved = readPersist();
    if (!saved) {
      set({ hydrated: true });
      return;
    }
    const rolled = rollDay(saved);
    const next = withUnlocks({ ...saved, ...rolled });
    set({
      ...next,
      remainingMs: saved.workSeconds * 1000,
      phase: "idle",
      runState: "stopped",
      endsAt: null,
      breakMission: null,
      missionRuns: [],
      hydrated: true,
    });
    persistNow();
    if (saved.inviteCode) {
      bindRoom(saved.inviteCode);
      const room = readRoom(saved.inviteCode);
      if (room) ingestRoom(room);
    }
  },

  start: () => {
    const s = get();
    if (s.runState === "running") return;
    const phase: Phase = s.phase === "break" ? "break" : "work";
    const remaining =
      s.runState === "paused"
        ? s.remainingMs
        : (phase === "break" ? s.breakSeconds : s.workSeconds) * 1000;
    set({
      phase,
      runState: "running",
      remainingMs: remaining,
      endsAt: Date.now() + remaining,
      banner: phase === "work" ? "ON THE LINE. HOLD THE BLOCK." : "REST. MISSIONS STAY ON DEMAND.",
    });
  },

  pause: () => {
    const s = get();
    if (s.runState !== "running") return;
    const remaining = Math.max(0, (s.endsAt ?? Date.now()) - Date.now());
    set({
      runState: "paused",
      remainingMs: remaining,
      endsAt: null,
      banner: "HELD. RESUME WHEN READY.",
    });
  },

  reset: () => {
    const s = get();
    set({
      phase: "idle",
      runState: "stopped",
      remainingMs: s.workSeconds * 1000,
      endsAt: null,
      breakMission: null,
      banner: "RESET. STAND BY.",
    });
  },

  checkIn: () => {
    const s = get();
    if (s.phase !== "break") return;
    if (s.breakMission?.status === "done") return;
    if (s.breakMission?.status === "skipped") {
      if (s.runState === "stopped") {
        set({
          runState: "running",
          remainingMs: s.breakSeconds * 1000,
          endsAt: Date.now() + s.breakSeconds * 1000,
        });
      }
      return;
    }
    if (!isAwaitingCheckIn(s.phase, s.runState) && s.breakMission?.status !== "pending") {
      return;
    }
    set(resolveMission(s, "done"));
  },

  logCheckIn: (kind: CheckInKind) => {
    const s = get();
    const from = myHandle();
    const entry: CheckInEntry = {
      id: newId("c"),
      kind,
      at: Date.now(),
      to: s.partnerHandle,
      from,
    };
    set({ checkIns: [...s.checkIns, entry].slice(-MAX_CHECK_INS) });
    const room = s.inviteCode ? readRoom(s.inviteCode) : null;
    if (room && from) {
      writeRoom({
        ...room,
        notes: [...room.notes, { id: entry.id, kind, from, at: entry.at }].slice(-MAX_CHECK_INS),
      });
    }
    persistNow();
  },

  invitePartner: (handle: string, title: string) => {
    const partnerHandle = handle.trim().slice(0, 16);
    if (partnerHandle.length < 2) return;
    const challengeTitle = title.trim().slice(0, 32) || "Hold the line";
    const inviteCode = makeInviteCode();
    const missions = applyMissionTitle(get().missions, challengeTitle);
    set({
      partnerHandle,
      challengeTitle,
      inviteCode,
      togetherStatus: "invited",
      togetherRole: "host",
      togetherSelfDone: false,
      togetherPartnerDone: false,
      missions,
    });
    writeRoom({
      ...emptyRoom(inviteCode, myHandle(), challengeTitle),
      guestHandle: partnerHandle,
    });
    bindRoom(inviteCode);
    persistNow();
  },

  markPartnerIn: () => {
    const s = get();
    if (!s.partnerHandle || !s.inviteCode) return;
    set({ togetherStatus: "together" });
    persistNow();
  },

  leaveTogether: () => {
    unwatchRoom();
    set(emptyTogether());
    persistNow();
  },

  joinWithCode: (code: string) => {
    const inviteCode = code.trim().toUpperCase().slice(0, 8);
    if (inviteCode.length < 4) return;
    const s = get();
    const room = readRoom(inviteCode);
    const me = myHandle();
    if (room && me && room.guestHandle !== me) {
      writeRoom({ ...room, guestHandle: me });
    }
    const challengeTitle = room?.missionTitle || s.challengeTitle;
    const missions = applyMissionTitle(s.missions, challengeTitle);
    set({
      inviteCode,
      togetherStatus: "together",
      togetherRole: room ? "guest" : s.togetherRole || "guest",
      partnerHandle: room?.hostHandle || s.partnerHandle,
      challengeTitle,
      missions,
      togetherSelfDone: room ? room.guestDone : false,
      togetherPartnerDone: room ? room.hostDone : false,
    });
    bindRoom(inviteCode);
    if (room) ingestRoom(readRoom(inviteCode) ?? room);
    persistNow();
  },

  skipMission: () => {
    const s = get();
    if (s.phase !== "break") return;
    if (s.breakMission?.status !== "pending") {
      if (isAwaitingCheckIn(s.phase, s.runState)) {
        set({
          runState: "running",
          remainingMs: s.breakSeconds * 1000,
          endsAt: Date.now() + s.breakSeconds * 1000,
          banner: "REST STARTED. NO MISSION ON DECK.",
        });
      }
      return;
    }
    set(resolveMission(s, "skipped"));
  },

  selectMission: (id: string) => {
    const s = get();
    if (!s.missions.some((m) => m.id === id)) return;
    const breakMission =
      s.phase === "break" && s.breakMission?.status === "pending"
        ? { id, status: "pending" as const }
        : s.breakMission;
    set({ selectedMissionId: id, breakMission });
    persistNow();
  },

  completeMission: (id: string) => {
    const s = get();
    if (s.missions[TOGETHER_SLOT]?.id === id) {
      markTogetherDone();
      return;
    }
    set(awardMissionComplete(s, id));
    persistNow();
  },

  startMission: (id: string) => {
    const s = get();
    const mission = s.missions.find((m) => m.id === id);
    if (!mission) return;
    if (s.missions[TOGETHER_SLOT]?.id === id && s.togetherStatus !== "together") return;
    const existing = s.missionRuns.find((run) => run.id === id);
    if (existing?.runState === "running") return;
    const liveCount = s.missionRuns.filter(
      (run) => run.runState === "running" || run.runState === "paused",
    ).length;
    const maxLive = getQuestConfig().maxLiveMissions;
    if (!existing && liveCount >= maxLive) {
      set({ banner: `MAX ${maxLive} SIDE MISSIONS LIVE.` });
      return;
    }
    const remaining =
      existing?.runState === "paused"
        ? Math.max(0, existing.remainingMs)
        : mission.seconds * 1000;
    if (remaining <= 0) {
      set(awardMissionComplete(s, id));
      persistNow();
      return;
    }
    const now = Date.now();
    const pausedMs =
      existing?.runState === "paused"
        ? pausedTotalMs(
            { pausedMs: existing.pausedMs ?? 0, pausedAt: existing.pausedAt ?? null },
            now,
          )
        : 0;
    const run: MissionRun = {
      id,
      remainingMs: remaining,
      totalMs: existing?.totalMs ?? remaining,
      endsAt: now + remaining,
      runState: "running",
      pausedMs,
      pausedAt: null,
    };
    set({
      selectedMissionId: id,
      missionRuns: replaceRun(s.missionRuns, run),
      completedIds: s.completedIds.filter((item) => item !== id),
      banner: `SIDE MISSION LIVE: ${mission.title.toUpperCase()}.`,
    });
  },

  pauseMission: (id: string) => {
    const s = get();
    const existing = s.missionRuns.find((run) => run.id === id);
    if (!existing || existing.runState !== "running") return;
    const remaining = Math.max(0, (existing.endsAt ?? Date.now()) - Date.now());
    set({
      missionRuns: replaceRun(s.missionRuns, {
        ...existing,
        runState: "paused",
        remainingMs: remaining,
        endsAt: null,
        pausedMs: existing.pausedMs ?? 0,
        pausedAt: Date.now(),
      }),
      banner: "MISSION PAUSED.",
    });
  },

  addMission: () => {
    const s = get();
    if (s.missions.length >= MAX_MISSIONS) return;
    const mission: Mission = {
      id: newId("m"),
      title: "Custom",
      brief: "Your one-liner.",
      seconds: 30,
      editsLeft: 1,
      color: MISSION_COLORS.find((item) => !s.missions.some((mission) => mission.color === item)) ?? "red",
      restart: "once",
    };
    set({ missions: [...s.missions, mission], selectedMissionId: mission.id });
    persistNow();
  },

  updateMission: (id, patch) => {
    const s = get();
    if (s.missions[TOGETHER_SLOT]?.id === id) return;
    const missions = s.missions.map((m) => {
      if (m.id !== id) return m;
      const nextTitle = patch.title !== undefined ? patch.title.slice(0, 32) : m.title;
      const nextSeconds =
        patch.seconds === undefined ? m.seconds : clampMissionSeconds(patch.seconds);
      const nextColor = patch.color ?? m.color;
      const locks =
        nextTitle !== m.title || nextSeconds !== m.seconds || nextColor !== m.color;
      if (locks && m.editsLeft <= 0) return m;
      return {
        ...m,
        title: nextTitle,
        brief: patch.brief !== undefined ? patch.brief.slice(0, 80) : m.brief,
        seconds: nextSeconds,
        color: nextColor,
        restart: patch.restart ?? m.restart,
        editsLeft: locks ? 0 : m.editsLeft,
      };
    });
    set({ missions });
    persistNow();
  },

  bailMission: (id) => {
    const s = get();
    const mission = s.missions.find((m) => m.id === id);
    if (!mission || mission.editsLeft > 0) return;
    const today = localDay();
    const docked = subtractSideXp(
      subtractSideXp(rollDay(s), xpForMission(mission.seconds)),
      BAIL_DOCK_XP,
    );
    const missions = s.missions.filter((m) => m.id !== id);
    const selectedMissionId =
      s.selectedMissionId === id ? (missions[0]?.id ?? null) : s.selectedMissionId;
    const next = withUnlocks({
      ...s,
      ...docked,
      streak: 0,
      lastActiveDay: today,
      rezSick: true,
      missions,
      selectedMissionId,
      missionRuns: dropRun(s.missionRuns, id),
    });
    set({
      ...statPatch(next),
      rezSick: true,
      rewards: next.rewards,
      missions,
      selectedMissionId,
      missionRuns: next.missionRuns,
      banner: "REZ SICK.",
    });
    persistNow();
  },

  removeMission: (id) => {
    const s = get();
    if (s.missions[TOGETHER_SLOT]?.id === id) return;
    const missions = s.missions.filter((m) => m.id !== id);
    const selectedMissionId =
      s.selectedMissionId === id ? (missions[0]?.id ?? null) : s.selectedMissionId;
    const breakMission =
      s.breakMission?.id === id
        ? selectedMissionId
          ? { id: selectedMissionId, status: s.breakMission.status }
          : null
        : s.breakMission;
    set({
      missions,
      selectedMissionId,
      breakMission,
      missionRuns: dropRun(s.missionRuns, id),
    });
    persistNow();
  },

  moveMission: (id, dir) => {
    const s = get();
    const idx = s.missions.findIndex((m) => m.id === id);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= s.missions.length) return;
    if (idx === TOGETHER_SLOT || next === TOGETHER_SLOT) return;
    const missions = s.missions.slice();
    const [row] = missions.splice(idx, 1);
    missions.splice(next, 0, row);
    set({ missions });
    persistNow();
  },

  addReward: (title, rule, scope: RewardScope = "solo") => {
    const s = get();
    if (s.rewards.length >= MAX_REWARDS) return;
    if (scope === "together" && s.togetherRole !== "host") return;
    const trimmed = title.trim().slice(0, 32);
    if (trimmed.length < 2) return;
    const reward: Reward = {
      id: newId("r"),
      title: trimmed,
      rule,
      scope,
      unlockedAt: null,
      claimed: false,
    };
    if (scope === "together" && s.inviteCode) {
      const room = readRoom(s.inviteCode);
      if (room) {
        writeRoom({
          ...room,
          bribes: [...room.bribes, { id: reward.id, title: reward.title }].slice(0, MAX_REWARDS),
        });
      }
    }
    const rewards = syncRewardUnlocks([...s.rewards, reward], {
      ...unlockContext(s.totalXp, s.streak, s.missionStreak),
      today: s.todayDate,
      togetherDone: s.togetherSelfDone && s.togetherPartnerDone,
    });
    set({ rewards });
    persistNow();
  },

  updateRewardTitle: (id, title) => {
    const s = get();
    const rewards = s.rewards.map((r) =>
      r.id === id ? { ...r, title: title.slice(0, 32) } : r,
    );
    set({ rewards });
    persistNow();
  },

  removeReward: (id) => {
    set({ rewards: get().rewards.filter((r) => r.id !== id) });
    persistNow();
  },

  claimReward: (id) => {
    const s = get();
    const rewards = s.rewards.map((r) => {
      if (r.id !== id) return r;
      if (!r.unlockedAt && !r.claimed) return r;
      return { ...r, claimed: !r.claimed };
    });
    set({ rewards });
    persistNow();
  },

  setWorkMinutes: (minutes: number) => {
    const s = get();
    if (s.runState !== "stopped" || s.phase === "break") return;
    const workSeconds = clampWorkSeconds(minutes * 60);
    set({
      workSeconds,
      remainingMs: workSeconds * 1000,
    });
    persistNow();
  },

  setBreakMinutes: (minutes: number) => {
    const s = get();
    if (s.runState !== "stopped" || s.phase === "break") return;
    const breakSeconds = clampBreakSeconds(minutes * 60);
    set({ breakSeconds });
    persistNow();
  },

  armDrill: () => {
    const s = get();
    if (s.runState !== "stopped" || s.phase === "break") return;
    set({
      workSeconds: DRILL_WORK_SECONDS,
      breakSeconds: DRILL_BREAK_SECONDS,
      remainingMs: DRILL_WORK_SECONDS * 1000,
      phase: "idle",
      banner: "DRILL ARMED. 15s WORK / 20s BREAK.",
    });
    persistNow();
  },

  tickClock: (now: number) => {
    const s = get();
    if (s.runState !== "running" || s.endsAt == null) return;
    const remaining = Math.max(0, s.endsAt - now);
    if (remaining <= 0) {
      if (s.phase === "work") {
        const xp = applyRez(xpForWork(s.workSeconds), s.rezSick);
        const stats = applyWorkComplete(s, xp, s.workSeconds);
        set(beginBreakFromWork(s, stats, xp, now));
      } else {
        set({
          phase: "idle",
          runState: "stopped",
          remainingMs: s.workSeconds * 1000,
          endsAt: null,
          breakMission: null,
          banner: "BREAK DONE. START THE NEXT BLOCK.",
        });
      }
      return;
    }
    if (Math.abs(remaining - s.remainingMs) >= 200) {
      set({ remainingMs: remaining });
    }
  },

  tickMissions: (now: number) => {
    const s = get();
    const expired: string[] = [];
    let changed = false;
    const missionRuns = s.missionRuns.map((run) => {
      if (run.runState !== "running" || run.endsAt == null) return run;
      const left = Math.max(0, run.endsAt - now);
      if (left <= 0) {
        expired.push(run.id);
        return run;
      }
      if (Math.abs(left - run.remainingMs) >= 200) {
        changed = true;
        return { ...run, remainingMs: left };
      }
      return run;
    });
    if (changed) set({ missionRuns });
    for (const id of expired) {
      const current = get();
      if (current.missions[TOGETHER_SLOT]?.id === id) {
        set({
          missionRuns: dropRun(current.missionRuns, id),
          banner: "TOGETHER MISSION ENDED. MARK IT DONE.",
        });
        continue;
      }
      set(awardMissionComplete(get(), id));
    }
  },

  tick: (now: number) => {
    get().tickClock(now);
    get().tickMissions(now);
  },

  rollIfNeeded: () => {
    const s = get();
    const rolled = rollDay(s);
    if (
      rolled.todayDate === s.todayDate &&
      rolled.todayXp === s.todayXp &&
      rolled.blocksToday === s.blocksToday &&
      rolled.sideXpToday === s.sideXpToday &&
      rolled.todayRollup === s.todayRollup &&
      rolled.yesterday === s.yesterday
    ) {
      return;
    }
    const rewards = syncRewardUnlocks(s.rewards, {
      ...unlockContext(rolled.totalXp, rolled.streak, rolled.missionStreak),
      today: rolled.todayDate,
      togetherDone: s.togetherSelfDone && s.togetherPartnerDone,
    });
    set({
      ...statPatch(rolled),
      rewards,
    });
    persistNow();
  },

  clearBanner: () => set({ banner: null }),
}));

export function activeBreakMission(state: {
  missions: Mission[];
  breakMission: BreakMission | null;
  selectedMissionId: string | null;
  rotateIndex: number;
}) {
  if (state.breakMission) {
    return state.missions.find((m) => m.id === state.breakMission?.id) ?? null;
  }
  return pickMission(state.missions, state.rotateIndex, state.selectedMissionId);
}

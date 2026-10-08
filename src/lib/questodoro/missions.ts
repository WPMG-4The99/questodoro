import { rankFromXp } from "@/lib/questodoro/rules";

export const MISSION_XP = 8;
export const MAX_MISSIONS = 3;
export const MAX_LIVE_MISSIONS = 3;
export const SIDE_XP_DAILY_CAP = 100;
export const MAX_REWARDS = 8;
export const MISSION_LENGTH_MIN = 5;
export const MISSION_LENGTH_MAX = 600;
export const MISSION_LENGTH_STEP = 5;
export const PAUSE_GRACE_MS = 2 * 60 * 1000;
export const BAIL_DOCK_XP = 5;

export const MISSION_COLORS = ["red", "purple", "gold"] as const;
export type MissionColor = (typeof MISSION_COLORS)[number];
export type MissionRestart = "once" | "auto";

export type Mission = {
  id: string;
  title: string;
  brief: string;
  seconds: number;
  editsLeft: number;
  color: MissionColor;
  restart: MissionRestart;
};

export type RewardKind = "level" | "streak" | "missions";

export type RewardRule = {
  kind: RewardKind;
  at: number;
};

export type Reward = {
  id: string;
  title: string;
  rule: RewardRule;
  unlockedAt: string | null;
  claimed: boolean;
};

export type BreakMission = {
  id: string;
  status: "pending" | "done" | "skipped";
};

export const DEFAULT_MISSIONS: Mission[] = [
  {
    id: "m-drops",
    title: "Eye drops",
    brief: "Drip and check in.",
    seconds: 30,
    editsLeft: 1,
    color: "red",
    restart: "once",
  },
  {
    id: "m-stretch",
    title: "Stand and stretch",
    brief: "On your feet.",
    seconds: 60,
    editsLeft: 1,
    color: "purple",
    restart: "once",
  },
  {
    id: "m-water",
    title: "Water hit",
    brief: "Drink and check in.",
    seconds: 20,
    editsLeft: 1,
    color: "gold",
    restart: "once",
  },
];

export const DEFAULT_REWARDS: Reward[] = [
  {
    id: "r-coffee",
    title: "Coffee",
    rule: { kind: "missions", at: 3 },
    unlockedAt: null,
    claimed: false,
  },
  {
    id: "r-game",
    title: "20 min game",
    rule: { kind: "streak", at: 3 },
    unlockedAt: null,
    claimed: false,
  },
];

export const REWARD_PRESETS: { label: string; rule: RewardRule }[] = [
  { label: "Level 2", rule: { kind: "level", at: 2 } },
  { label: "Level 3", rule: { kind: "level", at: 3 } },
  { label: "Streak 3", rule: { kind: "streak", at: 3 } },
  { label: "Streak 7", rule: { kind: "streak", at: 7 } },
  { label: "3 check-ins in a row", rule: { kind: "missions", at: 3 } },
  { label: "5 check-ins in a row", rule: { kind: "missions", at: 5 } },
];

export function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function liveMissions(missions: Mission[]) {
  return missions.filter((m) => m.title.trim().length > 0);
}

export function clampMissionSeconds(seconds: number) {
  const stepped = Math.round(seconds / MISSION_LENGTH_STEP) * MISSION_LENGTH_STEP;
  return Math.min(MISSION_LENGTH_MAX, Math.max(MISSION_LENGTH_MIN, stepped));
}

/** 1 XP per 5 seconds, bounded to 2–20. Daily side total is capped separately. */
export function xpForMission(seconds: number) {
  return Math.min(20, Math.max(2, Math.round(clampMissionSeconds(seconds) / 5)));
}

/** Full minutes paused after the 2-minute grace. Each minute is 1 side XP. */
export function pausePenaltyXp(pausedMs: number) {
  const past = Math.max(0, pausedMs - PAUSE_GRACE_MS);
  return Math.floor(past / 60_000);
}

export function pausedTotalMs(
  run: { pausedMs: number; pausedAt: number | null },
  now: number,
) {
  if (run.pausedAt == null) return run.pausedMs;
  return run.pausedMs + Math.max(0, now - run.pausedAt);
}

/** REZ SICK multiplies earned XP by 0.75. Round down. */
export function applyRez(xp: number, rezSick: boolean) {
  if (!rezSick || xp <= 0) return xp;
  return Math.floor(xp * 0.75);
}

export function pickMission(
  missions: Mission[],
  rotateIndex: number,
  selectedId: string | null,
): Mission | null {
  const live = liveMissions(missions);
  if (live.length === 0) return null;
  if (selectedId) {
    const hit = live.find((m) => m.id === selectedId);
    if (hit) return hit;
  }
  return live[Math.abs(rotateIndex) % live.length] ?? live[0];
}

export function nextSelectedId(missions: Mission[], currentId: string | null) {
  const live = liveMissions(missions);
  if (live.length === 0) return null;
  const idx = Math.max(
    0,
    live.findIndex((m) => m.id === currentId),
  );
  return live[(idx + 1) % live.length]?.id ?? live[0].id;
}

export function ruleLabel(rule: RewardRule) {
  if (rule.kind === "level") return `Unlock at level ${rule.at}`;
  if (rule.kind === "streak") return `Unlock at ${rule.at}-day streak`;
  return `Unlock at ${rule.at} check-ins in a row`;
}

export function presetKey(rule: RewardRule) {
  return `${rule.kind}:${rule.at}`;
}

export function parsePreset(value: string): RewardRule {
  const [kind, atRaw] = value.split(":");
  const at = Math.max(1, Number(atRaw) || 1);
  if (kind === "level" || kind === "streak" || kind === "missions") {
    return { kind, at };
  }
  return { kind: "missions", at: 3 };
}

export function rewardMeets(
  reward: Reward,
  ctx: { level: number; streak: number; missionStreak: number },
) {
  if (reward.rule.kind === "level") return ctx.level >= reward.rule.at;
  if (reward.rule.kind === "streak") return ctx.streak >= reward.rule.at;
  return ctx.missionStreak >= reward.rule.at;
}

export function syncRewardUnlocks(
  rewards: Reward[],
  ctx: { level: number; streak: number; missionStreak: number; today: string },
): Reward[] {
  return rewards.map((reward) => {
    if (reward.unlockedAt) return reward;
    if (!rewardMeets(reward, ctx)) return reward;
    return { ...reward, unlockedAt: ctx.today };
  });
}

export function unlockContext(totalXp: number, streak: number, missionStreak: number) {
  return {
    level: rankFromXp(totalXp).level,
    streak,
    missionStreak,
  };
}

function asMission(raw: unknown, index: number): Mission | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Partial<Mission>;
  const title = typeof row.title === "string" ? row.title.slice(0, 32) : "";
  const brief = typeof row.brief === "string" ? row.brief.slice(0, 80) : "";
  const id = typeof row.id === "string" && row.id ? row.id : newId("m");
  const seconds = clampMissionSeconds(
    typeof row.seconds === "number" && row.seconds > 0 ? row.seconds : 30,
  );
  const color: MissionColor = MISSION_COLORS.includes(row.color as MissionColor)
    ? (row.color as MissionColor)
    : MISSION_COLORS[index] ?? "red";
  const restart: MissionRestart = row.restart === "auto" ? "auto" : "once";
  const editsLeft = row.editsLeft === 0 ? 0 : 1;
  return { id, title, brief, seconds, editsLeft, color, restart };
}

function asReward(raw: unknown): Reward | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Partial<Reward> & { rule?: Partial<RewardRule> };
  const title = typeof row.title === "string" ? row.title.slice(0, 32) : "";
  if (!title) return null;
  const kind = row.rule?.kind;
  const rule: RewardRule =
    kind === "level" || kind === "streak" || kind === "missions"
      ? { kind, at: Math.max(1, Number(row.rule?.at) || 1) }
      : { kind: "missions", at: 3 };
  const id = typeof row.id === "string" && row.id ? row.id : newId("r");
  return {
    id,
    title,
    rule,
    unlockedAt: typeof row.unlockedAt === "string" ? row.unlockedAt : null,
    claimed: Boolean(row.claimed),
  };
}

export function parseMissions(raw: unknown): Mission[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_MISSIONS.map((m) => ({ ...m }));
  const list = raw
    .map((row, index) => asMission(row, index))
    .filter((m): m is Mission => m !== null);
  return list.slice(0, MAX_MISSIONS);
}

export function parseRewards(raw: unknown): Reward[] {
  if (!Array.isArray(raw)) return DEFAULT_REWARDS.map((r) => ({ ...r }));
  const list = raw.map(asReward).filter((r): r is Reward => r !== null);
  return list.slice(0, MAX_REWARDS);
}

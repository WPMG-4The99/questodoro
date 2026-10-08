export const CHECK_IN_PRESETS = [
  { kind: "how-ya", label: "How you doing?" },
  { kind: "push", label: "Rough patch, need a push" },
  { kind: "almost", label: "Almost there!" },
] as const;

export const CHECK_IN_REPLIES = [
  { kind: "all-right", label: "Doing all right" },
  { kind: "push", label: "Rough patch, need a push" },
  { kind: "almost", label: "Almost there!" },
] as const;

export type CheckInKind =
  | (typeof CHECK_IN_PRESETS)[number]["kind"]
  | (typeof CHECK_IN_REPLIES)[number]["kind"]
  | "grinding";

export type CheckInEntry = {
  id: string;
  kind: CheckInKind;
  at: number;
  /** Handle the ping was sent to. Empty when no one was on the challenge yet. */
  to: string;
  /** Handle that sent the ping. Empty on older saved rows. */
  from: string;
};

export const MAX_CHECK_INS = 40;

const LABELS: Record<CheckInKind, string> = {
  "how-ya": "How you doing?",
  grinding: "GRINDING",
  push: "Rough patch, need a push",
  almost: "Almost there!",
  "all-right": "Doing all right",
};

const KINDS = new Set<string>(Object.keys(LABELS));

export function checkInLabel(kind: CheckInKind) {
  return LABELS[kind] ?? kind;
}

export function parseCheckIns(raw: unknown): CheckInEntry[] {
  if (!Array.isArray(raw)) return [];
  const list: CheckInEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Partial<CheckInEntry>;
    if (typeof row.kind !== "string" || !KINDS.has(row.kind)) continue;
    const at = Number(row.at);
    if (!Number.isFinite(at)) continue;
    const id = typeof row.id === "string" && row.id ? row.id : `c-${list.length}`;
    const to = typeof row.to === "string" ? row.to.slice(0, 16) : "";
    const from = typeof row.from === "string" ? row.from.slice(0, 16) : "";
    list.push({ id, kind: row.kind as CheckInKind, at, to, from });
  }
  return list.slice(-MAX_CHECK_INS);
}

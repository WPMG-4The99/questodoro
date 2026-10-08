export const CHECK_IN_PRESETS = [
  { kind: "how-ya", label: "HOW YA" },
  { kind: "grinding", label: "GRINDING" },
  { kind: "push", label: "PUSH" },
] as const;

export type CheckInKind = (typeof CHECK_IN_PRESETS)[number]["kind"];

export type CheckInEntry = {
  id: string;
  kind: CheckInKind;
  at: number;
  /** Handle the ping was sent to. Empty when no one was on the challenge yet. */
  to: string;
};

export const MAX_CHECK_INS = 40;

const KINDS = new Set<string>(CHECK_IN_PRESETS.map((preset) => preset.kind));

export function checkInLabel(kind: CheckInKind) {
  return CHECK_IN_PRESETS.find((preset) => preset.kind === kind)?.label ?? kind;
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
    list.push({ id, kind: row.kind as CheckInKind, at, to });
  }
  return list.slice(-MAX_CHECK_INS);
}

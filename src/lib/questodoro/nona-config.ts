import { useSyncExternalStore } from "react";

/** Nona environment on project hackyard-yard4. */
const NONA_ENVIRONMENT = "Production";
const POLL_MS = 30_000;
const TIMEOUT_MS = 4_000;

export const NONA_KEYS = {
  maxLiveMissions: "Limits:MaxLiveMissions",
  sideXpDailyCap: "Limits:SideXpDailyCap",
  xpScale: "Limits:XpScale",
  rezSick: "Features:RezSick",
  banner: "App:Banner",
} as const;

export type QuestConfig = {
  maxLiveMissions: number;
  sideXpDailyCap: number;
  xpMin: number;
  xpMax: number;
  rezSickEnabled: boolean;
  banner: string;
};

/** Built-in values. These match the app when Nona is absent. */
export const NONA_DEFAULTS: QuestConfig = {
  maxLiveMissions: 3,
  sideXpDailyCap: 100,
  xpMin: 2,
  xpMax: 20,
  rezSickEnabled: true,
  banner: "",
};

type NonaEntry = { value: string; contentType: string };

let snapshot: QuestConfig = NONA_DEFAULTS;
let etag: string | null = null;
let started = false;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

export function getQuestConfig(): QuestConfig {
  return snapshot;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useQuestConfig(): QuestConfig {
  return useSyncExternalStore(subscribe, getQuestConfig, getQuestConfig);
}

function isEntry(value: unknown): value is NonaEntry {
  if (!value || typeof value !== "object") return false;
  const row = value as { value?: unknown; contentType?: unknown };
  return typeof row.value === "string" && typeof row.contentType === "string";
}

function readNumber(entry: unknown, min: number, max: number): number | null {
  if (!isEntry(entry) || entry.contentType !== "number") return null;
  if (!/^-?\d+$/.test(entry.value)) return null;
  const number = Number(entry.value);
  if (!Number.isSafeInteger(number) || number < min || number > max) return null;
  return number;
}

function readBoolean(entry: unknown): boolean | null {
  if (!isEntry(entry) || entry.contentType !== "boolean") return null;
  if (entry.value === "true") return true;
  if (entry.value === "false") return false;
  return null;
}

function readText(entry: unknown): string | null {
  if (!isEntry(entry) || entry.contentType !== "text") return null;
  if (entry.value.length > 160) return null;
  return entry.value;
}

function readScale(entry: unknown): { xpMin: number; xpMax: number } | null {
  if (!isEntry(entry) || entry.contentType !== "json") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(entry.value);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const min = (parsed as { min?: unknown }).min;
  const max = (parsed as { max?: unknown }).max;
  if (typeof min !== "number" || typeof max !== "number") return null;
  if (!Number.isInteger(min) || !Number.isInteger(max)) return null;
  if (min < 0 || max < min || max > 1000) return null;
  return { xpMin: min, xpMax: max };
}

/** Apply one bulk snapshot. Invalid fields stay at the built-in defaults. */
export function applyNonaBody(body: unknown): QuestConfig | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const row = body as Record<string, unknown>;
  const next: QuestConfig = { ...NONA_DEFAULTS };
  const maxLive = readNumber(row[NONA_KEYS.maxLiveMissions], 1, 3);
  const sideCap = readNumber(row[NONA_KEYS.sideXpDailyCap], 0, 100_000);
  const scale = readScale(row[NONA_KEYS.xpScale]);
  const rez = readBoolean(row[NONA_KEYS.rezSick]);
  const banner = readText(row[NONA_KEYS.banner]);
  if (maxLive != null) next.maxLiveMissions = maxLive;
  if (sideCap != null) next.sideXpDailyCap = sideCap;
  if (scale) {
    next.xpMin = scale.xpMin;
    next.xpMax = scale.xpMax;
  }
  if (rez != null) next.rezSickEnabled = rez;
  if (banner != null) next.banner = banner;
  return next;
}

function publish(next: QuestConfig) {
  if (
    next.maxLiveMissions === snapshot.maxLiveMissions &&
    next.sideXpDailyCap === snapshot.sideXpDailyCap &&
    next.xpMin === snapshot.xpMin &&
    next.xpMax === snapshot.xpMax &&
    next.rezSickEnabled === snapshot.rezSickEnabled &&
    next.banner === snapshot.banner
  ) {
    return;
  }
  snapshot = next;
  for (const listener of listeners) listener();
}

async function pull() {
  const base = import.meta.env.VITE_NONA_URL?.trim();
  const key = import.meta.env.VITE_NONA_KEY?.trim();
  if (!base || !key) return;
  const headers = new Headers({ "X-Api-Key": key });
  if (etag) headers.set("If-None-Match", etag);
  let response: Response;
  try {
    response = await fetch(
      `${base.replace(/\/+$/, "")}/api/environments/${encodeURIComponent(NONA_ENVIRONMENT)}/parameters`,
      { headers, signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
  } catch {
    return;
  }
  if (response.status === 304) return;
  if (!response.ok) return;
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return;
  }
  const next = applyNonaBody(body);
  if (!next) return;
  etag = response.headers.get("ETag");
  publish(next);
}

function refresh() {
  if (inflight) return inflight;
  inflight = pull().finally(() => {
    inflight = null;
  });
  return inflight;
}

/** Start background reads. The first paint does not wait. */
export function startNonaConfig() {
  if (started || typeof window === "undefined") return;
  const base = import.meta.env.VITE_NONA_URL?.trim();
  const key = import.meta.env.VITE_NONA_KEY?.trim();
  if (!base || !key) return;
  started = true;
  void refresh();
  window.setInterval(() => void refresh(), POLL_MS);
  window.addEventListener("focus", () => void refresh());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void refresh();
  });
}

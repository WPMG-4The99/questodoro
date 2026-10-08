import type { CheckInKind } from "@/lib/questodoro/check-ins";

export type RoomNote = {
  id: string;
  kind: CheckInKind;
  from: string;
  at: number;
};

export type RoomBribe = {
  id: string;
  title: string;
};

export type TogetherRoom = {
  code: string;
  hostHandle: string;
  guestHandle: string;
  missionTitle: string;
  hostDone: boolean;
  guestDone: boolean;
  notes: RoomNote[];
  bribes: RoomBribe[];
};

const NOTE_KINDS = new Set<string>(["how-ya", "grinding", "push", "almost", "all-right"]);

function roomKey(code: string) {
  return `questodoro:room:${code}`;
}

export function emptyRoom(code: string, hostHandle: string, missionTitle: string): TogetherRoom {
  return {
    code,
    hostHandle,
    guestHandle: "",
    missionTitle,
    hostDone: false,
    guestDone: false,
    notes: [],
    bribes: [],
  };
}

export function readRoom(code: string): TogetherRoom | null {
  if (typeof window === "undefined" || !code) return null;
  try {
    const raw = window.localStorage.getItem(roomKey(code));
    if (!raw) return null;
    const row = JSON.parse(raw) as Partial<TogetherRoom>;
    if (!row || row.code !== code) return null;
    const notes: RoomNote[] = [];
    if (Array.isArray(row.notes)) {
      for (const item of row.notes) {
        if (!item || typeof item !== "object") continue;
        const note = item as Partial<RoomNote>;
        if (typeof note.kind !== "string" || !NOTE_KINDS.has(note.kind)) continue;
        if (typeof note.id !== "string" || typeof note.from !== "string") continue;
        const at = Number(note.at);
        if (!Number.isFinite(at)) continue;
        notes.push({ id: note.id, kind: note.kind as CheckInKind, from: note.from.slice(0, 16), at });
      }
    }
    const bribes: RoomBribe[] = [];
    if (Array.isArray(row.bribes)) {
      for (const item of row.bribes) {
        if (!item || typeof item !== "object") continue;
        const bribe = item as Partial<RoomBribe>;
        if (typeof bribe.id !== "string" || typeof bribe.title !== "string" || bribe.title.trim().length < 2) {
          continue;
        }
        bribes.push({ id: bribe.id, title: bribe.title.slice(0, 32) });
      }
    }
    return {
      code,
      hostHandle: typeof row.hostHandle === "string" ? row.hostHandle.slice(0, 16) : "",
      guestHandle: typeof row.guestHandle === "string" ? row.guestHandle.slice(0, 16) : "",
      missionTitle: typeof row.missionTitle === "string" ? row.missionTitle.slice(0, 32) : "",
      hostDone: row.hostDone === true,
      guestDone: row.guestDone === true,
      notes: notes.slice(-40),
      bribes: bribes.slice(0, 8),
    };
  } catch {
    return null;
  }
}

export function writeRoom(room: TogetherRoom) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(roomKey(room.code), JSON.stringify(room));
}

export function subscribeRoom(code: string, onChange: () => void) {
  if (typeof window === "undefined" || !code) return () => {};
  const key = roomKey(code);
  const onStorage = (event: StorageEvent) => {
    if (event.key === key) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

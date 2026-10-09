const SESSION_KEY = "questodoro:callsign";
const LEGACY_KEY = "questodoro:callsign";

export type CallSign = {
  handle: string;
  pin: string;
};

export function handleOk(value: string) {
  const handle = value.trim();
  return handle.length >= 2 && handle.length <= 16;
}

export function pinOk(value: string) {
  return /^\d{4}$/.test(value);
}

export function readCallSign(): CallSign | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CallSign>;
    const handle = typeof parsed.handle === "string" ? parsed.handle.trim() : "";
    const pin = typeof parsed.pin === "string" ? parsed.pin : "";
    if (!handleOk(handle) || !pinOk(pin)) return null;
    return { handle, pin };
  } catch {
    return null;
  }
}

export function writeCallSign(callSign: CallSign) {
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(callSign));
  window.localStorage.removeItem(LEGACY_KEY);
}

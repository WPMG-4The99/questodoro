export type TogetherStatus = "solo" | "invited" | "together";

export type TogetherState = {
  partnerHandle: string;
  inviteCode: string;
  challengeTitle: string;
  togetherStatus: TogetherStatus;
};

export function emptyTogether(): TogetherState {
  return {
    partnerHandle: "",
    inviteCode: "",
    challengeTitle: "",
    togetherStatus: "solo",
  };
}

export function makeInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)] ?? "Q";
  }
  return code;
}

export function parseTogether(raw: unknown): TogetherState {
  const blank = emptyTogether();
  if (!raw || typeof raw !== "object") return blank;
  const row = raw as Partial<TogetherState>;
  const status = row.togetherStatus;
  const partnerHandle = typeof row.partnerHandle === "string" ? row.partnerHandle.trim().slice(0, 16) : "";
  const inviteCode =
    typeof row.inviteCode === "string" ? row.inviteCode.trim().toUpperCase().slice(0, 8) : "";
  const challengeTitle =
    typeof row.challengeTitle === "string" ? row.challengeTitle.trim().slice(0, 32) : "";
  return {
    partnerHandle,
    inviteCode,
    challengeTitle,
    togetherStatus: status === "invited" || status === "together" ? status : "solo",
  };
}

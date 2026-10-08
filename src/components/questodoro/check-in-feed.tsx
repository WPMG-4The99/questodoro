import { useLayoutEffect, useRef } from "react";
import { Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readCallSign } from "@/lib/questodoro/callsign";
import {
  CHECK_IN_PRESETS,
  CHECK_IN_REPLIES,
  checkInLabel,
  type CheckInEntry,
  type CheckInKind,
} from "@/lib/questodoro/check-ins";
import { cn, pad2 } from "@/lib/utils";

function formatClock(at: number) {
  const date = new Date(at);
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function CheckInFeed({
  entries,
  onCheckIn,
  className,
  compact = false,
  partnerHandle = "",
}: {
  entries: CheckInEntry[];
  onCheckIn: (kind: CheckInKind) => void;
  className?: string;
  compact?: boolean;
  partnerHandle?: string;
}) {
  const scroller = useRef<HTMLOListElement>(null);
  const me = readCallSign()?.handle ?? "";
  let partnerAskAt = 0;
  let myLastAt = 0;
  for (const entry of entries) {
    const mine = !entry.from || entry.from === me;
    if (mine) myLastAt = Math.max(myLastAt, entry.at);
    else if (entry.kind === "how-ya") partnerAskAt = entry.at;
  }
  const showReplies = partnerAskAt > myLastAt;
  const buttons = showReplies ? CHECK_IN_REPLIES : CHECK_IN_PRESETS;

  useLayoutEffect(() => {
    const node = scroller.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [entries]);

  return (
    <section
      className={cn(
        "flex shrink-0 flex-col rounded-xl bg-surface p-4 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)]",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Radio className="size-4 text-olive" />
        <h2 className="font-display text-sm font-semibold uppercase tracking-kicker text-fg">
          Check in
        </h2>
      </div>
      {compact ? null : (
        <p className="mt-1 text-[11px] leading-tight text-muted">
          {showReplies
            ? `${partnerHandle || "Your partner"} asked how you are doing. These replies do not give XP.`
            : partnerHandle
              ? `Messages for ${partnerHandle}. These messages do not give XP.`
              : "Messages for the person on the challenge with you. These messages do not give XP."}
        </p>
      )}
      <div className="mt-2 grid grid-cols-3 items-stretch gap-1.5">
        {buttons.map((preset) => (
          <Button
            key={preset.kind}
            type="button"
            variant="secondary"
            size="compact"
            className="h-auto min-h-11 w-full whitespace-normal px-1.5 py-1 text-center text-[11px] normal-case leading-tight tracking-normal"
            onClick={() => onCheckIn(preset.kind)}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <ol
        ref={scroller}
        aria-label="Check-in feed"
        className="mt-2 space-y-1 overflow-hidden"
      >
        {entries.length === 0 ? (
          <li className="text-sm text-muted">
            {partnerHandle ? `No message sent to ${partnerHandle}.` : "No partner yet."}
          </li>
        ) : (
          (compact ? entries.slice(-1) : entries.slice(-3)).map((entry) => (
            <li
              key={entry.id}
              className="flex items-baseline justify-between gap-3 rounded-sm bg-well px-3 py-2"
            >
              <span className="min-w-0 font-display text-sm font-semibold normal-case leading-tight">
                {checkInLabel(entry.kind)}
                {entry.from && entry.from !== me ? (
                  <span className="ml-2 text-xs text-muted">from {entry.from}</span>
                ) : entry.to ? (
                  <span className="ml-2 text-xs text-muted">to {entry.to}</span>
                ) : null}
              </span>
              <span className="font-display text-xs tabular-nums text-muted">
                {formatClock(entry.at)}
              </span>
            </li>
          ))
        )}
      </ol>
    </section>
  );
}

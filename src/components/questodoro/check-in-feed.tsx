import { useLayoutEffect, useRef } from "react";
import { Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CHECK_IN_PRESETS,
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
          {partnerHandle
            ? `Messages for ${partnerHandle}. These messages do not give XP.`
            : "Messages for the person on the challenge with you. These messages do not give XP."}
        </p>
      )}
      <div className="mt-2 grid grid-cols-3 gap-2">
        {CHECK_IN_PRESETS.map((preset) => (
          <Button
            key={preset.kind}
            type="button"
            variant="secondary"
            size="compact"
            className="w-full px-1"
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
              <span className="font-display text-sm font-semibold uppercase tracking-wider">
                {checkInLabel(entry.kind)}
                {entry.to ? (
                  <span className="ml-2 text-xs tracking-wider text-muted">to {entry.to}</span>
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

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
}: {
  entries: CheckInEntry[];
  onCheckIn: (kind: CheckInKind) => void;
  className?: string;
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
        "flex shrink-0 flex-col rounded-xl bg-surface p-5 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)]",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Radio className="size-4 text-olive" />
        <h2 className="font-display text-sm font-semibold uppercase tracking-kicker text-fg">
          Check in
        </h2>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
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
        className="mt-3 h-36 space-y-1 overflow-y-auto"
      >
        {entries.length === 0 ? (
          <li className="text-sm text-muted">No check-ins yet.</li>
        ) : (
          entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-baseline justify-between gap-3 rounded-sm bg-well px-3 py-2"
            >
              <span className="font-display text-sm font-semibold uppercase tracking-wider">
                {checkInLabel(entry.kind)}
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

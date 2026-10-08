import { memo } from "react";
import { cn, formatMmSs } from "@/lib/utils";
import type { MissionColor } from "@/lib/questodoro/missions";
import type { Phase, RunState } from "@/lib/questodoro/store";

export type SideRing = {
  id: string;
  title: string;
  color: MissionColor;
  remainingMs: number;
  totalMs: number;
  paused: boolean;
};

type TimerRingProps = {
  remainingMs: number;
  totalMs: number;
  phase: Phase;
  runState: RunState;
  sideRings?: SideRing[];
  className?: string;
};

const SIZE = 240;
const CX = 120;
const CY = 120;
const R = 98;
const CIRC = 2 * Math.PI * R;
const SIDE_RADII = [84, 74, 64];

const STROKE: Record<MissionColor, string> = {
  red: "stroke-mission-red",
  purple: "stroke-mission-purple",
  gold: "stroke-mission-gold",
};

export const TimerRing = memo(function TimerRing({
  remainingMs,
  totalMs,
  phase,
  runState,
  sideRings = [],
  className,
}: TimerRingProps) {
  const safeTotal = Math.max(1, totalMs);
  const progress = Math.min(1, Math.max(0, remainingMs / safeTotal));
  const offset = CIRC * (1 - progress);
  const running = runState === "running";
  const onBreak = phase === "break";
  const label =
    phase === "break" ? "BREAK" : phase === "work" || running ? "WORK" : "STAND BY";
  const status =
    runState === "paused" ? "Paused" : running ? "Counting" : "Ready";
  const pausedSides = sideRings.filter((ring) => ring.paused);
  const sideLabel = sideRings
    .map((ring) => `${ring.title} ${formatMmSs(ring.remainingMs)}${ring.paused ? " paused" : ""}`)
    .join(". ");

  return (
    <div className={cn("relative mx-auto aspect-square w-full max-w-64 2xl:max-w-72", className)}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="size-full"
        role="img"
        aria-label={
          sideLabel
            ? `${label} ${formatMmSs(remainingMs)} remaining. ${sideLabel}`
            : `${label} ${formatMmSs(remainingMs)} remaining`
        }
      >
        <circle cx={CX} cy={CY} r={R} className="fill-none stroke-border" strokeWidth="10" />
        <circle
          cx={CX}
          cy={CY}
          r={R}
          className={onBreak ? "stroke-ember" : "stroke-olive"}
          fill="none"
          strokeWidth="10"
          strokeLinecap="butt"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${CX} ${CY})`}
          style={{
            transition: running
              ? "stroke-dashoffset 200ms linear"
              : "stroke-dashoffset var(--motion-fast) var(--ease-out)",
          }}
        />
        {sideRings.slice(0, 3).map((ring, index) => {
          const radius = SIDE_RADII[index] ?? SIDE_RADII[SIDE_RADII.length - 1];
          const circ = 2 * Math.PI * radius;
          const sideProgress = Math.min(1, Math.max(0, ring.remainingMs / Math.max(1, ring.totalMs)));
          return (
            <g key={ring.id} opacity={ring.paused ? 0.35 : 1}>
              <circle
                cx={CX}
                cy={CY}
                r={radius}
                className="fill-none stroke-border"
                strokeWidth="6"
              />
              <circle
                cx={CX}
                cy={CY}
                r={radius}
                className={STROKE[ring.color]}
                fill="none"
                strokeWidth="6"
                strokeLinecap="butt"
                strokeDasharray={circ}
                strokeDashoffset={circ * (1 - sideProgress)}
                transform={`rotate(-90 ${CX} ${CY})`}
                style={{
                  transition: ring.paused
                    ? "stroke-dashoffset var(--motion-fast) var(--ease-out)"
                    : "stroke-dashoffset 200ms linear",
                }}
              />
            </g>
          );
        })}
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
          const inner = i % 3 === 0 ? 108 : 110;
          const outer = 116;
          const x1 = Number((CX + Math.cos(angle) * inner).toFixed(2));
          const y1 = Number((CY + Math.sin(angle) * inner).toFixed(2));
          const x2 = Number((CX + Math.cos(angle) * outer).toFixed(2));
          const y2 = Number((CY + Math.sin(angle) * outer).toFixed(2));
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              className="stroke-muted"
              strokeWidth={i % 3 === 0 ? 2 : 1}
              opacity={0.55}
            />
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1">
        <p className="font-display text-xs font-semibold uppercase tracking-kicker text-muted">
          {label}
        </p>
        <p className="font-display text-4xl font-semibold leading-none tracking-tight text-fg tabular-nums 2xl:text-5xl">
          {formatMmSs(remainingMs)}
        </p>
        <p className="font-display text-xs uppercase tracking-wider text-muted">{status}</p>
        {pausedSides.length > 0 ? (
          <p className="rounded-sm bg-ember px-2 py-0.5 font-display text-xs font-semibold uppercase tracking-wider text-fg">
            Paused
          </p>
        ) : null}
      </div>
    </div>
  );
});

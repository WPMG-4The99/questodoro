import { useEffect, useState } from "react";
import { Check, ChevronDown, ChevronUp, Crosshair, Minus, Pause, Play, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuestConfig } from "@/lib/questodoro/nona-config";
import {
  MAX_MISSIONS,
  MISSION_LENGTH_MAX,
  MISSION_LENGTH_MIN,
  MISSION_LENGTH_STEP,
  MISSION_COLORS,
  pausePenaltyXp,
  pausedTotalMs,
  xpForMission,
  type Mission,
} from "@/lib/questodoro/missions";
import type { MissionRun } from "@/lib/questodoro/store";
import { cn, formatMmSs } from "@/lib/utils";

function MissionTitle({
  mission,
  locked,
  onUpdate,
}: {
  mission: Mission;
  locked: boolean;
  onUpdate: (id: string, patch: Partial<Pick<Mission, "title">>) => void;
}) {
  const [draft, setDraft] = useState(mission.title);
  useEffect(() => {
    setDraft(mission.title);
  }, [mission.title, locked]);
  return (
    <Input
      aria-label="Mission title"
      value={locked ? mission.title : draft}
      maxLength={32}
      disabled={locked}
      className="h-9 min-h-9"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        if (draft !== mission.title) onUpdate(mission.id, { title: draft });
      }}
    />
  );
}

export function MissionsPanel({
  missions,
  selectedId,
  completedIds,
  missionStreak,
  sideXpToday,
  missionRuns,
  onSelect,
  onAdd,
  onUpdate,
  onRemove,
  onBail,
  onMove,
  onStart,
  onPause,
  onComplete,
  className,
}: {
  missions: Mission[];
  selectedId: string | null;
  completedIds: string[];
  missionStreak: number;
  sideXpToday: number;
  missionRuns: MissionRun[];
  onSelect: (id: string) => void;
  onAdd: () => void;
  onUpdate: (
    id: string,
    patch: Partial<Pick<Mission, "title" | "brief" | "seconds" | "color" | "restart">>,
  ) => void;
  onRemove: (id: string) => void;
  onBail: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onStart: (id: string) => void;
  onPause: (id: string) => void;
  onComplete: (id: string) => void;
  className?: string;
}) {
  const [ask, setAsk] = useState<null | { kind: "pause" | "bail"; id: string }>(null);
  const [now, setNow] = useState(() => Date.now());
  const liveCount = missionRuns.filter(
    (run) => run.runState === "running" || run.runState === "paused",
  ).length;
  const config = useQuestConfig();
  const sideCapped = sideXpToday >= config.sideXpDailyCap;
  useEffect(() => {
    if (!missionRuns.some((run) => run.runState === "paused")) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [missionRuns]);
  const asked = missions.find((mission) => mission.id === ask?.id) ?? null;
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col rounded-xl bg-surface p-4 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Crosshair className="size-4 text-olive" />
          <h2 className="font-display text-sm font-semibold uppercase tracking-kicker text-fg">
            Missions
          </h2>
        </div>
        <p className="font-display text-xs uppercase tracking-wider text-muted">
          {liveCount}/{config.maxLiveMissions} live · {missionStreak} in a row
        </p>
      </div>
      <p className="mt-1 text-[11px] leading-tight text-muted">
        On demand. Own clocks. Max {config.maxLiveMissions} at once. Side XP{" "}
        {sideCapped ? "capped" : `${sideXpToday}/${config.sideXpDailyCap}`} today.
      </p>

      <ol className="mt-2 flex min-h-0 flex-1 flex-col gap-2">
        {missions.slice(0, MAX_MISSIONS).map((mission, index) => {
          const selected = mission.id === selectedId;
          const done = completedIds.includes(mission.id);
          const run = missionRuns.find((item) => item.id === mission.id);
          const active = Boolean(run && run.runState !== "stopped");
          const running = run?.runState === "running";
          const paused = run?.runState === "paused";
          const remaining = run ? run.remainingMs : mission.seconds * 1000;
          const pausedMs = run ? pausedTotalMs(run, now) : 0;
          const penalty = paused ? pausePenaltyXp(pausedMs) : 0;
          const locked = mission.editsLeft <= 0;
          const missionXp = xpForMission(mission.seconds);
          const atLiveCap = !run && liveCount >= config.maxLiveMissions;
          return (
            <li
              key={mission.id}
              className={cn(
                "flex flex-1 flex-col rounded-md bg-well p-2",
                paused && "opacity-70",
                done
                  ? "shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-olive)_55%,transparent)]"
                  : selected
                    ? "shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-olive)_70%,transparent)]"
                    : "shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)]",
              )}
            >
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-sm font-display text-xs font-semibold uppercase",
                    selected ? "bg-olive text-olive-fg" : "text-muted hover:bg-surface hover:text-fg",
                  )}
                  aria-label={`Select ${mission.title || "mission"}`}
                  aria-pressed={selected}
                  onClick={() => onSelect(mission.id)}
                >
                  {index + 1}
                </button>
                <MissionTitle mission={mission} locked={locked} onUpdate={onUpdate} />
                <button
                  type="button"
                  className="flex size-10 shrink-0 items-center justify-center rounded-sm text-muted hover:bg-surface hover:text-fg disabled:opacity-30"
                  aria-label="Move mission up"
                  disabled={index === 0}
                  onClick={() => onMove(mission.id, -1)}
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  type="button"
                  className="flex size-10 shrink-0 items-center justify-center rounded-sm text-muted hover:bg-surface hover:text-fg disabled:opacity-30"
                  aria-label="Move mission down"
                  disabled={index === missions.length - 1}
                  onClick={() => onMove(mission.id, 1)}
                >
                  <ChevronDown className="size-4" />
                </button>
                <button
                  type="button"
                  className="flex size-10 shrink-0 items-center justify-center rounded-sm text-muted hover:bg-surface hover:text-ember disabled:opacity-30"
                  aria-label={`Remove ${mission.title || "mission"}`}
                  disabled={missions.length <= 1}
                  onClick={() => (locked ? setAsk({ kind: "bail", id: mission.id }) : onRemove(mission.id))}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <Input
                aria-label="Mission brief"
                value={mission.brief}
                maxLength={80}
                placeholder="One-liner"
                disabled={locked}
                className="mt-1 h-9 min-h-9"
                onChange={(event) => onUpdate(mission.id, { brief: event.target.value })}
              />
              <div className="mt-1 flex flex-wrap items-center gap-1">
                <div className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-1 rounded-md bg-surface px-2 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)]">
                  <span className="font-display text-xs font-semibold uppercase tracking-kicker text-muted">
                    {active ? "Timer" : "Length"}
                  </span>
                  <div className="flex items-center">
                    {active ? (
                      <span className="px-2 font-display text-lg font-semibold tabular-nums text-fg">
                        {formatMmSs(remaining)}
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="flex size-9 items-center justify-center rounded-sm text-fg hover:bg-well disabled:opacity-40"
                          aria-label={`Decrease ${mission.title || "mission"} length`}
                          disabled={locked || mission.seconds <= MISSION_LENGTH_MIN}
                          onClick={() =>
                            onUpdate(mission.id, {
                              seconds: mission.seconds - MISSION_LENGTH_STEP,
                            })
                          }
                        >
                          <Minus className="size-4" />
                        </button>
                        <span className="w-10 text-center font-display text-base font-semibold tabular-nums">
                          {mission.seconds}
                        </span>
                        <button
                          type="button"
                          className="flex size-9 items-center justify-center rounded-sm text-fg hover:bg-well disabled:opacity-40"
                          aria-label={`Increase ${mission.title || "mission"} length`}
                          disabled={locked || mission.seconds >= MISSION_LENGTH_MAX}
                          onClick={() =>
                            onUpdate(mission.id, {
                              seconds: mission.seconds + MISSION_LENGTH_STEP,
                            })
                          }
                        >
                          <Plus className="size-4" />
                        </button>
                        <span className="w-5 font-display text-xs uppercase tracking-wider text-muted">
                          s
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <span className="w-12 shrink-0 text-right font-display text-xs tabular-nums text-olive">
                  {penalty > 0 ? `-${penalty}` : `+${missionXp}`}
                </span>
                {paused ? (
                  <span className="rounded-sm bg-ember px-2 py-1 font-display text-xs font-semibold uppercase tracking-wider text-fg">
                    Paused
                  </span>
                ) : null}
                <span className="font-display text-xs uppercase tracking-wider text-muted">
                  {locked ? "Locked" : "1 edit left"}
                </span>
                {running ? (
                  <Button
                    type="button"
                    size="compact"
                    variant="secondary"
                    className="shrink-0"
                    onClick={() => setAsk({ kind: "pause", id: mission.id })}
                  >
                    <Pause />
                    Pause
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="compact"
                    className="shrink-0"
                    disabled={running || atLiveCap}
                    onClick={() => onStart(mission.id)}
                  >
                    <Play />
                    {paused ? "Resume" : "Start"}
                  </Button>
                )}
                <Button
                  type="button"
                  size="compact"
                  variant={done ? "secondary" : "ember"}
                  className="shrink-0"
                  disabled={done}
                  onClick={() => onComplete(mission.id)}
                >
                  <Check />
                  {done ? "Completed" : "Complete"}
                </Button>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                {MISSION_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Color ${color}`}
                    disabled={locked}
                    className={cn(
                      "size-5 rounded-sm disabled:opacity-40",
                      color === "red" && "bg-mission-red",
                      color === "purple" && "bg-mission-purple",
                      color === "gold" && "bg-mission-gold",
                      mission.color === color && "shadow-[0_0_0_2px_var(--color-fg)]",
                    )}
                    onClick={() => onUpdate(mission.id, { color })}
                  />
                ))}
                <button
                  type="button"
                  className="font-display text-xs uppercase tracking-wider text-muted hover:text-fg"
                  onClick={() =>
                    onUpdate(mission.id, {
                      restart: mission.restart === "auto" ? "once" : "auto",
                    })
                  }
                >
                  {mission.restart === "auto" ? "Auto-restart" : "One-and-done"}
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      {missions.length >= MAX_MISSIONS ? null : (
        <Button type="button" variant="ghost" className="mt-2 w-full" onClick={onAdd}>
          <Plus />
          Add mission
        </Button>
      )}
      {ask && asked ? (
        <div className="mt-3 rounded-md bg-bg p-3 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-ember)_50%,transparent)]">
          {ask.kind === "pause" ? (
            <p className="text-sm leading-snug text-fg">
              The first 2 minutes paused are free. Then each full minute removes 1 side XP. The loss
              applies on Complete. Pause anyway?
            </p>
          ) : (
            <div className="space-y-1 text-sm leading-snug text-fg">
              <p>Delete this locked mission?</p>
              <p>You lose this mission&apos;s side XP.</p>
              <p>You lose 5 side XP.</p>
              <p>Your day streak returns to 0.</p>
              <p>REZ SICK starts. Earned XP is multiplied by 0.75.</p>
            </div>
          )}
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              variant="ember"
              size="compact"
              onClick={() => {
                if (ask.kind === "pause") onPause(ask.id);
                else onBail(ask.id);
                setAsk(null);
              }}
            >
              {ask.kind === "pause" ? "Pause" : "Delete"}
            </Button>
            <Button type="button" variant="ghost" size="compact" onClick={() => setAsk(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

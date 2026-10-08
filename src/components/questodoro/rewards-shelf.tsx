import { useState, type FormEvent } from "react";
import { Gift, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MAX_REWARDS,
  REWARD_PRESETS,
  parsePreset,
  presetKey,
  ruleLabel,
  type Reward,
  type RewardScope,
} from "@/lib/questodoro/missions";
import { useQuestStore } from "@/lib/questodoro/store";
import { cn } from "@/lib/utils";

export function RewardsShelf({
  rewards,
  onAdd,
  onRename,
  onRemove,
  onClaim,
  className,
}: {
  rewards: Reward[];
  onAdd: (title: string, rule: ReturnType<typeof parsePreset>, scope: RewardScope) => void;
  onRename: (id: string, title: string) => void;
  onRemove: (id: string) => void;
  onClaim: (id: string) => void;
  className?: string;
}) {
  const [title, setTitle] = useState("");
  const [preset, setPreset] = useState(presetKey(REWARD_PRESETS[4]?.rule ?? { kind: "missions", at: 3 }));
  const [scope, setScope] = useState<RewardScope>("solo");
  const canAddTogether = useQuestStore((s) => s.togetherRole === "host");

  function submit(event: FormEvent) {
    event.preventDefault();
    const nextScope = scope === "together" && canAddTogether ? "together" : "solo";
    onAdd(title, parsePreset(preset), nextScope);
    setTitle("");
  }

  return (
    <section
      className={cn(
        "flex min-h-0 flex-col rounded-xl bg-surface p-4 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)]",
        className,
      )}
    >
      <div className="shrink-0">
        <div className="flex items-center gap-2">
          <Gift className="size-4 text-olive" />
          <h2 className="font-display text-sm font-semibold uppercase tracking-kicker text-fg">
            Bribe shelf
          </h2>
        </div>
        <p className="mt-1 text-[11px] leading-tight text-muted">
          Just me unlocks on your record. Together unlocks for both when mission 3 is done.
        </p>
      </div>

      <ul className="mt-2 grid grid-cols-3 content-start gap-2">
        {rewards.length === 0 ? (
          <li className="col-span-full text-sm text-muted">No bribes on the shelf. Add one.</li>
        ) : (
          rewards.map((reward) => {
            const unlocked = Boolean(reward.unlockedAt);
            return (
              <li
                key={reward.id}
                className={cn(
                  "min-w-0 rounded-md bg-well p-2",
                  reward.claimed
                    ? "shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-olive)_55%,transparent)]"
                    : unlocked
                      ? "shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-ember)_50%,transparent)]"
                      : "shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)]",
                )}
              >
                <div className="flex items-center gap-1">
                  <Input
                    aria-label="Reward title"
                    value={reward.title}
                    maxLength={32}
                    className="h-8 min-h-8 min-w-0 flex-1 text-sm"
                    onChange={(event) => onRename(reward.id, event.target.value)}
                  />
                  <button
                    type="button"
                    aria-label={`Remove ${reward.title}`}
                    className="flex size-7 shrink-0 items-center justify-center rounded-sm text-muted hover:bg-surface hover:text-fg"
                    onClick={() => onRemove(reward.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="min-w-0 text-xs leading-tight text-muted">
                    {reward.scope === "together"
                      ? "Unlock when mission 3 is done"
                      : ruleLabel(reward.rule)}
                  </p>
                  <span
                    className={cn(
                      "shrink-0 font-display text-[10px] font-semibold uppercase tracking-wider",
                      reward.scope === "together" ? "text-olive" : "text-muted",
                    )}
                  >
                    {reward.scope === "together" ? "Together" : "Solo"}
                  </span>
                </div>
                {reward.claimed ? (
                  <p className="claimed-stamp mt-0.5 font-display text-[11px] font-semibold uppercase tracking-kicker text-olive">
                    Claimed
                  </p>
                ) : null}
                <Button
                  type="button"
                  size="compact"
                  variant={reward.claimed ? "secondary" : unlocked ? "ember" : "ghost"}
                  className="mt-1 h-7 min-h-7 w-full px-2"
                  disabled={!unlocked && !reward.claimed}
                  onClick={() => onClaim(reward.id)}
                >
                  {reward.claimed ? "Unstamp" : unlocked ? "Claim" : "Locked"}
                </Button>
              </li>
            );
          })
        )}
      </ul>

      <form className="mt-2 flex w-full min-w-0 shrink-0 items-center gap-2" onSubmit={submit}>
        <Input
          aria-label="New reward"
          placeholder="20 min game, junk food win…"
          value={title}
          maxLength={32}
          className="h-8 min-h-8 min-w-0 flex-1 text-sm"
          onChange={(event) => setTitle(event.target.value)}
        />
        <label className="sr-only" htmlFor="reward-scope">
          Bribe type
        </label>
        <select
          id="reward-scope"
          value={scope}
          onChange={(event) => setScope(event.target.value === "together" ? "together" : "solo")}
          className="h-8 min-h-8 shrink-0 rounded-md bg-well px-2 font-sans text-xs text-fg shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_14%,transparent)] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-olive)]"
        >
          <option value="solo">Just me</option>
          <option value="together" disabled={!canAddTogether}>
            Together
          </option>
        </select>
        <label className="sr-only" htmlFor="reward-rule">
          Unlock rule
        </label>
        <select
          id="reward-rule"
          value={preset}
          disabled={scope === "together"}
          onChange={(event) => setPreset(event.target.value)}
          className="h-8 min-h-8 w-auto max-w-full shrink-0 rounded-md bg-well px-2 font-sans text-sm text-fg shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_14%,transparent)] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-olive)]"
        >
          {REWARD_PRESETS.map((item) => (
            <option key={presetKey(item.rule)} value={presetKey(item.rule)}>
              {item.label}
            </option>
          ))}
        </select>
        <Button
          type="submit"
          variant="secondary"
          className="h-8 min-h-8 shrink-0 px-2"
          disabled={rewards.length >= MAX_REWARDS || title.trim().length < 2}
        >
          <Plus />
          Add
        </Button>
      </form>
    </section>
  );
}

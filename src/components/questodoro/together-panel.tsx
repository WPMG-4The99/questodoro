import { useState, type FormEvent } from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuestStore } from "@/lib/questodoro/store";
import { cn } from "@/lib/utils";

export function TogetherPanel({ className, compact = false }: { className?: string; compact?: boolean }) {
  const partnerHandle = useQuestStore((s) => s.partnerHandle);
  const inviteCode = useQuestStore((s) => s.inviteCode);
  const challengeTitle = useQuestStore((s) => s.challengeTitle);
  const togetherStatus = useQuestStore((s) => s.togetherStatus);
  const rezSick = useQuestStore((s) => s.rezSick);
  const invitePartner = useQuestStore((s) => s.invitePartner);
  const markPartnerIn = useQuestStore((s) => s.markPartnerIn);
  const leaveTogether = useQuestStore((s) => s.leaveTogether);
  const [handle, setHandle] = useState("");
  const [title, setTitle] = useState("Hold the line");

  function send(event: FormEvent) {
    event.preventDefault();
    invitePartner(handle, title);
    setHandle("");
  }

  const paired = togetherStatus === "together" && partnerHandle;
  const waiting = togetherStatus === "invited" && partnerHandle;
  const joinedBlind = togetherStatus === "together" && !partnerHandle && inviteCode;

  return (
    <section
      className={cn(
        "flex shrink-0 flex-col rounded-xl bg-surface p-5 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)]",
        compact && "bg-transparent p-0 shadow-none",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-olive" />
          <h2 className="font-display text-sm font-semibold uppercase tracking-kicker text-fg">
            Together
          </h2>
        </div>
        <p className="font-display text-xs uppercase tracking-wider text-muted">
          {rezSick ? "REZ SICK" : paired ? "Paired" : waiting ? "Invite out" : "Solo"}
        </p>
      </div>
      {compact ? null : (
        <p className="mt-1 text-xs leading-snug text-muted">
          You can work alone. Or send one invite. The other person signs up and enters your code.
          Your check-ins go to that person.
        </p>
      )}

      {paired ? (
        <div className="mt-3">
          <p className="font-display text-lg font-semibold uppercase tracking-wider text-fg">
            With {partnerHandle}
          </p>
          <p className="mt-1 text-sm text-muted">
            {challengeTitle || "This challenge"}. HOW YA, GRINDING, and PUSH go to them.
          </p>
          <Button type="button" variant="ghost" size="compact" className="mt-3" onClick={leaveTogether}>
            Work alone
          </Button>
        </div>
      ) : waiting ? (
        <div className={compact ? "mt-2" : "mt-3"}>
          <p className={compact ? "text-xs leading-snug text-muted" : "text-sm text-muted"}>
            Wait for {partnerHandle}. That person creates a handle and a pin. Then that person enters
            this code.
          </p>
          <p
            className={
              compact
                ? "mt-1 font-display text-2xl font-semibold tracking-display text-olive"
                : "mt-2 font-display text-3xl font-semibold tracking-display text-olive"
            }
          >
            {inviteCode}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="compact" onClick={markPartnerIn}>
              Confirm partner
            </Button>
            <Button type="button" variant="ghost" size="compact" onClick={leaveTogether}>
              Cancel invite
            </Button>
          </div>
        </div>
      ) : joinedBlind ? (
        <div className="mt-3">
          <p className="font-display text-lg font-semibold uppercase tracking-wider text-fg">
            Joined with {inviteCode}
          </p>
          <p className="mt-1 text-sm text-muted">
            You entered their code at sign-up. Your check-ins go to that person.
          </p>
          <Button type="button" variant="ghost" size="compact" className="mt-3" onClick={leaveTogether}>
            Work alone
          </Button>
        </div>
      ) : (
        <form className={compact ? "mt-2 flex gap-2" : "mt-3 flex flex-col gap-2"} onSubmit={send}>
          {compact ? null : (
            <Input
              aria-label="Challenge name"
              value={title}
              maxLength={32}
              onChange={(event) => setTitle(event.target.value)}
            />
          )}
          <Input
            aria-label="Friend handle"
            placeholder="Their handle"
            value={handle}
            maxLength={16}
            className={compact ? "h-9 min-h-9" : undefined}
            onChange={(event) => setHandle(event.target.value)}
          />
          <Button
            type="submit"
            variant="secondary"
            size={compact ? "compact" : "default"}
            disabled={handle.trim().length < 2}
          >
            Send invite
          </Button>
        </form>
      )}
    </section>
  );
}

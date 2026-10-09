import { useState, type FormEvent } from "react";
import { NewUserBrief } from "@/components/questodoro/new-user-brief";
import { PhyreMark } from "@/components/questodoro/mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { handleOk, pinOk, writeCallSign } from "@/lib/questodoro/callsign";
import { useQuestStore } from "@/lib/questodoro/store";
import { cn } from "@/lib/utils";

export function EnlistGate({ onEnter }: { onEnter: () => void }) {
  const [handle, setHandle] = useState("");
  const [pin, setPin] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [pointAtHandle, setPointAtHandle] = useState(false);
  const hydrate = useQuestStore((s) => s.hydrate);
  const joinWithCode = useQuestStore((s) => s.joinWithCode);

  function submit(event: FormEvent) {
    event.preventDefault();
    const nextHandle = handle.trim();
    if (!handleOk(nextHandle) || !pinOk(pin)) return;
    writeCallSign({ handle: nextHandle, pin });
    hydrate();
    if (inviteCode.trim()) joinWithCode(inviteCode);
    onEnter();
  }

  function goToHandle() {
    setPointAtHandle(true);
    document.getElementById("qd-handle")?.focus();
  }

  function tryDemo() {
    const nextHandle = handleOk(handle) ? handle.trim() : "Judge";
    const nextPin = pinOk(pin) ? pin : "0000";
    writeCallSign({ handle: nextHandle, pin: nextPin });
    hydrate();
    useQuestStore.getState().startJudgeDemo();
    onEnter();
  }

  const ready = handleOk(handle) && pinOk(pin);

  return (
    <main className="h-dvh overflow-hidden bg-bg text-fg">
      <div className="mx-auto flex h-full w-full max-w-board flex-col gap-3 px-4 py-3">
        <header className="flex shrink-0 items-end justify-between gap-4 border-b border-border pb-3">
          <div className="flex min-w-0 items-center gap-3">
            <PhyreMark className="size-10 shrink-0" />
            <div className="min-w-0">
              <p className="font-display text-xs font-semibold uppercase tracking-kicker text-olive">
                First watch
              </p>
              <h1 className="font-display text-4xl font-semibold leading-none tracking-display text-fg">
                QUESTODORO
              </h1>
              <p className="mt-1 text-sm text-muted">
                Enter a handle and a 4-digit pin. Enter an invite code only if you received one.
              </p>
            </div>
          </div>
          <form
            className={cn(
              "grid w-full max-w-3xl shrink-0 grid-cols-2 items-end gap-2 rounded-lg xl:grid-cols-4",
              pointAtHandle && "bg-well p-2 shadow-[0_0_0_1px_var(--color-olive)]",
            )}
            onSubmit={submit}
          >
            <div>
              <label className="font-display text-xs font-semibold uppercase tracking-kicker text-muted" htmlFor="qd-handle">
                Handle
              </label>
              <Input
                id="qd-handle"
                name="handle"
                autoComplete="nickname"
                placeholder="Your name"
                value={handle}
                maxLength={16}
                onChange={(event) => setHandle(event.target.value)}
              />
            </div>
            <div>
              <label className="font-display text-xs font-semibold uppercase tracking-kicker text-muted" htmlFor="qd-pin">
                Pin
              </label>
              <Input
                id="qd-pin"
                name="pin"
                inputMode="numeric"
                autoComplete="off"
                placeholder="4 digits"
                value={pin}
                maxLength={4}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </div>
            <div>
              <label className="font-display text-xs font-semibold uppercase tracking-kicker text-muted" htmlFor="qd-code">
                Invite code
              </label>
              <Input
                id="qd-code"
                name="invite"
                autoComplete="off"
                placeholder="If you have one"
                value={inviteCode}
                maxLength={8}
                onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
              />
            </div>
            <Button type="submit" disabled={!ready}>
              Take the board
            </Button>
          </form>
        </header>
        <NewUserBrief onGoToHandle={goToHandle} onTryDemo={tryDemo} />
      </div>
    </main>
  );
}

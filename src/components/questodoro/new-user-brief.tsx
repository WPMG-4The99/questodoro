import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

const card =
  "flex h-full min-h-0 flex-col overflow-hidden rounded-xl bg-surface px-4 py-3 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)]";

const copy = "mt-2 space-y-1 text-base leading-snug text-fg/90";

const rules = [
  "A finished work block gives 4 XP for each minute.",
  "The minimum is 4 XP.",
  "A mission gives 2 to 20 XP.",
  "Side XP is separate from work XP. Side XP stops at 100 each day.",
  "Your level increases after each 200 XP.",
  "A day streak needs one finished work block on that day.",
  "The high score is your best XP in one day.",
  "You can work alone.",
  "Or you can work with one friend or one family member.",
  "HOW YA, GRINDING, and PUSH are messages to that person.",
  "The messages do not give XP.",
  "Pause a mission. The first 2 minutes are free.",
  "After that, each full minute removes 1 side XP on Complete.",
  "Side XP does not go below 0.",
  "You can edit a mission once. Then the mission locks.",
  "Delete a locked mission. You lose that side XP and 5 more.",
  "That delete sets the day streak to 0 and starts REZ SICK.",
];

const steps = [
  "Start the work clock. Work until the block ends.",
  "Rest when the break starts. Then start the next block.",
  "Write up to three missions.",
  "Start a mission when you are ready.",
  "The mission clock is separate from the work clock.",
  "Send one invite code.",
  "The other person enters the code at sign-up.",
  "Select HOW YA, GRINDING, or PUSH.",
  "The other person sees the message.",
  "Select Pause on a mission. Confirm the pause.",
  "Select Resume. Resume does not ask again.",
  "Select Complete. The pause loss applies then.",
  "You can pause the work clock. That pause does not remove XP.",
  "Select Reset to stop the work block before it ends.",
  "A stopped work block gives no XP.",
];

const findings = [
  "Work for a set time. Then take a short break.",
  "This pattern is a Pomodoro block.",
  "Biwer and colleagues tested set breaks in 2023.",
  "Students on set breaks felt less tired.",
  "They also felt less distracted before the break.",
  "They finished a similar amount of work in less time.",
  "Albulescu and colleagues reviewed 22 studies in 2022.",
  "Breaks under 10 minutes raised energy.",
  "Those breaks also lowered fatigue.",
  "The gain in task performance was small.",
  "Use the break. Then start the next block.",
];

function Kicker({ children }: { children: string }) {
  return (
    <h2 className="shrink-0 font-display text-sm font-semibold uppercase tracking-kicker text-olive">
      {children}
    </h2>
  );
}

function CardPlate({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 min-h-0 flex-1" aria-hidden="true">
      <svg viewBox="0 0 320 160" className="h-full w-full" preserveAspectRatio="xMidYMax meet">
        {children}
      </svg>
    </div>
  );
}

const judgeGroups = [
  {
    title: "Scores",
    steps: [
      "Read Level, XP, Streak, High.",
      "Read Yesterday you.",
      "Compare Today and Yesterday.",
      "Read Delta.",
    ],
  },
  {
    title: "Work clock",
    steps: [
      "Select Start.",
      "Select Pause.",
      "Select Reset.",
      "Select Drill 15s.",
      "Start the 15-second test.",
      "Set Work minutes if stopped.",
      "Set Break minutes if stopped.",
    ],
  },
  {
    title: "Missions",
    steps: [
      "Start one mission.",
      "Select Complete.",
      "Read Today XP.",
    ],
  },
  {
    title: "Together",
    steps: [
      "Enter a friend handle.",
      "Select Send invite.",
      "Read the invite code.",
      "Select HOW YA, GRINDING, or PUSH.",
    ],
  },
  {
    title: "Bribe shelf",
    steps: [
      "Read the bribe shelf.",
      "Select Claim if it is open.",
    ],
  },
];

export function NewUserBrief({ onGoToHandle }: { onGoToHandle: () => void }) {
  return (
    <section
      aria-label="New user check-in"
      className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.05fr)_minmax(0,1.3fr)]"
    >
      <article className={card}>
        <Kicker>Rules</Kicker>
        <ul className={copy}>
          {rules.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <CardPlate>
          <rect x="16" y="118" width="288" height="2" className="fill-border" />
          <rect x="36" y="78" width="36" height="40" className="fill-olive/35" />
          <rect x="92" y="52" width="36" height="66" className="fill-olive/55" />
          <rect x="148" y="28" width="36" height="90" className="fill-olive" />
          <path d="M230 96 L254 28 L278 96 H262 L266 118 H242 L246 96 Z" className="fill-olive" />
          <path d="M254 46 L266 78 H258 L262 96 H246 L250 78 H242 Z" className="fill-bg" />
        </CardPlate>
      </article>

      <article className={card}>
        <Kicker>How this works</Kicker>
        <ol className={`${copy} list-decimal pl-4 marker:font-display marker:text-olive`}>
          {steps.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
        <CardPlate>
          <path d="M48 80 H272" className="stroke-border" strokeWidth="2" />
          <circle cx="48" cy="80" r="18" className="fill-well stroke-olive" strokeWidth="2" />
          <circle cx="48" cy="80" r="6" className="fill-olive" />
          <rect x="110" y="62" width="36" height="36" className="fill-olive/80" />
          <circle cx="200" cy="80" r="18" className="fill-ember/80" />
          <path d="M258 62 H292 V98 H258 Z" className="fill-none stroke-olive" strokeWidth="2" />
          <path d="M266 80 H284" className="stroke-olive" strokeWidth="2" />
        </CardPlate>
      </article>

      <article className={card}>
        <Kicker>Why it helps</Kicker>
        <ul className={copy}>
          {findings.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <CardPlate>
          <rect x="24" y="36" width="52" height="28" className="fill-olive" />
          <rect x="80" y="36" width="16" height="28" className="fill-ember" />
          <rect x="100" y="36" width="52" height="28" className="fill-olive" />
          <rect x="156" y="36" width="16" height="28" className="fill-ember" />
          <rect x="176" y="36" width="52" height="28" className="fill-olive" />
          <rect x="232" y="36" width="16" height="28" className="fill-ember" />
          <path
            d="M28 130 C52 130 60 92 78 92 C96 92 104 118 124 108 C144 98 152 70 176 70 C200 70 208 108 232 100 C252 94 260 78 292 78"
            className="fill-none stroke-olive-bright"
            strokeWidth="3"
          />
        </CardPlate>
      </article>

      <article className={`${card} min-h-0`}>
        <Kicker>Judges</Kicker>
        <p className="mt-1 shrink-0 text-sm leading-snug text-muted min-[1440px]:text-base">
          Do these steps on the full page. Then select Go to the handle.
        </p>
        <div className="mt-1.5 flex shrink-0 flex-col gap-1">
          {judgeGroups.map((group) => (
            <section key={group.title} className="rounded-md bg-well px-2.5 py-1">
              <h3 className="font-display text-xs font-semibold uppercase tracking-kicker text-olive min-[1440px]:text-sm">
                {group.title}
              </h3>
              <ol className="mt-0.5 grid grid-cols-2 gap-x-3 gap-y-0.5">
                {group.steps.map((line, index) => {
                  const number =
                    judgeGroups
                      .slice(0, judgeGroups.indexOf(group))
                      .reduce((count, item) => count + item.steps.length, 0) +
                    index +
                    1;
                  return (
                    <li key={line} className="flex gap-1.5 text-sm leading-tight text-fg/90 min-[1440px]:text-base">
                      <span className="w-5 shrink-0 font-display font-semibold text-olive">{number}.</span>
                      <span>{line}</span>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
        <div className="mt-1 h-8 shrink-0 min-[1440px]:h-auto min-[1440px]:min-h-10 min-[1440px]:flex-1" aria-hidden="true">
          <svg viewBox="0 0 320 72" className="h-full w-full" preserveAspectRatio="xMidYMax meet">
            <circle cx="36" cy="36" r="22" className="fill-none stroke-olive" strokeWidth="4" />
            <path d="M36 20 V36 H48" className="fill-none stroke-olive" strokeWidth="3" />
            <rect x="84" y="28" width="28" height="28" className="fill-olive/80" />
            <rect x="120" y="18" width="28" height="38" className="fill-olive" />
            <rect x="156" y="34" width="28" height="22" className="fill-olive/45" />
            <circle cx="220" cy="36" r="14" className="fill-ember" />
            <path d="M252 22 H292 V50 H252 Z" className="fill-none stroke-olive" strokeWidth="2" />
            <path d="M260 36 H284" className="stroke-olive" strokeWidth="2" />
          </svg>
        </div>
        <Button type="button" className="mt-1 shrink-0" onClick={onGoToHandle}>
          Go to the handle
        </Button>
      </article>
    </section>
  );
}

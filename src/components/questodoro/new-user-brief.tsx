const rules = [
  "Work pays 4 XP a minute when the block finishes. Floor is 4.",
  "A mission pays about 1 XP per 5 seconds, 2–20. Side XP caps at 100 a day.",
  "Level rises every 200 XP. A day streak needs a finished work block.",
  "HOW YA, GRINDING, and PUSH log the feed. They do not pay XP.",
];

const steps = [
  "Start the work clock. Finish the block. Rest starts on that same ring.",
  "Start one mission. Its clock is separate. Hit Complete when it is done.",
  "Check in with HOW YA, GRINDING, or PUSH. The newest line sits at the bottom.",
  "Yesterday you is the opponent. Beat that number.",
];

export function NewUserBrief() {
  return (
    <section
      aria-label="New user check-in"
      className="stagger-item grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4"
    >
      <article className="rounded-xl bg-surface px-4 py-3 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)]">
        <h2 className="font-display text-xs font-semibold uppercase tracking-kicker text-olive">
          Rules
        </h2>
        <ul className="mt-2 space-y-1 text-sm leading-snug text-muted">
          {rules.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </article>

      <article className="rounded-xl bg-surface px-4 py-3 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)]">
        <h2 className="font-display text-xs font-semibold uppercase tracking-kicker text-olive">
          How this works
        </h2>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm leading-snug text-muted">
          {steps.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      </article>

      <article className="rounded-xl bg-surface px-4 py-3 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)]">
        <h2 className="font-display text-xs font-semibold uppercase tracking-kicker text-olive">
          Why it helps
        </h2>
        <p className="mt-2 text-sm leading-snug text-muted">
          A focus block and a real break beat one long blur. You work while the ring runs. You
          rest when it says rest. Attention comes back, and the day gets a shape. That is the
          whole Pomodoro idea. Oorah.
        </p>
      </article>

      <article className="rounded-xl bg-surface px-4 py-3 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)]">
        <h2 className="font-display text-xs font-semibold uppercase tracking-kicker text-olive">
          Judges
        </h2>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm leading-snug text-muted">
          <li>Hit Drill 15s, then Start. Let the work ring finish.</li>
          <li>Start a mission, then Complete.</li>
          <li>Hit HOW YA, GRINDING, or PUSH. Watch the feed.</li>
        </ol>
        <p className="mt-2 text-xs text-muted">Partner chat is not live on this board.</p>
      </article>
    </section>
  );
}

import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { EnlistGate } from "@/components/questodoro/enlist-gate";
import { QuestodoroBoard } from "@/components/questodoro/board";
import { readCallSign } from "@/lib/questodoro/callsign";
import { startNonaConfig } from "@/lib/questodoro/nona-config";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [enlisted, setEnlisted] = useState<boolean | null>(null);

  useEffect(() => {
    startNonaConfig();
    setEnlisted(readCallSign() !== null);
  }, []);

  if (enlisted === null) {
    return <main className="min-h-dvh bg-bg" />;
  }
  if (!enlisted) {
    return <EnlistGate onEnter={() => setEnlisted(true)} />;
  }
  return <QuestodoroBoard />;
}

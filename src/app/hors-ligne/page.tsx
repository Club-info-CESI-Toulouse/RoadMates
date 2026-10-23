import type { Metadata } from "next";

export const metadata: Metadata = { title: "Hors ligne · RoadMates" };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-3xl font-bold tracking-tight">
        RoadMates<span className="text-primary">_</span>
      </p>
      <p className="text-muted">Pas de connexion internet. Réessaie dès que tu es en ligne.</p>
    </main>
  );
}

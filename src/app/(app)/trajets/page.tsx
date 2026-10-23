import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Mes trajets · RoadMates" };

export default function TripsPage() {
  return (
    <PageShell title="Mes trajets">
      <p className="text-muted">Tu n&apos;as pas encore de trajet.</p>
    </PageShell>
  );
}

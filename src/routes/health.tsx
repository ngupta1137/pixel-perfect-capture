import { createFileRoute } from "@tanstack/react-router";
import { ComingLater, RequireView } from "@/components/shell/Denied";
import { routeCaps } from "@/lib/rights";

export const Route = createFileRoute("/health")({
  head: () => ({
    meta: [
      { title: "Health — Verity" },
      { name: "description", content: "Aggregate health metrics, all illustrative." },
      { property: "og:title", content: "Health — Verity" },
      { property: "og:description", content: "Aggregate health metrics, all illustrative." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HealthPage,
});

function HealthPage() {
  return (
    <RequireView caps={routeCaps("/health")}>
      <ComingLater title="Health" intro="Aggregate health metrics, all illustrative." />
    </RequireView>
  );
}

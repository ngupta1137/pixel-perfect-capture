import { createFileRoute } from "@tanstack/react-router";
import { ComingLater, RequireView } from "@/components/shell/Denied";
import { routeCaps } from "@/lib/rights";

export const Route = createFileRoute("/legal")({
  head: () => ({
    meta: [
      { title: "Legal queue — Verity" },
      { name: "description", content: "Verbatim and legally approved wording to decide." },
      { property: "og:title", content: "Legal queue — Verity" },
      { property: "og:description", content: "Verbatim and legally approved wording to decide." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LegalQueuePage,
});

function LegalQueuePage() {
  return (
    <RequireView caps={routeCaps("/legal")}>
      <ComingLater title="Legal queue" intro="Verbatim and legally approved wording to decide." />
    </RequireView>
  );
}

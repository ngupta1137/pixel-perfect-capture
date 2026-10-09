import { createFileRoute } from "@tanstack/react-router";
import { ComingLater, RequireView } from "@/components/shell/Denied";
import { routeCaps } from "@/lib/rights";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "Needs my review — Verity" },
      { name: "description", content: "Stale, conflict and flagged items, and pending approvals for owners." },
      { property: "og:title", content: "Needs my review — Verity" },
      { property: "og:description", content: "Stale, conflict and flagged items, and pending approvals for owners." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NeedsMyReviewPage,
});

function NeedsMyReviewPage() {
  return (
    <RequireView caps={routeCaps("/review")}>
      <ComingLater title="Needs my review" intro="Stale, conflict and flagged items, and pending approvals for owners." />
    </RequireView>
  );
}

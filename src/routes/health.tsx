import { createFileRoute } from "@tanstack/react-router";
import { RequirePage } from "@/components/shell/Denied";
import { AnalyticsView } from "@/components/analytics/AnalyticsView";

export const Route = createFileRoute("/health")({
  head: () => ({
    meta: [
      { title: "Analytics — Verity" },
      {
        name: "description",
        content: "Track usage, content performance and knowledge gaps across Verity.",
      },
      { property: "og:title", content: "Analytics — Verity" },
      {
        property: "og:description",
        content: "Track usage, content performance and knowledge gaps across Verity.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequirePage to="/health">
      <AnalyticsView />
    </RequirePage>
  ),
});


import { createFileRoute } from "@tanstack/react-router";
import { RequirePage } from "@/components/shell/Denied";
import { ReviewQueueView } from "@/components/review/ReviewQueueView";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "Review queue — Verity" },
      {
        name: "description",
        content:
          "Review extracted knowledge units and approve, reject or request changes.",
      },
      { property: "og:title", content: "Review queue — Verity" },
      {
        property: "og:description",
        content:
          "Review extracted knowledge units and approve, reject or request changes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequirePage to="/review">
      <ReviewQueueView />
    </RequirePage>
  ),
});

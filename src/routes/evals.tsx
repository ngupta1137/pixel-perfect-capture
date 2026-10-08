import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/AppShell";

export const Route = createFileRoute("/evals")({
  head: () => ({
    meta: [
      { title: "Evals — Verity" },
      { name: "description", content: "Verity Evals workspace for governed knowledge content." },
      { property: "og:title", content: "Evals — Verity" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        property: "og:description",
        content: "Verity Evals workspace for governed knowledge content.",
      },
    ],
  }),
  component: () => (
    <PagePlaceholder title="Evals">
      <p className="text-ink-muted">Coming soon.</p>
    </PagePlaceholder>
  ),
});

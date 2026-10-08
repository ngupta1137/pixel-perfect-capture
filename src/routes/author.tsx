import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/AppShell";

export const Route = createFileRoute("/author")({
  head: () => ({
    meta: [
      { title: "Author — Verity" },
      { name: "description", content: "Verity Author workspace for governed knowledge content." },
      { property: "og:title", content: "Author — Verity" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:description", content: "Verity Author workspace for governed knowledge content." },
    ],
  }),
  component: () => (
    <PagePlaceholder title="Author">
      <p className="text-ink-muted">Coming soon.</p>
    </PagePlaceholder>
  ),
});

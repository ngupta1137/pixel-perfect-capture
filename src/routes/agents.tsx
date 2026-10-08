import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/AppShell";

export const Route = createFileRoute("/agents")({
  head: () => ({
    meta: [
      { title: "Agents — Verity" },
      { name: "description", content: "Verity Agents workspace for governed knowledge content." },
      { property: "og:title", content: "Agents — Verity" },
      { property: "og:description", content: "Verity Agents workspace for governed knowledge content." },
    ],
  }),
  component: () => (
    <PagePlaceholder title="Agents">
      <p className="text-ink-muted">Coming soon.</p>
    </PagePlaceholder>
  ),
});

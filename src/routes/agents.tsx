import { createFileRoute } from "@tanstack/react-router";
import { RequirePage } from "@/components/shell/Denied";
import { AgentsToolsView } from "@/components/agents/AgentsToolsView";

export const Route = createFileRoute("/agents")({
  head: () => ({
    meta: [
      { title: "Agents & tools — Verity" },
      { name: "description", content: "Manage AI agents and connected tools used by Verity." },
      { property: "og:title", content: "Agents & tools — Verity" },
      {
        property: "og:description",
        content: "Manage AI agents and connected tools used by Verity.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequirePage to="/agents">
      <AgentsToolsView />
    </RequirePage>
  ),
});


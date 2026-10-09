import { createFileRoute } from "@tanstack/react-router";
import { ComingLater, RequireView } from "@/components/shell/Denied";
import { routeCaps } from "@/lib/rights";

export const Route = createFileRoute("/access")({
  head: () => ({
    meta: [
      { title: "Access — Verity" },
      { name: "description", content: "Who may read which knowledge base." },
      { property: "og:title", content: "Access — Verity" },
      { property: "og:description", content: "Who may read which knowledge base." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccessPage,
});

function AccessPage() {
  return (
    <RequireView caps={routeCaps("/access")}>
      <ComingLater title="Access" intro="Who may read which knowledge base." />
    </RequireView>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { ComingLater, RequireView } from "@/components/shell/Denied";
import { routeCaps } from "@/lib/rights";

export const Route = createFileRoute("/work")({
  head: () => ({
    meta: [
      { title: "My work — Verity" },
      { name: "description", content: "Sources, drafts, gaps and insights for knowledge authors." },
      { property: "og:title", content: "My work — Verity" },
      { property: "og:description", content: "Sources, drafts, gaps and insights for knowledge authors." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyWorkPage,
});

function MyWorkPage() {
  return (
    <RequireView caps={routeCaps("/work")}>
      <ComingLater title="My work" intro="Sources, drafts, gaps and insights for knowledge authors." />
    </RequireView>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { ComingLater, RequireView } from "@/components/shell/Denied";
import { routeCaps } from "@/lib/rights";

export const Route = createFileRoute("/rights")({
  head: () => ({
    meta: [
      { title: "Rights — Verity" },
      { name: "description", content: "Every persona and what they may do, from the rights policy." },
      { property: "og:title", content: "Rights — Verity" },
      { property: "og:description", content: "Every persona and what they may do, from the rights policy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RightsPage,
});

function RightsPage() {
  return (
    <RequireView caps={routeCaps("/rights")}>
      <ComingLater title="Rights" intro="Every persona and what they may do, from the rights policy." />
    </RequireView>
  );
}

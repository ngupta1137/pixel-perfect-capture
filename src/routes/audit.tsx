import { createFileRoute } from "@tanstack/react-router";
import { ComingLater, RequireView } from "@/components/shell/Denied";
import { routeCaps } from "@/lib/rights";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Audit — Verity" },
      { name: "description", content: "Proposals, decisions, access changes and denials." },
      { property: "og:title", content: "Audit — Verity" },
      { property: "og:description", content: "Proposals, decisions, access changes and denials." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  return (
    <RequireView caps={routeCaps("/audit")}>
      <ComingLater title="Audit" intro="Proposals, decisions, access changes and denials." />
    </RequireView>
  );
}

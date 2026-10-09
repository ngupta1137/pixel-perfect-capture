import { createFileRoute } from "@tanstack/react-router";
import { RequirePage } from "@/components/shell/Denied";
import { SettingsView } from "@/components/settings/SettingsView";

export const Route = createFileRoute("/access")({
  head: () => ({
    meta: [
      { title: "Settings — Verity" },
      {
        name: "description",
        content: "Manage workspace settings, users, permissions and system configuration.",
      },
      { property: "og:title", content: "Settings — Verity" },
      {
        property: "og:description",
        content: "Manage workspace settings, users, permissions and system configuration.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequirePage to="/access">
      <SettingsView />
    </RequirePage>
  ),
});


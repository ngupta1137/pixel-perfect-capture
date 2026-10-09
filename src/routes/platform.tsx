import { createFileRoute, redirect } from "@tanstack/react-router";

// Guide shortcut: platform tools and call log live on the Agents page.
export const Route = createFileRoute("/platform")({
  beforeLoad: () => {
    throw redirect({ to: "/agents" });
  },
});

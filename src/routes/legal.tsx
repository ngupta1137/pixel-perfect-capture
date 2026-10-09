import { createFileRoute, redirect } from "@tanstack/react-router";

// Guide shortcut: the legal review queue lives on the Author page.
export const Route = createFileRoute("/legal")({
  beforeLoad: () => {
    throw redirect({ to: "/author" });
  },
});

import { createFileRoute, redirect } from "@tanstack/react-router";

// Guide shortcut: authors' work happens on the Author page.
export const Route = createFileRoute("/work")({
  beforeLoad: () => {
    throw redirect({ to: "/author" });
  },
});

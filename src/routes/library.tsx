import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { RequirePage } from "@/components/shell/Denied";
import { pageHead } from "@/lib/page-head";
import { setBreadcrumbs } from "@/lib/breadcrumbs";
import { KnowledgeLibraryView } from "@/components/library/KnowledgeLibraryView";

export const Route = createFileRoute("/library")({
  validateSearch: (search: Record<string, unknown>): { unit?: string | undefined } => ({
    unit: typeof search["unit"] === "string" ? search["unit"] : undefined,
  }),
  head: () =>
    pageHead(
      "Knowledge library",
      "Browse and search approved knowledge units. All content is reviewed, permission-aware and governed.",
    ),
  component: () => (
    <RequirePage to="/library">
      <LibraryPage />
    </RequirePage>
  ),
});

function LibraryPage() {
  let unit: string | undefined;
  try {
    const search = Route.useSearch();
    unit = search?.unit;
  } catch {
    unit = undefined;
  }

  useEffect(() => {
    setBreadcrumbs(["Workspace", "Knowledge library"]);
    return () => setBreadcrumbs([]);
  }, []);

  return <KnowledgeLibraryView initialUnitId={unit} />;
}

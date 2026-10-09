import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { RequirePage } from "@/components/shell/Denied";
import { pageHead } from "@/lib/page-head";
import { setBreadcrumbs } from "@/lib/breadcrumbs";
import { KnowledgeLibraryView } from "@/components/library/KnowledgeLibraryView";

export const Route = createFileRoute("/library")({
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
  useEffect(() => {
    setBreadcrumbs(["Workspace", "Knowledge library"]);
    return () => setBreadcrumbs([]);
  }, []);

  return <KnowledgeLibraryView />;
}

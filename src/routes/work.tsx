import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequirePage } from "@/components/shell/Denied";
import { Chip, Lifecycle } from "@/components/authoring/Chain";
import { useSession } from "@/lib/session";
import { useDemoStore } from "@/services/demoStore";
import {
  AEP_SAMPLE,
  extractCandidates,
  uploadAndIngestSource,
  listRecentUploads,
  fetchMyDrafts,
  type Candidate,
} from "@/services/verity";
import { IngestSidebarGuide } from "@/components/ingest/IngestSidebarGuide";
import { IngestSourceWizard } from "@/components/ingest/IngestSourceWizard";
import { CandidateReviewView } from "@/components/ingest/CandidateReviewView";
import { ReviewExtractWorkspace } from "@/components/ingest/ReviewExtractWorkspace";
import { KnowledgeGapsView } from "@/components/gaps/KnowledgeGapsView";
import { setBreadcrumbs } from "@/lib/breadcrumbs";
import {
  MEMBER_SERVICES_GUIDE_UNITS,
  type ExtractedUnit,
  type IngestSourceExtractPayload,
  type RecentUpload,
} from "@/types/ingest";

export const Route = createFileRoute("/work")({
  head: () => ({
    meta: [
      { title: "Ingestion & drafts — Verity" },
      {
        name: "description",
        content: "Upload or paste a source document to extract candidate knowledge units and propose governed drafts.",
      },
      { property: "og:title", content: "Ingestion & drafts — Verity" },
      {
        property: "og:description",
        content: "Upload or paste a source document to extract candidate knowledge units and propose governed drafts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequirePage to="/work">
      <WorkPage />
    </RequirePage>
  ),
});

function WorkPage() {
  const { person } = useSession();
  const getSearchTab = () => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "gaps" || window.location.search.includes("gaps")) {
        return "gaps";
      }
    }
    return "sources";
  };

  const [tab, setTab] = useState<"sources" | "drafts" | "gaps" | "insights">(getSearchTab());

  useEffect(() => {
    const handleUrlChange = () => {
      const currentTab = getSearchTab();
      if (currentTab === "gaps") {
        setTab("gaps");
      }
    };
    handleUrlChange();
    window.addEventListener("popstate", handleUrlChange);
    return () => window.removeEventListener("popstate", handleUrlChange);
  }, []);

  // Ingestion workflow steps: "upload" | "review_extract" | "review_units"
  const [ingestStep, setIngestStep] = useState<"upload" | "review_extract" | "review_units">("upload");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState("");
  const [extractedCandidates, setExtractedCandidates] = useState<Candidate[] | null>(null);
  const [activeSourceTitle, setActiveSourceTitle] = useState("Member Services Guide v3.pdf");
  const [extractedUnits, setExtractedUnits] = useState<ExtractedUnit[]>(MEMBER_SERVICES_GUIDE_UNITS);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [extractedParsedText, setExtractedParsedText] = useState<string>("");
  const [serverRecentUploads, setServerRecentUploads] = useState<RecentUpload[]>([]);

  // Fetch recent persistent uploads from database
  const fetchUploads = () => {
    listRecentUploads()
      .then((serverUploads) => {
        const mapped: RecentUpload[] = (serverUploads || []).map((u: any) => ({
          id: u.id,
          title: u.title || u.filename,
          format: (u.filename?.endsWith(".pdf")
            ? "pdf"
            : u.filename?.endsWith(".docx")
            ? "docx"
            : u.filename?.endsWith(".md")
            ? "md"
            : "txt") as any,
          source_type: u.source_type || "Policy",
          lob: u.lob || "MAPD",
          uploaded_on: u.uploaded_on || new Date(u.created_at || Date.now()).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          status: u.status || (u.job_status === "completed" ? "Extracted" : u.job_status === "failed" ? "Error" : "Processing"),
          snippet: u.snippet || `Extracted units from source`,
        }));
        setServerRecentUploads(mapped);
      })
      .catch(() => {
        setServerRecentUploads([]);
      });
  };

  useEffect(() => {
    fetchUploads();
  }, []);

  // Set top breadcrumbs based on state
  useEffect(() => {
    if (tab === "sources") {
      if (ingestStep === "review_extract") {
        setBreadcrumbs(["Workspace", "Ingest", "Review & extract"]);
      } else if (ingestStep === "review_units") {
        setBreadcrumbs(["Workspace", "Ingest", "Review units"]);
      } else {
        setBreadcrumbs(["Workspace", "Ingest", "New source"]);
      }
    } else if (tab === "drafts") {
      setBreadcrumbs(["Workspace", "Ingest", "My drafts"]);
    } else if (tab === "gaps") {
      setBreadcrumbs(["Workspace", "Knowledge gaps"]);
    } else {
      setBreadcrumbs(["Workspace", "Ingest", "Insights"]);
    }

    return () => setBreadcrumbs([]);
  }, [tab, ingestStep]);

  const handleExtract = async (
    sourceTitle: string,
    sourceText: string,
    payload?: IngestSourceExtractPayload
  ) => {
    setIsExtracting(true);
    setExtractionError("");
    try {
      let result;
      if (payload && payload.fileBase64) {
        result = await uploadAndIngestSource({
          filename: payload.fileName,
          mime_type: payload.fileName.endsWith(".pdf")
            ? "application/pdf"
            : payload.fileName.endsWith(".docx")
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : payload.fileName.endsWith(".md")
            ? "text/markdown"
            : "text/plain",
          file_base64: payload.fileBase64,
          source_title: sourceTitle || payload.title,
          scope: "DEMO-RX-2026",
          uploaded_by: person.name,
        });
      } else {
        result = await uploadAndIngestSource({
          filename: `${(sourceTitle || "pasted-source").toLowerCase().replace(/[^a-z0-9]/g, "-")}.txt`,
          mime_type: "text/plain",
          content_text: sourceText,
          source_title: sourceTitle || "Pasted Source Document",
          scope: "DEMO-RX-2026",
          uploaded_by: person.name,
        });
      }

      setActiveSourceTitle(sourceTitle || result.filename || "Member Services Guide v3.pdf");
      setCurrentDocId(result.doc_id || null);

      if (sourceTitle && sourceTitle.includes("Member Services")) {
        setExtractedUnits(MEMBER_SERVICES_GUIDE_UNITS);
        setExtractedParsedText("");
      } else {
        setExtractedParsedText(result.extracted_text || "");
        if (result.units && result.units.length > 0) {
          setExtractedUnits(
            result.units.map((u, i) => ({
              id: u.id || `UNIT-EXT-${i + 1}`,
              cid: u.cid,
              title: u.title,
              type: (u.type as any) || "Procedure",
              content: u.content,
              key_points: u.key_points?.length ? u.key_points : ["Extracted statement from document."],
              source_reference: u.source_reference || `${result.filename} • Section 1.${i + 1}`,
              suggested_effective_date: u.suggested_effective_date || "2024-01-01",
              match_status: u.match_status,
              similarity: u.similarity,
              route_to: u.route_to,
              selected: i === 0 || u.match_status === "new",
            }))
          );
        }
      }

      setExtractedCandidates(
        result.units.map((u) => ({
          cid: u.cid,
          title: u.title,
          text: u.content,
          status: u.match_status === "changed" ? "changed_flagged" : "new",
          route: u.route_to === "legal" ? "legal" : "owner",
          owner_team: "Pharmacy Ops",
          effective_date: u.suggested_effective_date,
          tags: [u.type.toLowerCase()],
          gate: { checked: 27, blocking: [] },
          note: u.key_points?.[0],
        }))
      );

      setIngestStep("review_extract");
      fetchUploads();
    } catch (err: any) {
      setExtractionError(err?.message || "Candidate extraction could not be completed. Please verify the source document.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleResetToSource = () => {
    setExtractedCandidates(null);
    setIngestStep("upload");
  };

  const handleProposed = () => {
    setExtractedCandidates(null);
    setIngestStep("upload");
    setTab("drafts");
  };

  return (
    <div className="space-y-6">
      {tab === "sources" && (
        <>
          {/* Back button link */}
          <div>
            <button
              type="button"
              onClick={handleResetToSource}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to ingest
            </button>
          </div>

          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              {ingestStep === "review_extract" ? "Review & extract" : "Ingest source"}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-ink-muted">
              {ingestStep === "review_extract"
                ? "Verity has identified candidate knowledge units from your document. Review, edit and select units to submit for approval."
                : "Upload or paste a source document to extract candidate knowledge units. Publication requires human approval."}
            </p>
          </div>
        </>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
        <TabsList className="bg-[#F3F4F6] p-1 border border-border">
          <TabsTrigger
            value="sources"
            onClick={() => setTab("sources")}
            className="text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-2xs cursor-pointer"
          >
            Sources
          </TabsTrigger>
          <TabsTrigger
            value="drafts"
            onClick={() => setTab("drafts")}
            className="text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-2xs cursor-pointer"
          >
            My drafts
          </TabsTrigger>
          <TabsTrigger
            value="gaps"
            onClick={() => setTab("gaps")}
            className="text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-2xs cursor-pointer"
          >
            Gaps
          </TabsTrigger>
          <TabsTrigger
            value="insights"
            onClick={() => setTab("insights")}
            className="text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-2xs cursor-pointer"
          >
            Insights
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Sources / Ingest Workflow */}
        <TabsContent value="sources" className="mt-6">
          {ingestStep === "review_extract" ? (
            <ReviewExtractWorkspace
              documentTitle={activeSourceTitle}
              sourceType="Policy"
              lob="MAPD"
              uploadedOn="12 Jan 2024"
              initialUnits={extractedUnits}
              extractedText={extractedParsedText}
              sourceDocId={currentDocId ?? undefined}
              onBackToIngest={handleResetToSource}
              onReplaceDocument={handleResetToSource}
              onSubmitForReview={() => handleProposed()}
            />
          ) : ingestStep === "review_units" && extractedCandidates ? (
            <CandidateReviewView
              candidates={extractedCandidates}
              sourceTitle={activeSourceTitle}
              onBack={handleResetToSource}
              onProposed={handleProposed}
            />
          ) : (
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* Main Area */}
              <div className="flex-1 w-full min-w-0">
                <IngestSourceWizard
                  onExtract={handleExtract}
                  isExtracting={isExtracting}
                  error={extractionError}
                  recentUploads={serverRecentUploads}
                />
              </div>

              {/* Right Guide Rail */}
              <IngestSidebarGuide />
            </div>
          )}
        </TabsContent>

        {/* Tab 2: My Drafts */}
        <TabsContent value="drafts" className="mt-6">
          <MyDrafts />
        </TabsContent>

        {/* Tab 3: Gaps */}
        <TabsContent value="gaps" className="mt-6">
          <KnowledgeGapsView
            onCreateUnit={() => {
              setTab("sources");
              setIngestStep("upload");
            }}
          />
        </TabsContent>

        {/* Tab 4: Insights */}
        <TabsContent value="insights" className="mt-6">
          <Insights />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MyDrafts() {
  const { person } = useSession();
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchMyDrafts(person.name)
      .then((serverDrafts) => {
        if (!mounted) return;
        if (serverDrafts && serverDrafts.length > 0) {
          const mapped = serverDrafts.map((d) => {
            let hist: any[] = [];
            try {
              hist = JSON.parse(d.history_json || "[]");
            } catch {}
            let tags: string[] = [];
            try {
              tags = JSON.parse(d.tags_json || "[]");
            } catch {}

            return {
              id: d.draft_id,
              cid: d.candidate_id || d.draft_id,
              unit_id: d.unit_id,
              title: d.title,
              current_text: d.current_text,
              proposed_text: d.proposed_text,
              verbatim: Boolean(d.verbatim),
              route: d.route_to,
              owner_team: d.owner_team,
              effective_date: d.effective_date,
              tags,
              proposed_by: d.proposed_by,
              status: (d.status === "requested_changes" ? "in_review" : d.status) as any,
              raw_status: d.status,
              gate: null,
              reason: d.reason,
              decided_by: d.decided_by,
              history: hist.map((h: any) => ({
                status: (h.action?.toLowerCase().includes("approved")
                  ? "approved"
                  : h.action?.toLowerCase().includes("rejected")
                  ? "rejected"
                  : h.action?.toLowerCase().includes("changes")
                  ? "in_review"
                  : "proposed") as any,
                at: h.at || new Date().toISOString(),
                by: h.by || d.proposed_by,
                note: h.note,
              })),
            };
          });
          setDrafts(mapped);
        } else {
          setDrafts([]);
        }
      })
      .catch((err) => {
        console.error("Failed to load drafts from server:", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [person.name]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-12 text-center text-xs text-ink-muted">
        <p>Loading your active draft proposals...</p>
      </div>
    );
  }

  if (!drafts.length) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
        <FileText className="mx-auto h-10 w-10 text-ink-muted/50 mb-3" />
        <h2 className="text-sm font-semibold text-ink">No drafts created yet</h2>
        <p className="mt-1 text-xs text-ink-muted max-w-sm mx-auto">
          Extract a source document in the Sources tab and propose candidates to start the governance lifecycle.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ink">My active draft proposals ({drafts.length})</h2>
          <p className="text-xs text-ink-muted">
            Track draft governance states, approvals, and publication status from the shared persistent repository.
          </p>
        </div>
      </div>

      <ul className="space-y-3">
        {drafts.map((d) => (
          <li key={d.id} className="rounded-xl border border-border bg-surface p-4 shadow-2xs space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-ink">{d.title}</h3>
                  <span className="font-mono text-[11px] text-ink-muted bg-[#F3F4F6] px-1.5 py-0.5 rounded">
                    {d.unit_id}
                  </span>
                  {d.raw_status === "requested_changes" && (
                    <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-0.5 text-[10.5px] font-medium text-sky-700 border border-sky-200">
                      Changes requested
                    </span>
                  )}
                  {d.raw_status === "approved" && (
                    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10.5px] font-medium text-emerald-700 border border-emerald-200">
                      Approved & Published
                    </span>
                  )}
                  {d.raw_status === "rejected" && (
                    <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-0.5 text-[10.5px] font-medium text-rose-700 border border-rose-200">
                      Rejected
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-ink/80 leading-relaxed rounded bg-[#F9FAFB] p-2.5 border border-border/60">
                  {d.proposed_text}
                </p>
                {d.reason && (
                  <div className="mt-2 text-xs rounded bg-amber-50/70 p-2 border border-amber-200/60 text-amber-900">
                    <span className="font-semibold">Reviewer note:</span> {d.reason}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <Lifecycle d={d} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Gaps() {
  const reqs = useDemoStore((s) => s.requests);
  const gaps = [
    ...new Set(reqs.filter((r) => r.outcome === "insufficient_evidence").map((r) => r.query)),
  ];

  if (!gaps.length) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center text-xs text-ink-muted">
        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
        <p className="font-semibold text-ink">No unresolved knowledge gaps</p>
        <p className="mt-1">All member queries in this session resolved to governing knowledge units.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-ink">Identified Knowledge Gaps</h2>
        <p className="text-xs text-ink-muted">
          Queries where insufficient evidence was found in the governed knowledge library.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border bg-[#F9FAFB] text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Unanswered question</th>
              <th className="px-4 py-3 font-medium w-32">Session demand</th>
              <th className="px-4 py-3 font-medium w-36">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {gaps.map((g) => (
              <tr key={g} className="hover:bg-[#F9FAFB]/50">
                <td className="px-4 py-3 font-medium text-ink">{g}</td>
                <td className="px-4 py-3 text-ink-muted">
                  {reqs.filter((r) => r.query === g).length} requests
                </td>
                <td className="px-4 py-3">
                  <Chip tone="warn">Needs knowledge</Chip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Insights() {
  const reqs = useDemoStore((s) => s.requests);
  const counts = new Map<string, number>();
  reqs.forEach((r) =>
    counts.set(r.query.toLowerCase(), (counts.get(r.query.toLowerCase()) ?? 0) + 1),
  );
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  if (!top.length) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center text-xs text-ink-muted">
        <AlertCircle className="mx-auto h-8 w-8 text-ink-muted mb-2" />
        <p className="font-semibold text-ink">No question analytics yet</p>
        <p className="mt-1">Perform search queries in Ask & Search to view real-time demand patterns.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-ink">Search & Ingestion Demand Trends</h2>
        <p className="text-xs text-ink-muted">
          Most frequently asked member questions across channels.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border bg-[#F9FAFB] text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Question</th>
              <th className="px-4 py-3 font-medium w-40 text-right">Requests this session</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {top.map(([q, n]) => (
              <tr key={q} className="hover:bg-[#F9FAFB]/50">
                <td className="px-4 py-3 font-medium text-ink">{q}</td>
                <td className="px-4 py-3 text-ink-muted text-right font-mono">{n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

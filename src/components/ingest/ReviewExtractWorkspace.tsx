import { useState, useMemo } from "react";
import {
  FileText,
  Search,
  ChevronRight,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Calendar,
  Check,
  Sparkles,
  ChevronLeft,
  X,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MEMBER_SERVICES_GUIDE_UNITS, type ExtractedUnit } from "@/types/ingest";
import { useSession } from "@/lib/session";
import { proposeCandidates, submitProposedDrafts, type Candidate } from "@/services/verity";

interface ReviewExtractWorkspaceProps {
  documentTitle?: string;
  sourceType?: string;
  lob?: string;
  uploadedOn?: string;
  initialUnits?: ExtractedUnit[];
  extractedText?: string;
  sourceDocId?: string;
  onBackToIngest: () => void;
  onReplaceDocument: () => void;
  onSubmitForReview: (proposedUnits: ExtractedUnit[]) => void;
}

export function ReviewExtractWorkspace({
  documentTitle = "Member Services Guide v3.pdf",
  sourceType = "Policy",
  lob = "MAPD",
  uploadedOn = "12 Jan 2024",
  initialUnits = MEMBER_SERVICES_GUIDE_UNITS,
  extractedText,
  sourceDocId,
  onBackToIngest,
  onReplaceDocument,
  onSubmitForReview,
}: ReviewExtractWorkspaceProps) {
  const { person } = useSession();
  const [units, setUnits] = useState<ExtractedUnit[]>(initialUnits);
  const [activeUnitId, setActiveUnitId] = useState<string>(initialUnits[0]?.id ?? "UNIT-MSG-001");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  
  // Document preview controls
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 24;
  const [zoomLevel, setZoomLevel] = useState(100);

  // Active unit editor state
  const activeUnit = useMemo(() => {
    return units.find((u) => u.id === activeUnitId) || units[0];
  }, [units, activeUnitId]);

  const [editTitle, setEditTitle] = useState(activeUnit?.title ?? "");
  const [editType, setEditType] = useState<ExtractedUnit["type"]>(activeUnit?.type ?? "Policy");
  const [editContent, setEditContent] = useState(activeUnit?.content ?? "");
  const [editKeyPoints, setEditKeyPoints] = useState(
    activeUnit?.key_points ? activeUnit.key_points.map((p) => `• ${p}`).join("\n") : ""
  );
  const [editSourceRef, setEditSourceRef] = useState(activeUnit?.source_reference ?? "");
  const [editEffectiveDate, setEditEffectiveDate] = useState(activeUnit?.suggested_effective_date ?? "2024-01-01");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // When active unit changes, populate edit form
  const handleSelectUnit = (unit: ExtractedUnit) => {
    setActiveUnitId(unit.id);
    setEditTitle(unit.title);
    setEditType(unit.type);
    setEditContent(unit.content);
    setEditKeyPoints(unit.key_points.map((p) => `• ${p}`).join("\n"));
    setEditSourceRef(unit.source_reference);
    setEditEffectiveDate(unit.suggested_effective_date);
    setSaveSuccess(false);
  };

  const handleToggleSelectUnit = (unitId: string) => {
    setUnits((prev) =>
      prev.map((u) => (u.id === unitId ? { ...u, selected: !u.selected } : u))
    );
  };

  const handleSaveChanges = () => {
    if (!activeUnit) return;
    const parsedKeyPoints = editKeyPoints
      .split("\n")
      .map((line) => line.replace(/^[•\-\*]\s*/, "").trim())
      .filter(Boolean);

    setUnits((prev) =>
      prev.map((u) =>
        u.id === activeUnit.id
          ? {
              ...u,
              title: editTitle,
              type: editType,
              content: editContent,
              key_points: parsedKeyPoints,
              source_reference: editSourceRef,
              suggested_effective_date: editEffectiveDate,
            }
          : u
      )
    );
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleDiscardChanges = () => {
    if (!activeUnit) return;
    setEditTitle(activeUnit.title);
    setEditType(activeUnit.type);
    setEditContent(activeUnit.content);
    setEditKeyPoints(activeUnit.key_points.map((p) => `• ${p}`).join("\n"));
    setEditSourceRef(activeUnit.source_reference);
    setEditEffectiveDate(activeUnit.suggested_effective_date);
    setSaveSuccess(false);
  };

  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      const matchesSearch =
        u.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType =
        typeFilter === "all" || u.type.toLowerCase() === typeFilter.toLowerCase();
      return matchesSearch && matchesType;
    });
  }, [units, searchQuery, typeFilter]);

  const selectedUnits = units.filter((u) => u.selected);

  const handleSubmit = async () => {
    if (selectedUnits.length === 0) return;
    setIsSubmitting(true);
    setSubmitError("");
    try {
      if (sourceDocId) {
        await submitProposedDrafts({
          sourceDocId,
          candidateIds: selectedUnits.map((u) => u.id),
          proposerName: person.name,
          proposerRole: person.role,
        });
      }

      const toPropose: Candidate[] = selectedUnits.map((u) => ({
        cid: u.cid ?? u.id,
        title: u.title,
        text: u.content,
        status: "new",
        route: u.type === "Legal" ? "legal" : "owner",
        owner_team: "Pharmacy Ops",
        effective_date: u.suggested_effective_date,
        tags: [u.type.toLowerCase()],
        gate: { checked: 27, blocking: [] },
      }));

      proposeCandidates(person.name, toPropose);
      onSubmitForReview(selectedUnits);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit drafts for review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 4-Step Stepper Header */}
      <div className="border-b border-border pb-5">
        <ol className="flex flex-wrap items-center gap-6 text-xs sm:text-sm">
          {/* Step 1: Upload source (Completed) */}
          <li className="flex items-center gap-2 text-ink">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1E5E2E] text-white text-xs font-bold">
              <Check className="h-3.5 w-3.5" />
            </span>
            <div className="flex flex-col">
              <span className="font-semibold text-xs text-ink">Upload source</span>
              <span className="text-[10px] text-ink-muted">{documentTitle}</span>
            </div>
          </li>
          <div className="h-px w-8 bg-border hidden sm:block" />

          {/* Step 2: Review & extract (Active) */}
          <li className="flex items-center gap-2 font-semibold text-[#1E5E2E]">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1E5E2E] text-white text-xs font-bold">
              2
            </span>
            <span className="border-b-2 border-[#1E5E2E] pb-0.5">Review & extract</span>
          </li>
          <div className="h-px w-8 bg-border hidden sm:block" />

          {/* Step 3: Review units (Upcoming) */}
          <li className="flex items-center gap-2 text-ink-muted">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-xs font-medium text-ink-muted">
              3
            </span>
            <span>Review units</span>
          </li>
          <div className="h-px w-8 bg-border hidden sm:block" />

          {/* Step 4: Submit for review (Upcoming) */}
          <li className="flex items-center gap-2 text-ink-muted">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-xs font-medium text-ink-muted">
              4
            </span>
            <span>Submit for review</span>
          </li>
        </ol>
      </div>

      {/* 3-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Column 1: Document preview (4 cols) */}
        <div className="lg:col-span-4 rounded-xl border border-border bg-surface p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-ink">Document preview</h2>
          </div>

          {/* Page Toolbar & Zoom Controls */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-[#F9FAFB] px-2.5 py-1.5 text-xs text-ink-muted">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="flex items-center justify-center h-5 w-6 rounded border border-border bg-white text-[11px] font-medium text-ink text-center">
                {currentPage}
              </span>
              <span className="text-[11px] text-ink-muted">/ {totalPages}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="flex items-center gap-1 text-[11px]">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
              >
                <ZoomOut className="h-3 w-3" />
              </Button>
              <span className="font-mono text-[10px] text-ink font-medium px-1">
                {zoomLevel}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
              >
                <ZoomIn className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setZoomLevel(100)}
                title="Reset zoom"
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Paper Sheet Preview */}
          <div className="rounded-lg border border-border bg-[#F3F4F6] p-3 max-h-[580px] overflow-y-auto">
            <div
              className="rounded-md border border-border/80 bg-white p-5 shadow-sm space-y-4 text-ink transition-transform origin-top"
              style={{ transform: `scale(${zoomLevel / 100})` }}
            >
              <div className="border-b border-border/60 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-ink leading-tight">
                    {documentTitle.includes("Member Services") ? "Member Services Guide" : documentTitle}
                  </h3>
                  <p className="text-[10px] text-ink-muted mt-0.5">
                    {extractedText
                      ? "Extracted Document Text Preview (Text representation of source document)"
                      : "Page 4 of 24 • Section 4: Pharmacy Benefits"}
                  </p>
                </div>
                <span className="text-[10px] font-mono rounded bg-muted px-2 py-0.5 text-ink-muted">
                  {sourceType} • {lob}
                </span>
              </div>

              {extractedText && (
                <div className="space-y-2 rounded-lg bg-slate-50 p-3 border border-border/70 text-xs">
                  <div className="flex items-center justify-between border-b border-border/40 pb-1.5 mb-1.5">
                    <span className="font-semibold text-ink text-[11px]">Parsed Document Contents</span>
                    <span className="text-[10px] text-ink-muted font-mono">{extractedText.length} chars</span>
                  </div>
                  <div className="text-[11px] leading-relaxed text-ink/90 whitespace-pre-wrap font-sans max-h-[300px] overflow-y-auto">
                    {extractedText}
                  </div>
                </div>
              )}

              {/* Section 4.2 */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-[#1E3A8A]">
                  4.2 Copay Assistance Program
                </h4>
                <p className="text-[11px] leading-relaxed text-ink/90">
                  The Copay Assistance Program helps eligible members reduce out-of-pocket costs for certain covered medications. Members must meet the program criteria to qualify. The program is available for the MAPD plan and applies to medications on the approved list.
                </p>

                <div className="pl-1 space-y-1 text-[11px]">
                  <p className="font-semibold text-ink text-[11px]">Program highlights</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-ink-muted text-[10.5px]">
                    <li>Available for eligible members</li>
                    <li>Applies to select medications</li>
                    <li>Members must meet income and other criteria</li>
                    <li>Program terms and covered medications may change</li>
                    <li>Contact Member Services for the latest information</li>
                  </ul>
                </div>
              </div>

              {/* Section 4.3 */}
              <div className="space-y-2 border-t border-border/50 pt-3">
                <h4 className="font-bold text-xs text-[#1E3A8A]">
                  4.3 Mail Order Pharmacy
                </h4>
                <p className="text-[11px] leading-relaxed text-ink/90">
                  Members can get up to a 90-day supply of maintenance medications through our mail order pharmacy. Standard mailing time is 5 to 7 business days. Mail order medications may have a different copay than retail fills.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Extracted candidate units (4 cols) */}
        <div className="lg:col-span-4 rounded-xl border border-border bg-surface p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-ink">
              Extracted candidate units ({units.length})
            </h2>
          </div>

          {/* Search and Type Filter Toolbar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-ink-muted" />
              <Input
                placeholder="Search extracted content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-28 text-xs h-8 bg-surface">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="policy">Policy</SelectItem>
                <SelectItem value="procedure">Procedure</SelectItem>
                <SelectItem value="guidance">Guidance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Candidate Units List */}
          <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
            {filteredUnits.map((unit) => {
              const isActive = unit.id === activeUnitId;
              return (
                <div
                  key={unit.id}
                  onClick={() => handleSelectUnit(unit)}
                  className={`flex items-start gap-3 rounded-lg border p-3 text-xs transition-all cursor-pointer ${
                    isActive
                      ? "border-[#1E5E2E] bg-[#EAF7EE]/20 shadow-2xs"
                      : "border-border bg-surface hover:bg-[#F9FAFB]"
                  }`}
                >
                  <Checkbox
                    checked={!!unit.selected}
                    onCheckedChange={() => handleToggleSelectUnit(unit.id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Select ${unit.title}`}
                    className="mt-0.5"
                  />

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-1.5">
                      <h3 className="font-semibold text-xs text-ink leading-tight">
                        {unit.title}
                      </h3>
                      <ChevronRight className="h-3.5 w-3.5 text-ink-muted shrink-0 mt-0.5" />
                    </div>
                    <p className="text-[11px] text-ink-muted line-clamp-2 leading-relaxed">
                      {unit.content}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      unit.type === "Policy"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-sky-50 text-sky-700 border border-sky-200"
                    }`}
                  >
                    {unit.type}
                  </span>
                </div>
              );
            })}

            {filteredUnits.length === 0 && (
              <p className="text-center text-xs text-ink-muted py-8">
                No matching candidate units found.
              </p>
            )}
          </div>
        </div>

        {/* Column 3: Document Info & Unit Details (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Top Card: Document info */}
          <div className="rounded-xl border border-border bg-surface p-4 shadow-2xs space-y-3">
            <h2 className="text-xs font-bold text-ink">Document info</h2>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF7EE] text-[#1E5E2E] border border-[#C6E7D0]">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs text-ink truncate">{documentTitle}</p>
                <p className="text-[10px] text-ink-muted mt-0.5">
                  {sourceType} • {lob} • {uploadedOn}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={onReplaceDocument}
              className="w-full text-xs h-8 gap-1.5 border-border hover:bg-[#F9FAFB]"
            >
              <RotateCcw className="h-3.5 w-3.5 text-ink-muted" />
              Replace document
            </Button>
          </div>

          {/* Bottom Card: Unit details editor */}
          {activeUnit ? (
            <div className="rounded-xl border border-border bg-surface p-4 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-ink">Unit details</h2>
                <button
                  type="button"
                  onClick={() => setActiveUnitId("")}
                  className="text-ink-muted hover:text-ink cursor-pointer"
                  title="Close panel"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {/* Title */}
                <div>
                  <label htmlFor="edit-title" className="block text-ink font-medium mb-1">
                    Title
                  </label>
                  <Input
                    id="edit-title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>

                {/* Type */}
                <div>
                  <label htmlFor="edit-type" className="block text-ink font-medium mb-1">
                    Type
                  </label>
                  <Select value={editType} onValueChange={(v) => setEditType(v as any)}>
                    <SelectTrigger id="edit-type" className="text-xs h-8 bg-surface">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      <SelectItem value="Policy">Policy</SelectItem>
                      <SelectItem value="Procedure">Procedure</SelectItem>
                      <SelectItem value="Guidance">Guidance</SelectItem>
                      <SelectItem value="Benefit Details">Benefit Details</SelectItem>
                      <SelectItem value="FAQ">FAQ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Content */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="edit-content" className="block text-ink font-medium">
                      Content
                    </label>
                    <span className="text-[10px] text-ink-muted font-mono">
                      {editContent.length} / 2000
                    </span>
                  </div>
                  <Textarea
                    id="edit-content"
                    rows={4}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="text-xs leading-relaxed"
                  />
                </div>

                {/* Key Points */}
                <div>
                  <label htmlFor="edit-key-points" className="block text-ink font-medium mb-1">
                    Key points <span className="text-ink-muted font-normal">(optional)</span>
                  </label>
                  <Textarea
                    id="edit-key-points"
                    rows={3}
                    value={editKeyPoints}
                    onChange={(e) => setEditKeyPoints(e.target.value)}
                    className="text-xs leading-relaxed"
                    placeholder="• Point 1&#10;• Point 2"
                  />
                </div>

                {/* Source reference */}
                <div>
                  <label htmlFor="edit-source-ref" className="block text-ink font-medium mb-1">
                    Source reference
                  </label>
                  <Input
                    id="edit-source-ref"
                    value={editSourceRef}
                    onChange={(e) => setEditSourceRef(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>

                {/* Suggested effective date */}
                <div>
                  <label htmlFor="edit-effective-date" className="block text-ink font-medium mb-1">
                    Suggested effective date <span className="text-ink-muted font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-ink-muted" />
                    <Input
                      id="edit-effective-date"
                      value={editEffectiveDate}
                      onChange={(e) => setEditEffectiveDate(e.target.value)}
                      className="pl-8 text-xs h-8"
                    />
                  </div>
                </div>
              </div>

              {saveSuccess && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded-md">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Changes saved successfully to draft unit!</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDiscardChanges}
                  className="text-xs h-8 px-4"
                >
                  Discard
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveChanges}
                  className="text-xs h-8 px-4 bg-[#1E5E2E] hover:bg-[#184d25] text-white"
                >
                  Save changes
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-xs text-ink-muted">
              Select a candidate unit from the middle column to inspect and edit unit details.
            </div>
          )}

          {/* Propose Action Banner */}
          <div className="rounded-xl border border-[#C6E7D0] bg-[#EAF7EE]/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-ink">
                Selected for review ({selectedUnits.length} of {units.length})
              </span>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={selectedUnits.length === 0 || isSubmitting}
              className="w-full text-xs h-9 font-semibold gap-1.5 bg-[#1E5E2E] hover:bg-[#184d25] text-white"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isSubmitting ? "Submitting for review..." : `Propose selected (${selectedUnits.length})`}
            </Button>
            {submitError && (
              <p className="text-[11px] text-destructive font-medium">{submitError}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

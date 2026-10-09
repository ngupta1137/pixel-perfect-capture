import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { EnrichedKnowledgeUnit } from "@/lib/library";
import { FileText, Download, ExternalLink, ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";

interface ViewSourceModalProps {
  unit: EnrichedKnowledgeUnit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewSourceModal({ unit, open, onOpenChange }: ViewSourceModalProps) {
  if (!unit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl text-xs sm:max-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#EAF7EE] text-[#1E5E2E]">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-ink">
                {unit.source_doc.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-ink-muted">
                {unit.source_doc.section} • {unit.source_doc.doc_id}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Metadata banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border border-border bg-surface-alt p-3 text-xs">
            <div>
              <span className="text-[11px] text-ink-muted block">Document ID</span>
              <span className="font-mono font-medium text-ink">{unit.source_doc.doc_id}</span>
            </div>
            <div>
              <span className="text-[11px] text-ink-muted block">Ingested Date</span>
              <span className="font-medium text-ink">{unit.source_doc.ingested_at}</span>
            </div>
            <div>
              <span className="text-[11px] text-ink-muted block">Ingested By</span>
              <span className="font-medium text-ink">{unit.source_doc.ingested_by}</span>
            </div>
            <div>
              <span className="text-[11px] text-ink-muted block">Knowledge Base</span>
              <span className="font-mono font-medium text-ink">{unit.kb}</span>
            </div>
          </div>

          {/* Extracted Excerpt Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink">Extracted Text Verified Against Policy</span>
              {unit.verbatim && (
                <Badge variant="outline" className="gap-1 text-[11px] text-[#1E5E2E] border-[#C6E7D0] bg-[#EAF7EE]">
                  <Lock className="h-3 w-3" />
                  Verbatim Locked
                </Badge>
              )}
            </div>
            <div className="rounded-lg border border-border bg-surface p-4 text-xs font-mono leading-relaxed text-ink/90 max-h-60 overflow-y-auto">
              <p className="font-semibold text-ink mb-2">[{unit.source_doc.section}]</p>
              <p>{unit.source_doc.snippet || unit.latest_text}</p>
            </div>
          </div>

          {/* Governance note */}
          <div className="flex items-start gap-2 text-[11px] text-ink-muted bg-surface-alt p-3 rounded-md border border-border">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#1E5E2E] mt-0.5" />
            <p>
              This document is governed by Verity's source provenance engine. All extracted paragraphs are tied to cryptographic candidate checksums.
            </p>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(unit.source_doc.doc_id);
              toast.success(`Copied Document ID: ${unit.source_doc.doc_id}`);
            }}
            className="text-xs"
          >
            Copy Doc ID
          </Button>

          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className="bg-[#1E5E2E] hover:bg-[#174A24] text-xs text-white"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

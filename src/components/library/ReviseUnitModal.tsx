import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, GitBranch, FileEdit, CheckCircle2 } from "lucide-react";
import type { EnrichedKnowledgeUnit } from "@/lib/library";
import { useSession } from "@/lib/session";
import { revisePublishedUnit } from "@/services/verity";
import { toast } from "sonner";

interface ReviseUnitModalProps {
  unit: EnrichedKnowledgeUnit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ReviseUnitModal({
  unit,
  open,
  onOpenChange,
  onSuccess,
}: ReviseUnitModalProps) {
  const { person } = useSession();
  const [version, setVersion] = useState<number>(2);
  const [effectiveDate, setEffectiveDate] = useState<string>("2026-10-15");
  const [reviewDate, setReviewDate] = useState<string>("2027-10-06");
  const [changeNote, setChangeNote] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [text, setText] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (unit) {
      setVersion((unit.version || 1) + 1);
      setEffectiveDate(new Date().toISOString().slice(0, 10));
      setReviewDate("2027-10-06");
      setChangeNote(
        unit.status === "Stale" || unit.next_review_status === "Overdue"
          ? "Annual governance re-verification: validated policy terms and extended annual review cycle."
          : `Version ${(unit.version || 1) + 1} revision and policy update.`
      );
      setSummary(unit.summary || "");
      setText(unit.latest_text || unit.summary || "");
    }
  }, [unit]);

  if (!unit) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeNote.trim()) {
      toast.error("Please provide a version change note or justification.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await revisePublishedUnit(person.name, unit.unit_id, {
        version,
        effectiveDate,
        reviewDate,
        changeNote: changeNote.trim(),
        summary: summary.trim(),
        text: text.trim(),
      });

      if (res.ok) {
        toast.success(res.message);
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error("Failed to revise unit.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update unit version.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg text-xs">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF7EE] text-[#1E5E2E]">
                <FileEdit className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-ink">
                  Revise Knowledge Unit & Dates
                </DialogTitle>
                <DialogDescription className="text-xs text-ink-muted">
                  Knowledge Owner workflow: update version, adjust effective/review dates, and maintain audit integrity.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Unit Identification */}
          <div className="rounded-md border border-border bg-surface-alt p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono font-semibold text-xs text-ink">{unit.unit_id}</span>
              <span className="text-[11px] text-ink-muted">Currently: v{unit.version} · {unit.status}</span>
            </div>
            <p className="font-medium text-ink text-xs">{unit.title}</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Version */}
            <div>
              <label className="mb-1 flex items-center gap-1 font-semibold text-ink">
                <GitBranch className="h-3.5 w-3.5 text-ink-muted" /> New Version
              </label>
              <Input
                type="number"
                min={(unit.version || 1) + 1}
                value={version}
                onChange={(e) => setVersion(parseInt(e.target.value, 10) || (unit.version + 1))}
                className="h-8 text-xs font-mono font-semibold"
                required
              />
              <span className="text-[10px] text-ink-muted">v{unit.version} → v{version}</span>
            </div>

            {/* Effective Date */}
            <div>
              <label className="mb-1 flex items-center gap-1 font-semibold text-ink">
                <Calendar className="h-3.5 w-3.5 text-ink-muted" /> Effective Date
              </label>
              <Input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="h-8 text-xs font-mono"
                required
              />
              <span className="text-[10px] text-ink-muted">Policy live date</span>
            </div>

            {/* Next Review Date */}
            <div>
              <label className="mb-1 flex items-center gap-1 font-semibold text-ink">
                <Clock className="h-3.5 w-3.5 text-ink-muted" /> Next Review
              </label>
              <Input
                type="date"
                value={reviewDate}
                onChange={(e) => setReviewDate(e.target.value)}
                className="h-8 text-xs font-mono"
                required
              />
              <span className="text-[10px] text-emerald-700 font-medium">Valid until date</span>
            </div>
          </div>

          {/* Version Change Note */}
          <div>
            <label className="mb-1 block font-semibold text-ink">
              Change Note / Re-verification Reason <span className="text-destructive">*</span>
            </label>
            <Input
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              placeholder="e.g. Confirmed shipping terms still accurate; extended next review date."
              className="h-8 text-xs"
              required
            />
          </div>

          {/* Unit Summary */}
          <div>
            <label className="mb-1 block font-semibold text-ink">Summary</label>
            <Input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          {/* Approved Content Text */}
          <div>
            <label className="mb-1 block font-semibold text-ink">Approved Unit Text</label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              className="text-xs font-mono leading-relaxed"
            />
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !changeNote.trim()}
              className="bg-[#1E5E2E] text-white hover:bg-[#174A24]"
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              Save Revision & Update Dates
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

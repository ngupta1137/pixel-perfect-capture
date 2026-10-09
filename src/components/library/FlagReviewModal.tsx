import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Flag, AlertTriangle } from "lucide-react";
import type { EnrichedKnowledgeUnit } from "@/lib/library";
import { useSession } from "@/lib/session";
import { flagAnswer } from "@/services/verity";
import { toast } from "sonner";

interface FlagReviewModalProps {
  unit: EnrichedKnowledgeUnit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FlagReviewModal({ unit, open, onOpenChange }: FlagReviewModalProps) {
  const { person } = useSession();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!unit) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Please provide a reason for flagging this unit.");
      return;
    }
    setSubmitting(true);
    try {
      const res = flagAnswer(person.name, `manual-flag-${Date.now()}`, [unit.unit_id], reason.trim());
      toast.success(`Flagged ${unit.unit_id} for review. Assigned to ${res.owner}.`);
      setReason("");
      onOpenChange(false);
    } catch {
      toast.error("Failed to flag unit.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md text-xs">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#FDE8D7] text-[#C25E00]">
              <Flag className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-ink">
                Flag for Owner Review
              </DialogTitle>
              <DialogDescription className="text-xs text-ink-muted">
                {unit.title} ({unit.unit_id})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 py-2">
          <p className="text-xs text-ink/80">
            Submit an inquiry or flag discrepancy to <strong className="text-ink">{unit.owner}</strong>. This opens an item in the knowledge review queue.
          </p>

          <Textarea
            aria-label="Flag reason"
            placeholder="Describe the discrepancy, policy change, or missing detail..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="text-xs"
            required
          />

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !reason.trim()}
              className="bg-[#1E5E2E] hover:bg-[#174A24] text-xs text-white"
            >
              Submit Flag
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

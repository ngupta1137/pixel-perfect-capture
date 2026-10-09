import { useState } from "react";
import { Flag, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { flagAnswer } from "@/services/verity";

const REASONS = ["Wrong or outdated", "Missing information", "Hard to read aloud", "Other"];

export function FeedbackRow({ unitId }: { unitId: string | null }) {
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0] as string);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState<string | null>(null);

  const send = async () => {
    const r = await flagAnswer(unitId, note ? `${reason}: ${note}` : reason);
    setSent(r.owner);
    setOpen(false);
  };

  return (
    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
      <span className="text-sm text-ink-muted">Was this helpful?</span>
      <Button variant="outline" size="sm" aria-pressed={vote === "up"} aria-label="Helpful" onClick={() => setVote("up")}
        className={vote === "up" ? "border-brand-green-dark text-brand-green-dark" : ""}>
        <ThumbsUp />
      </Button>
      <Button variant="outline" size="sm" aria-pressed={vote === "down"} aria-label="Not helpful" onClick={() => setVote("down")}
        className={vote === "down" ? "border-outcome-unauthorized text-outcome-unauthorized" : ""}>
        <ThumbsDown />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={sent !== null}>
            <Flag /> Flag this answer
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag this answer</DialogTitle>
            <DialogDescription>The unit owner reviews every flag.</DialogDescription>
          </DialogHeader>
          <RadioGroup value={reason} onValueChange={setReason} aria-label="Reason">
            {REASONS.map((r) => (
              <div key={r} className="flex items-center gap-2">
                <RadioGroupItem value={r} id={`flag-${r}`} />
                <Label htmlFor={`flag-${r}`} className="text-base font-normal">{r}</Label>
              </div>
            ))}
          </RadioGroup>
          <Label htmlFor="flag-note" className="text-base">Details (optional)</Label>
          <Textarea id="flag-note" value={note} onChange={(e) => setNote(e.target.value)} className="text-base" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={send}>Send flag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {vote && !sent && <span role="status" className="text-sm text-ink-muted">Thanks for the feedback.</span>}
      {sent && <span role="status" className="text-sm font-semibold text-brand-green-dark">Sent to the unit owner ({sent})</span>}
    </div>
  );
}

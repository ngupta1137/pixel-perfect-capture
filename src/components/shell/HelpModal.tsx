import { useState } from "react";
import { CircleHelp, BookOpen, ShieldCheck, Compass, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { guide } from "@/lib/guide";

export function HelpModal() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs text-ink-muted transition-colors hover:bg-muted hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CircleHelp className="h-[18px] w-[18px] shrink-0 text-ink-muted" />
          <span>Help & Support</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Verity Help & Support</DialogTitle>
          <DialogDescription className="text-xs text-ink-muted">
            Governed enterprise knowledge platform for contact-center advocates and members.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-border bg-surface-alt p-4">
            <h4 className="flex items-center gap-2 text-xs font-semibold text-ink">
              <ShieldCheck className="h-4 w-4 text-primary" />
              One Approved Truth, in Every Channel
            </h4>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">
              Verity provides verifiable, plan-approved answers with full citation provenance, policy-governed access boundaries, and separation of duties.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-ink">Quick Resources</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              <Link
                to="/story"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-lg border border-border p-3 text-xs text-ink transition-colors hover:bg-muted"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span>Why Verity exists</span>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-ink-muted" />
              </Link>
              <Link
                to="/rights"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-lg border border-border p-3 text-xs text-ink transition-colors hover:bg-muted"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>Rights & Governance</span>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-ink-muted" />
              </Link>
            </div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-ink">Interactive Demo Guide</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  guide.toggle();
                }}
                className="rounded bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
              >
                Open Guide
              </button>
            </div>
            <p className="mt-1 text-[11px] text-ink-muted">
              Step-by-step walkthrough across all 14 personas and key governance scenarios.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

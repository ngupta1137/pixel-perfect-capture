import { BookOpen, Lightbulb, FileText, CheckCircle2, HelpCircle, ArrowUpRight } from "lucide-react";

export function IngestSidebarGuide() {
  return (
    <aside aria-label="Ingestion guide and resources" className="space-y-4 w-full lg:w-[320px] xl:w-[340px] shrink-0">
      {/* 1. Ingestion guide card */}
      <div className="rounded-xl border border-[#C6E7D0] bg-[#EAF7EE]/50 p-4 text-xs space-y-3.5">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF7EE] text-[#1E5E2E] border border-[#C6E7D0]">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-ink leading-tight">Ingestion guide</h2>
            <p className="mt-1 text-[11px] text-ink-muted leading-relaxed">
              Upload documents that contain official policy, procedure or guidance content.
            </p>
          </div>
        </div>

        <div className="space-y-3 border-t border-[#C6E7D0]/60 pt-3">
          <div className="flex items-start gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1E5E2E] text-[10px] font-bold text-white">
              1
            </span>
            <div>
              <p className="font-semibold text-ink">Upload or paste a document</p>
              <p className="text-[11px] text-ink-muted">PDF, DOCX, MD, or TXT. Max size 15 MB.</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1E5E2E] text-[10px] font-bold text-white">
              2
            </span>
            <div>
              <p className="font-semibold text-ink">Provide basic information</p>
              <p className="text-[11px] text-ink-muted">Add title, source type and line of business.</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1E5E2E] text-[10px] font-bold text-white">
              3
            </span>
            <div>
              <p className="font-semibold text-ink">Extract candidate units</p>
              <p className="text-[11px] text-ink-muted">Verity will extract key statements from the document.</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1E5E2E] text-[10px] font-bold text-white">
              4
            </span>
            <div>
              <p className="font-semibold text-ink">Review and submit</p>
              <p className="text-[11px] text-ink-muted">Review extracted units and submit for human review.</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Tips for good sources card */}
      <div className="rounded-xl border border-border bg-surface p-4 text-xs space-y-2.5 shadow-2xs">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-[#D97706]" />
          <h2 className="font-bold text-xs text-ink">Tips for good sources</h2>
        </div>
        <ul className="space-y-2 text-[11px] text-ink/85">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#1E5E2E] shrink-0 mt-0.5" />
            <span>Use the latest version of the document</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#1E5E2E] shrink-0 mt-0.5" />
            <span>Include the full policy or procedure</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#1E5E2E] shrink-0 mt-0.5" />
            <span>Add a clear title and description</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#1E5E2E] shrink-0 mt-0.5" />
            <span>Choose the correct source type</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#1E5E2E] shrink-0 mt-0.5" />
            <span>Verify the line of business and state</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#1E5E2E] shrink-0 mt-0.5" />
            <span>Remove unnecessary or unrelated content</span>
          </li>
        </ul>
      </div>

      {/* 3. Supported content card */}
      <div className="rounded-xl border border-border bg-surface p-4 text-xs space-y-2.5 shadow-2xs">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-ink-muted" />
          <h2 className="font-bold text-xs text-ink">Supported content</h2>
        </div>
        <ul className="space-y-1.5 text-[11px] text-ink-muted pl-1">
          <li className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-ink-muted" />
            <span>Policy and procedure documents</span>
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-ink-muted" />
            <span>Clinical guidelines</span>
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-ink-muted" />
            <span>Plan documents and benefit details</span>
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-ink-muted" />
            <span>Frequently asked questions (FAQ)</span>
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-ink-muted" />
            <span>Official program communications</span>
          </li>
        </ul>
      </div>

      {/* 4. Need help card */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-[#F9FAFB] p-3.5 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EAF7EE] text-[#1E5E2E]">
            <HelpCircle className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-ink">Need help?</p>
            <p className="text-[11px] text-ink-muted">Check the ingestion guide or contact your administrator.</p>
          </div>
        </div>
        <ArrowUpRight className="h-4 w-4 text-ink-muted shrink-0" />
      </div>
    </aside>
  );
}

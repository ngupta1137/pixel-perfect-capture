import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getUnit } from "@/services/verity";
import type { UnitRecord } from "@/services/contracts";
import { useSession } from "@/lib/session";
import { TrustBadge } from "./OutcomeCard";

export function UnitDrawer({ target, onClose }: { target: { unitId: string; version?: number | undefined } | null; onClose: () => void }) {
  const { person, can } = useSession();
  const [unit, setUnit] = useState<UnitRecord | null | "loading">(null);
  useEffect(() => {
    if (!target) return;
    setUnit("loading");
    void getUnit(target.unitId, target.version).then(setUnit);
  }, [target]);

  const inScope = unit && unit !== "loading" ? person.scope.includes(unit.kb) : false;
  return (
    <Sheet open={target !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{unit && unit !== "loading" ? unit.title : "Unit"}</SheetTitle>
          <SheetDescription>{target?.unitId}</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4 px-4 pb-6 text-base">
          {unit === "loading" && <p role="status" className="text-ink-muted">Loading unit...</p>}
          {unit === null && target && <p>This unit has no fixture record yet.</p>}
          {unit && unit !== "loading" && !inScope && (
            <p className="rounded border border-outcome-unauthorized p-3 text-outcome-unauthorized">
              {unit.kb} is outside your scope. This attempt is recorded in the audit log.
            </p>
          )}
          {unit && unit !== "loading" && inScope && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <TrustBadge trust={unit.trust} />
                <span className="rounded border border-border px-1.5 font-mono text-xs">{unit.kb}</span>
                {unit.verbatim && (
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-green-dark">
                    <Lock className="h-4 w-4" aria-hidden="true" /> Verbatim
                  </span>
                )}
              </div>
              <p className="rounded-md border border-border bg-surface-alt p-3 leading-relaxed">{unit.text}</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                <dt className="text-ink-muted">Version</dt><dd>v{unit.version}</dd>
                <dt className="text-ink-muted">Effective</dt><dd>{unit.effectiveDate}</dd>
                <dt className="text-ink-muted">Review by</dt><dd>{unit.reviewDate}</dd>
                <dt className="text-ink-muted">Plan year</dt><dd>{unit.planYear}</dd>
                {person.persona.sees_internal_owner && (<><dt className="text-ink-muted">Owner</dt><dd>{unit.owner}</dd></>)}
                {unit.mustReadBeforeBenefits && (<><dt className="text-ink-muted">Rule</dt><dd>Read before discussing benefits</dd></>)}
              </dl>
              {can("view_provenance") && (
                <section>
                  <h3 className="font-semibold">Provenance</h3>
                  <p className="text-ink-muted">Approved by {unit.approver}</p>
                  <ol className="mt-2 space-y-1">
                    {unit.history.map((h) => (
                      <li key={h.version} className="text-sm">v{h.version} · effective {h.effectiveDate} · {h.approver}</li>
                    ))}
                  </ol>
                </section>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

import { useEffect, useState } from "react";
import { browseUnits } from "@/services/verity";
import type { UnitRecord } from "@/services/contracts";

/** Knowledge bases and categories within the person's entitlement. Out-of-scope units never load. */
export function BrowsePanel({ scope, planYear, onOpen }: { scope: string[]; planYear: 2026 | 2027; onOpen: (u: UnitRecord) => void }) {
  const [units, setUnits] = useState<UnitRecord[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    setUnits(null);
    browseUnits(scope, planYear).then(setUnits, () => setError(true));
  }, [scope, planYear]);

  if (error) return <p role="alert" className="text-sm text-outcome-unauthorized">Could not load the knowledge list.</p>;
  if (!units) return <p role="status" className="text-sm text-ink-muted">Loading knowledge...</p>;
  if (units.length === 0) return <p className="text-sm text-ink-muted">No knowledge bases in your scope.</p>;

  const kbs = [...new Set(units.map((u) => u.kb))];
  return (
    <div className="space-y-3">
      {kbs.map((kb) => {
        const inKb = units.filter((u) => u.kb === kb);
        const cats = [...new Set(inKb.map((u) => u.category))];
        return (
          <details key={kb} open className="rounded-md border border-border">
            <summary className="cursor-pointer px-3 py-2 font-mono text-sm font-semibold">{kb}</summary>
            <div className="space-y-2 border-t border-border px-3 py-2">
              {cats.map((cat) => (
                <div key={cat}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{cat}</p>
                  <ul>
                    {inKb.filter((u) => u.category === cat).map((u) => (
                      <li key={u.unitId}>
                        <button type="button" onClick={() => onOpen(u)}
                          className="w-full rounded px-1 py-1 text-left text-sm hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          {u.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}

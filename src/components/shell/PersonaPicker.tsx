import { useNavigate } from "@tanstack/react-router";
import { useSession } from "@/lib/session";
import { GROUPS, PEOPLE, findPerson, homeRoute } from "@/lib/rights";

export function ScopeChips({ kbs }: { kbs: string[] }) {
  if (kbs.length === 0) return <span className="text-xs text-ink-muted">No knowledge bases</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {kbs.map((kb) => (
        <span key={kb} className="rounded border border-border bg-surface-alt px-1.5 py-0.5 font-mono text-[11px] text-ink">{kb}</span>
      ))}
    </span>
  );
}

export function PersonaPicker() {
  const { person, setPersona } = useSession();
  const navigate = useNavigate();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="persona" className="text-sm text-ink-muted">Signed in as</label>
      <select
        id="persona"
        className="field-select"
        value={person.id}
        onChange={(e) => {
          const next = findPerson(e.target.value);
          if (!next) return;
          setPersona(next.id);
          void navigate({ to: homeRoute(next) });
        }}
      >
        {GROUPS.map((g) => (
          <optgroup key={g} label={g}>
            {PEOPLE.filter((p) => p.group === g).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}, {p.label}{p.kbs.length ? ` · ${p.kbs.join(" ")}` : ""}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <ScopeChips kbs={person.kbs} />
    </div>
  );
}

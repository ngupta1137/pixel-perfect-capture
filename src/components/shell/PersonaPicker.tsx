import { useNavigate } from "@tanstack/react-router";
import { useSession } from "@/lib/session";
import { GROUPS, PEOPLE, findPerson, homeRoute } from "@/lib/rights";

export function ScopeChips({ kbs }: { kbs: string[] }) {
  if (kbs.length === 0) return <span className="text-xs text-ink-muted">No knowledge bases</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {kbs.map((kb) => (
        <span
          key={kb}
          className="rounded border border-border bg-surface-alt px-1.5 py-0.5 font-mono text-[11px] text-ink"
        >
          {kb}
        </span>
      ))}
    </span>
  );
}

export function PersonaPicker() {
  const { person, setPersona } = useSession();
  const navigate = useNavigate();
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md border border-border px-2 py-1">
      <span
        aria-hidden="true"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
      >
        {person.name.charAt(0)}
      </span>
      <label htmlFor="persona" className="sr-only">
        Signed in as
      </label>
      <select
        id="persona"
        className="h-8 w-[120px] min-w-0 bg-surface text-xs text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-[160px]"
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
                {p.name}, {p.label}
                {p.kbs.length ? ` · ${p.kbs.join(" ")}` : ""}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

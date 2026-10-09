import { Link } from "@tanstack/react-router";
import { useSession } from "@/lib/session";

export function ActingAsBar() {
  const { person } = useSession();
  const shown = person.capabilities.slice(0, 6);
  const more = person.capabilities.length - shown.length;
  return (
    <div className="border-b border-border bg-surface-alt">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-6 py-2 text-sm">
        <span>
          You are <strong>{person.name}</strong>, {person.label}. You can:
        </span>
        {shown.map((c) => (
          <span key={c} className="rounded-full border border-border bg-surface px-2 py-0.5 font-mono text-xs">{c}</span>
        ))}
        {more > 0 && <span className="text-xs text-ink-muted">+ {more} more</span>}
        <Link to="/rights" className="ml-auto text-xs font-semibold text-brand-green-dark underline">See all rights</Link>
      </div>
    </div>
  );
}

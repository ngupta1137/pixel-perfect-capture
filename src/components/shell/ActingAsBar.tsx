import { Link } from "@tanstack/react-router";
import { useSession } from "@/lib/session";

export function ActingAsBar() {
  const { person } = useSession();
  const shown = person.capabilities.slice(0, 6);
  const more = person.capabilities.length - shown.length;
  return (
    <div className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-2 px-4 py-2.5 text-xs lg:px-8">
        <span>
          You are <strong>{person.name}</strong>, {person.label}. You can:
        </span>
        {shown.map((c) => (
          <span key={c} className="rounded border border-border bg-surface px-2 py-0.5 font-mono text-[10px]">{c}</span>
        ))}
        {more > 0 && <span className="text-xs text-ink-muted">+ {more} more</span>}
        <Link to="/rights" className="ml-auto text-xs font-semibold text-brand-green-dark underline">See all rights</Link>
      </div>
    </div>
  );
}

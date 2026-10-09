import { ShieldAlert } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { recordDenied } from "@/services/verity";
import { useSession } from "@/lib/session";
import { canOpen, pageCaps, type PagePath } from "@/lib/rights";

export function Denied({ capabilities }: { capabilities: string[] }) {
  return (
    <section role="alert" className="mx-auto max-w-xl rounded-lg border border-destructive/40 bg-destructive/5 p-6">
      <div className="flex items-center gap-2 text-destructive">
        <ShieldAlert className="h-5 w-5" aria-hidden />
        <h1 className="text-xl font-semibold">Access denied</h1>
      </div>
      <p className="mt-3 text-sm">
        This page needs the capability{" "}
        {capabilities.map((c, i) => (
          <span key={c}>
            {i > 0 && " or "}
            <code className="rounded bg-surface-alt px-1 font-mono">{c}</code>
          </span>
        ))}
        , which your role does not hold.
      </p>
      <p className="mt-2 text-sm font-semibold">This attempt is recorded in the audit log.</p>
    </section>
  );
}

/** Route guard: renders the page only when the signed-in person may open it. */
export function RequirePage({ to, children }: { to: PagePath; children: ReactNode }) {
  const { person } = useSession();
  const denied = !canOpen(person, to);
  useEffect(() => {
    if (denied) recordDenied(person.name, to, pageCaps(to).join(" or "), "Role does not hold the capability for this page");
  }, [denied, person.name, to]);
  if (denied) return <Denied capabilities={pageCaps(to)} />;
  return <>{children}</>;
}

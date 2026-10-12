import { ShieldAlert, UserCheck, Lock, Info } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { recordDenied } from "@/services/verity";
import { useSession } from "@/lib/session";
import {
  canOpen,
  pageCaps,
  pageFor,
  PEOPLE,
  type Capability,
  type PagePath,
  type Person,
} from "@/lib/rights";
import { getAvatarUrl } from "@/lib/avatars";
import { Button } from "@/components/ui/button";

import { isDemoVisiblePerson } from "@/components/shell/PersonaPicker";

export function Denied({ capabilities, to }: { capabilities: string[]; to?: PagePath }) {
  const { person, setPersona } = useSession();
  const targetPage = to ? pageFor(to) : null;
  const pageLabel = targetPage?.label ?? "this workspace";

  // Find all authorized demo personas that can open this page (excluding hidden demo personas)
  const authorizedPeople: Person[] = (to
    ? PEOPLE.filter((p) => canOpen(p, to))
    : PEOPLE.filter((p) => capabilities.some((c) => p.capabilities.includes(c as Capability)))
  ).filter(isDemoVisiblePerson);

  // Deduplicate representative authorized personas by persona role
  const representativeAuthorized = authorizedPeople.reduce<Person[]>((acc, curr) => {
    if (!acc.some((item) => item.label === curr.label)) {
      acc.push(curr);
    }
    return acc;
  }, []);

  return (
    <section
      role="alert"
      aria-labelledby="role-access-title"
      className="mx-auto my-8 max-w-2xl rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8"
    >
      {/* Header */}
      <div className="flex items-start gap-4 border-b border-border pb-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-200">
          <ShieldAlert className="h-6 w-6" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 id="role-access-title" className="text-xl font-bold text-ink">
              Access denied
            </h1>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              Role Access Required
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            The <strong className="font-medium text-ink">{pageLabel}</strong> workspace is
            restricted by role-based governance policies.
          </p>
        </div>
      </div>

      {/* Current Role Explanation */}
      <div className="my-5 rounded-lg border border-amber-200/70 bg-amber-50/50 p-4 text-xs text-ink sm:text-sm">
        <div className="flex items-center gap-2 font-semibold text-amber-900">
          <Info className="h-4 w-4 shrink-0 text-amber-700" />
          <span>Why access is restricted for your active persona</span>
        </div>
        <p className="mt-1.5 leading-relaxed text-amber-950/80">
          You are currently acting as{" "}
          <strong className="font-semibold text-ink">{person.name}</strong> (
          <em>{person.label}</em>). This role does not hold the required capabilities (
          {capabilities.map((c, i) => (
            <span key={c}>
              {i > 0 && ", "}
              <code className="rounded bg-amber-100/80 px-1 py-0.5 font-mono text-xs font-semibold text-amber-900">
                {c}
              </code>
            </span>
          ))}
          ) for this screen.
        </p>
      </div>

      {/* Authorized Roles & Switcher */}
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">Authorized Demo Roles</h2>
          <p className="text-xs text-ink-muted">
            Select one of the authorized demo personas below to switch roles and access this screen
            without reloading:
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {representativeAuthorized.map((p) => {
            const avatar = getAvatarUrl(p.id);
            return (
              <div
                key={p.id}
                className="flex flex-col justify-between rounded-lg border border-border bg-surface-alt/40 p-3.5 transition-colors hover:border-[#1E5E2E]/40 hover:bg-[#EAF7EE]/30"
              >
                <div className="flex items-center gap-2.5">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={p.name}
                      className="h-8 w-8 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1E5E2E]/10 text-xs font-semibold text-[#1E5E2E]">
                      {p.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-ink">{p.name}</p>
                    <p className="truncate text-[11px] text-ink-muted">{p.label}</p>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => setPersona(p.id)}
                  className="mt-3 h-8 w-full bg-[#1E5E2E] text-xs font-medium text-white hover:bg-[#184d25]"
                >
                  <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                  Switch to {p.name.split(" ")[0]} ({p.label})
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Audit Notice */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-[11px] text-ink-muted">
        <span className="flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-ink-muted" />
          Role permissions are enforced on both frontend and backend APIs.
        </span>
        <span className="font-medium text-ink-muted">Attempt recorded in audit log</span>
      </div>
    </section>
  );
}

/** Route guard: renders the page only when the signed-in person may open it. */
export function RequirePage({ to, children }: { to: PagePath; children: ReactNode }) {
  const { person } = useSession();
  const denied = !canOpen(person, to);
  useEffect(() => {
    if (!denied) return;
    // Wait a moment: switching person briefly renders the old page before moving home.
    const t = setTimeout(
      () =>
        recordDenied(
          person.name,
          to,
          pageCaps(to).join(" or "),
          "Role does not hold the capability for this page",
        ),
      400,
    );
    return () => clearTimeout(t);
  }, [denied, person.name, to]);
  if (denied) return <Denied capabilities={pageCaps(to)} to={to} />;
  return <>{children}</>;
}

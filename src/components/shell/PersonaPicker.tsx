import { useNavigate } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GROUPS, PEOPLE, homeRoute, findPerson } from "@/lib/rights";
import { useSession } from "@/lib/session";

export function ScopeChips({ scope }: { scope: string[] }) {
  if (scope.length === 0)
    return <span className="rounded border border-border px-1.5 text-xs text-ink-muted">No knowledge bases</span>;
  return (
    <>
      {scope.map((kb) => (
        <span key={kb} className="rounded border border-border bg-surface-alt px-1.5 font-mono text-xs text-ink">
          {kb}
        </span>
      ))}
    </>
  );
}

export function PersonaPicker() {
  const { person, setPerson } = useSession();
  const navigate = useNavigate();
  const choose = (id: string) => {
    setPerson(id);
    void navigate({ to: homeRoute(findPerson(id)) });
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Signed in as ${person.name}, ${person.persona.label}. Change person`}
        className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span>
          <span className="block text-xs text-ink-muted">Signed in as</span>
          <span className="block text-base font-semibold leading-tight">
            {person.name} <span className="font-normal text-ink-muted">· {person.persona.label}</span>
          </span>
        </span>
        <span className="hidden gap-1 md:flex"><ScopeChips scope={person.scope} /></span>
        <ChevronDown className="h-4 w-4 text-ink-muted" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[75vh] w-[min(26rem,92vw)] overflow-y-auto">
        <DropdownMenuRadioGroup value={person.id} onValueChange={choose}>
          {GROUPS.map((group, i) => (
            <DropdownMenuGroup key={group}>
              {i > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel className="text-xs uppercase tracking-wide text-ink-muted">{group}</DropdownMenuLabel>
              {PEOPLE.filter((p) => p.persona.group === group).map((p) => (
                <DropdownMenuRadioItem key={p.id} value={p.id} className="flex-col items-start gap-1 py-2">
                  <span className="text-base">
                    <span className="font-semibold">{p.name}</span> · {p.persona.label}
                  </span>
                  <span className="flex flex-wrap gap-1"><ScopeChips scope={p.scope} /></span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuGroup>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

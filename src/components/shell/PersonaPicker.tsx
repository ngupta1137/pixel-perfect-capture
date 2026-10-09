import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronDown, Check } from "lucide-react";
import { useSession } from "@/lib/session";
import { GROUPS, PEOPLE, findPerson, homeRoute, type Person } from "@/lib/rights";
import { getAvatarUrl } from "@/lib/avatars";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ScopeChips({ kbs }: { kbs: string[] }) {
  if (kbs.length === 0) return <span className="text-xs text-ink-muted">No knowledge bases</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {kbs.map((kb) => (
        <span
          key={kb}
          className="rounded border border-border bg-surface-alt px-1.5 py-0.5 font-mono text-[10px] text-ink"
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
  const [open, setOpen] = useState(false);
  const avatarUrl = getAvatarUrl(person.id);

  const handleSelect = (selectedPerson: Person) => {
    setPersona(selectedPerson.id);
    setOpen(false);
    void navigate({ to: homeRoute(selectedPerson) });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Signed in as ${person.name}, ${person.label}`}
          className="flex min-w-0 items-center gap-2.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-left transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={person.name}
              className="h-7 w-7 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
            >
              {person.name.charAt(0)}
            </span>
          )}
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-xs font-semibold text-ink">{person.name}</span>
            <span className="truncate text-[10px] text-ink-muted">{person.label}</span>
          </div>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[85vh] overflow-y-auto p-1.5">
        <DropdownMenuLabel className="text-xs font-semibold text-ink-muted">
          Switch persona
        </DropdownMenuLabel>
        {GROUPS.map((g) => (
          <DropdownMenuGroup key={g}>
            <DropdownMenuSeparator />
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              {g}
            </div>
            {PEOPLE.filter((p) => p.group === g).map((p) => {
              const isSelected = p.id === person.id;
              const pAvatar = getAvatarUrl(p.id);
              return (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-2 text-xs transition-colors ${
                    isSelected ? "bg-primary/8 text-primary font-medium" : "hover:bg-muted"
                  }`}
                >
                  {pAvatar ? (
                    <img
                      src={pAvatar}
                      alt={p.name}
                      className="mt-0.5 h-6 w-6 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                      {p.name.charAt(0)}
                    </span>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-ink">{p.name}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                    </div>
                    <span className="text-[11px] text-ink-muted">{p.label}</span>
                    {p.kbs.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {p.kbs.map((kb) => (
                          <span
                            key={kb}
                            className="rounded bg-muted px-1 py-0.2 text-[9px] font-mono text-ink-muted"
                          >
                            {kb}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

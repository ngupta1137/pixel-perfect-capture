import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, ShieldCheck, RotateCcw, BookOpen, User, ExternalLink, LogOut } from "lucide-react";
import { useSession } from "@/lib/session";
import { resetDemoStore } from "@/services/demoStore";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
  const { person, signOut } = useSession();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const handleReset = async () => {
    setBusy(true);
    try {
      resetDemoStore();
      toast.success("Demo state reset to original seed data");
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`User menu for ${person.name}`}
          className="flex items-center gap-1.5 rounded-lg p-1 transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2E7D32] text-xs font-semibold text-white shadow-sm"
          >
            {person.name.charAt(0)}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-ink-muted" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-lg">
        <DropdownMenuLabel className="p-2">
          <p className="text-xs font-semibold text-ink">{person.name}</p>
          <p className="text-[11px] font-normal text-ink-muted">{person.label}</p>
          <p className="mt-1 font-mono text-[9px] text-ink-muted">Group: {person.group}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/rights" className="flex items-center gap-2 text-xs">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span>View Rights & Scope</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/story" className="flex items-center gap-2 text-xs">
            <BookOpen className="h-3.5 w-3.5 text-ink-muted" />
            <span>Why Verity exists</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/welcome" className="flex items-center gap-2 text-xs">
            <ExternalLink className="h-3.5 w-3.5 text-ink-muted" />
            <span>Verity Overview</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            signOut();
            setOpen(false);
            void navigate({ to: "/welcome" });
          }}
          className="flex cursor-pointer items-center gap-2 text-xs text-ink"
        >
          <LogOut className="h-3.5 w-3.5 text-ink-muted" />
          <span>Sign out</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleReset}
          disabled={busy}
          className="flex cursor-pointer items-center gap-2 text-xs text-destructive focus:text-destructive"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>{busy ? "Resetting demo..." : "Reset demo state"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

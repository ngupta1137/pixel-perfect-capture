import { useState } from "react";
import { Headphones, ChevronDown, Check } from "lucide-react";
import { useSession } from "@/lib/session";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ChannelPicker() {
  const { channel, setChannel, allowedChannels } = useSession();
  const [open, setOpen] = useState(false);

  const activeChannel = allowedChannels.find((c) => c.id === channel) ?? allowedChannels[0];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Current channel: ${activeChannel?.label ?? "Channel"}`}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Headphones className="h-4 w-4 shrink-0 text-ink-muted" />
          <span className="truncate">{activeChannel?.label ?? "Channel"}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 p-1">
        <DropdownMenuLabel className="text-xs font-semibold text-ink-muted">
          Select Channel
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {allowedChannels.map((c) => {
          const isSelected = c.id === channel;
          return (
            <DropdownMenuItem
              key={c.id}
              onClick={() => {
                setChannel(c.id);
                setOpen(false);
              }}
              className={`flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-xs transition-colors ${
                isSelected ? "bg-primary/8 text-primary font-medium" : "hover:bg-muted"
              }`}
            >
              <span>{c.label}</span>
              {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

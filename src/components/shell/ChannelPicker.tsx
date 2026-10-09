import { useState } from "react";
import { Headphones, MessageSquare, Mic, ChevronDown, Check } from "lucide-react";
import { useSession } from "@/lib/session";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CHANNEL_ICONS: Record<string, typeof Headphones> = {
  advocate_view: Headphones,
  member_chat: MessageSquare,
  voice: Mic,
};

export function ChannelPicker() {
  const { channel, setChannel, allowedChannels } = useSession();
  const [open, setOpen] = useState(false);

  const activeChannel = allowedChannels.find((c) => c.id === channel) ?? allowedChannels[0];
  const ActiveIcon = (activeChannel && CHANNEL_ICONS[activeChannel.id]) || Headphones;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Current channel: ${activeChannel?.label ?? "Channel"}`}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ActiveIcon className="h-4 w-4 shrink-0 text-ink-muted" />
          <span className="truncate">{activeChannel?.label ?? "Channel"}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-1.5">
        <DropdownMenuLabel className="px-2 py-1 text-xs font-semibold text-ink-muted">
          Active Channel
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {allowedChannels.map((c) => {
          const isSelected = c.id === channel;
          const Icon = CHANNEL_ICONS[c.id] || Headphones;
          return (
            <DropdownMenuItem
              key={c.id}
              onClick={() => {
                setChannel(c.id);
                setOpen(false);
              }}
              className={`flex cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-2 text-xs transition-colors ${
                isSelected ? "bg-[#EAF7EE] text-[#1E5E2E] font-medium" : "hover:bg-muted"
              }`}
            >
              <Icon
                className={`mt-0.5 h-4 w-4 shrink-0 ${
                  isSelected ? "text-[#1E5E2E]" : "text-ink-muted"
                }`}
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-xs ${isSelected ? "font-semibold text-[#1E5E2E]" : "font-medium text-ink"}`}>
                    {c.label}
                  </span>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-[#1E5E2E]" />}
                </div>
                {c.description && (
                  <span className="mt-0.5 text-[11px] leading-tight text-ink-muted">
                    {c.description}
                  </span>
                )}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

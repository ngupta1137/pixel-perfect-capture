import { useState } from "react";
import { Bell, CheckCircle2, AlertCircle, Clock, ShieldCheck, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDemoStore } from "@/services/demoStore";

export function NotificationPopover() {
  const [open, setOpen] = useState(false);
  const audit = useDemoStore((s) => s.audit);
  const reviewTasks = useDemoStore((s) => s.reviewTasks);

  const notifications = [
    {
      id: "n-1",
      title: "Review queue update",
      desc: "3 items awaiting review in Pharmacy Ops",
      time: "10 mins ago",
      icon: AlertCircle,
      iconColor: "text-amber-600 bg-amber-50",
      to: "/review",
    },
    {
      id: "n-2",
      title: "Knowledge gaps logged",
      desc: "5 unanswered queries clustered for authoring",
      time: "25 mins ago",
      icon: Clock,
      iconColor: "text-red-600 bg-red-50",
      to: "/work",
    },
    {
      id: "n-3",
      title: "AEP 2027 Readiness",
      desc: "38 of 51 units approved for plan year 2027",
      time: "1 hour ago",
      icon: ShieldCheck,
      iconColor: "text-emerald-600 bg-emerald-50",
      to: "/review",
    },
    ...(audit.slice(0, 2).map((a, i) => ({
      id: `n-audit-${i}`,
      title: `Audit: ${a.action}`,
      desc: `${a.actor}: ${a.detail || a.target}`,
      time: "Today",
      icon: CheckCircle2,
      iconColor: "text-primary bg-primary/10",
      to: "/audit",
    }))),
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Notifications (3 unread)"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-ink transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Bell className="h-4 w-4 text-ink" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-surface" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-xs font-semibold text-ink">Notifications</h3>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            {reviewTasks.length || 3} new
          </span>
        </div>
        <div className="max-h-80 divide-y divide-border overflow-y-auto">
          {notifications.map((n) => (
            <Link
              key={n.id}
              to={n.to}
              onClick={() => setOpen(false)}
              className="flex items-start gap-3 p-3 text-left transition-colors hover:bg-muted"
            >
              <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${n.iconColor}`}>
                <n.icon className="h-3.5 w-3.5" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-ink">{n.title}</span>
                  <span className="text-[10px] text-ink-muted">{n.time}</span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-[11px] text-ink-muted">{n.desc}</p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 self-center text-ink-muted" />
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

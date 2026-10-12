import { createFileRoute } from "@tanstack/react-router";
import { useDemoStore } from "@/services/demoStore";

export const Route = createFileRoute("/platform")({
  head: () => ({
    meta: [
      { title: "Platform — Verity" },
      { name: "description", content: "Who consumes Verity, the 13-step runtime, and what is built versus on the roadmap." },
      { property: "og:title", content: "Platform — Verity" },
      { property: "og:description", content: "Who consumes Verity, the 13-step runtime, and what is built versus on the roadmap." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlatformPage,
});

const SPOKES = [
  { label: "Agent Assist", phase: 1, w: 10 },
  { label: "Prior Authorization", phase: 2, w: 5 },
  { label: "Payment Integrity", phase: 2, w: 5 },
  { label: "HEDIS", phase: 3, w: 2.5 },
  { label: "Risk Adjustment", phase: 3, w: 2.5 },
  { label: "Clinical interventions", phase: 3, w: 2.5 },
];

const STEPS: { n: number; label: string; p?: boolean }[] = [
  { n: 1, label: "Receive request" }, { n: 2, label: "Bind role from connection" }, { n: 3, label: "Redact PHI" },
  { n: 4, label: "Understand question", p: true }, { n: 5, label: "Split parts", p: true }, { n: 6, label: "Retrieve candidates" },
  { n: 7, label: "Entitlement filter" }, { n: 8, label: "Applicability and dates" }, { n: 9, label: "Conflict, stale, safety rules" },
  { n: 10, label: "Compose answer", p: true }, { n: 11, label: "Verbatim and citation check" }, { n: 12, label: "Channel render" },
  { n: 13, label: "Log and audit" },
];

const BUILT = ["Engine", "REST", "MCP", "Personas", "Drift", "Evals"];
const ROADMAP = ["Write-once audit storage", "Multi-region availability", "Edge PHI tokenization", "Token exchange for agent feedback", "Separate admin listener", "Emergency publication exception"];

function ConsumerMap() {
  const cx = 400, cy = 210, r = 160;
  return (
    <svg viewBox="0 0 800 420" className="w-full" role="img" aria-label="Consumer map: Verity at the center with products by phase">
      {SPOKES.map((s, i) => {
        const a = (i / SPOKES.length) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(a) * r * 1.3, y = cy + Math.sin(a) * r;
        return (
          <g key={s.label}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="var(--color-brand-green)" strokeWidth={s.w} strokeLinecap="round" />
            <rect x={x - 85} y={y - 24} width={170} height={48} rx={8} fill="var(--color-background)" stroke="var(--color-border)" />
            <text x={x} y={y - 4} textAnchor="middle" fontSize="13" fontWeight={600} fill="var(--color-foreground)">{s.label}</text>
            <text x={x} y={y + 14} textAnchor="middle" fontSize="11" fill="var(--color-muted-foreground)">Phase {s.phase}</text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={52} fill="var(--color-brand-green-dark)" />
      <text x={cx} y={cy + 6} textAnchor="middle" fontSize="20" fontWeight={700} fill="var(--color-primary-foreground)">Verity</text>
    </svg>
  );
}

function Runtime() {
  const w = 58, gap = 4;
  return (
    <svg viewBox={`0 0 ${13 * (w + gap)} 130`} className="w-full" role="img" aria-label="The 13-step runtime">
      <rect x={6 * (w + gap) - 2} y={0} width={3 * (w + gap) + 2} height={128} rx={6} fill="var(--color-accent)" />
      <text x={7.5 * (w + gap) - gap / 2} y={120} textAnchor="middle" fontSize="9" fontWeight={600} fill="var(--color-foreground)">deterministic, before any generation</text>
      {STEPS.map((s, i) => {
        const x = i * (w + gap);
        return (
          <g key={s.n}>
            <rect x={x} y={20} width={w} height={78} rx={6} fill="var(--color-background)" stroke="var(--color-border)" />
            <text x={x + w / 2} y={38} textAnchor="middle" fontSize="12" fontWeight={700} fill="var(--color-brand-green-dark)">{s.n}</text>
            <foreignObject x={x + 2} y={42} width={w - 4} height={40}>
              <div style={{ fontSize: 8, lineHeight: 1.15, textAlign: "center" }}>{s.label}</div>
            </foreignObject>
            <text x={x + w / 2} y={93} textAnchor="middle" fontSize="9" fontWeight={700} fill={s.p ? "var(--color-outcome-conflict)" : "var(--color-muted-foreground)"}>{s.p ? "[P]" : "[D]"}</text>
          </g>
        );
      })}
    </svg>
  );
}

function BuiltRoadmap() {
  const box = (label: string, i: number, row: number, built: boolean) => (
    <g key={label}>
      <rect x={10 + (i % 3) * 260} y={40 + row * 52} width={245} height={40} rx={6}
        fill={built ? "var(--color-brand-green-dark)" : "var(--color-muted)"}
        stroke={built ? "none" : "var(--color-muted-foreground)"} strokeDasharray={built ? undefined : "6 4"} />
      <text x={10 + (i % 3) * 260 + 122} y={65 + row * 52} textAnchor="middle" fontSize="13" fontWeight={600}
        fill={built ? "var(--color-primary-foreground)" : "var(--color-muted-foreground)"}>{label}</text>
    </g>
  );
  return (
    <svg viewBox="0 0 800 300" className="w-full" role="img" aria-label="Built versus roadmap">
      <text x={10} y={25} fontSize="14" fontWeight={700} fill="var(--color-foreground)">Built</text>
      {BUILT.map((b, i) => box(b, i, Math.floor(i / 3), true))}
      <text x={10} y={165} fontSize="14" fontWeight={700} fill="var(--color-foreground)">Roadmap</text>
      {ROADMAP.map((b, i) => box(b, i, 2.7 + Math.floor(i / 3), false))}
    </svg>
  );
}

function SubscriberChangePanel() {
  const publishSignals = useDemoStore((s) => s.publishSignals) || [];

  const displaySignals = publishSignals.length > 0 ? publishSignals : [
    {
      unit_id: "U-PH-003",
      version: 1,
      from_version: 0,
      title: "Pricing disclaimer (Rx)",
      at: "2026-01-15T09:00:00Z",
      by: "Rita (Legal)",
      channels: ["Agent Assist", "Member Chat", "IVR Voice Bot", "Advocate Portal"],
    },
  ];

  return (
    <div className="rounded-lg border border-border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-base">4. Change Propagation & Channel Subscribers</h2>
          <p className="text-xs text-ink-muted">
            When Legal or Knowledge Owners publish a unit, cache invalidation signals notify all subscriber channels in real-time.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#EAF7EE] border border-[#C6E7D0] text-[#1E5E2E] text-xs font-semibold">
          Active Invalidation Stream
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        {["Agent Assist", "Member Chat", "IVR Voice Bot", "Advocate Portal"].map((ch) => (
          <div key={ch} className="rounded-md border border-border bg-surface-alt p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink">{ch}</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[11px] text-ink-muted">Direct subscriber • Response cache auto-invalidated</p>
          </div>
        ))}
      </div>

      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-surface-alt text-ink-muted font-medium border-b border-border">
            <tr>
              <th className="p-2.5">Time</th>
              <th className="p-2.5">Unit & Version</th>
              <th className="p-2.5">Title</th>
              <th className="p-2.5">Publisher</th>
              <th className="p-2.5">Notified Subscribers</th>
              <th className="p-2.5">Cache Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-mono text-[11px]">
            {displaySignals.map((sig, idx) => (
              <tr key={idx} className="hover:bg-surface-alt/50">
                <td className="p-2.5 text-ink-muted">{new Date(sig.at).toLocaleTimeString()}</td>
                <td className="p-2.5 font-bold text-ink">
                  {sig.unit_id} (v{sig.from_version ?? 0} → v{sig.version})
                </td>
                <td className="p-2.5 font-sans font-medium text-ink">{sig.title}</td>
                <td className="p-2.5 font-sans text-ink-muted">{sig.by}</td>
                <td className="p-2.5 font-sans text-emerald-800">
                  {sig.channels.join(", ")}
                </td>
                <td className="p-2.5 text-emerald-700 font-semibold">Invalidated & refreshed</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlatformPage() {
  return (
    <section className="space-y-8">
      <h1 className="text-2xl font-semibold">Platform</h1>
      <div className="rounded-lg border border-border p-4">
        <h2 className="mb-2 font-semibold">1. Who consumes Verity</h2>
        <ConsumerMap />
        <p className="mt-2 text-center text-sm font-semibold">Verity decides what is true and applicable. Each product decides what to do with it.</p>
      </div>
      <div className="rounded-lg border border-border p-4">
        <h2 className="mb-2 font-semibold">2. The 13-step runtime</h2>
        <Runtime />
        <p className="mt-2 text-xs text-ink-muted">[D] deterministic · [P] model step</p>
      </div>
      <div className="rounded-lg border border-border p-4">
        <h2 className="mb-2 font-semibold">3. Built vs Roadmap</h2>
        <BuiltRoadmap />
      </div>
      <SubscriberChangePanel />
    </section>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RequirePage } from "@/components/shell/Denied";
import { useSession } from "@/lib/session";
import { PEOPLE, personaDef, type Capability } from "@/lib/rights";
import { useDemoStore } from "@/services/demoStore";
import { changeKbAccess } from "@/services/verity";

export const Route = createFileRoute("/access")({
  head: () => ({
    meta: [
      { title: "Access — Verity" },
      { name: "description", content: "Which role may read which knowledge base, changed with a named person and a reason." },
      { property: "og:title", content: "Access — Verity" },
      { property: "og:description", content: "Which role may read which knowledge base, changed with a named person and a reason." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequirePage to="/access">
      <AccessPage />
    </RequirePage>
  ),
});

const KBS = [...new Set(PEOPLE.flatMap((p) => p.kbs))].sort();

function AccessPage() {
  const { person, can } = useSession();
  const access = useDemoStore((s) => s.access);
  const [pending, setPending] = useState<{ role: string; kb: string; grant: boolean } | null>(null);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");
  const editable = can("manage_access");
  const roleLabel = (r: string) => {
    try { return personaDef(r).label; } catch { return r; }
  };
  const confirm = () => {
    if (!pending) return;
    const r = changeKbAccess(person, pending.role, pending.kb, pending.grant, reason);
    setMsg(r.message);
    if (r.ok) { setPending(null); setReason(""); }
  };
  const holders = (c: Capability) => PEOPLE.filter((p) => p.capabilities.includes(c));
  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Access</h1>
        <p className="mt-1 text-sm text-ink-muted">Which role may read which knowledge base. Every change needs a reason and is recorded in the audit log. Unit text is never shown here.</p>
      </div>
      <p role="note" className="flex items-center gap-2 rounded-md border-2 border-destructive bg-destructive/5 p-3 text-sm font-semibold text-destructive">
        <ShieldAlert className="h-4 w-4" aria-hidden /> The last access administrator and the last Legal approver cannot be removed
      </p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-left"><tr><th className="px-3 py-2">Role</th>{KBS.map((k) => <th key={k} className="px-3 py-2 font-mono text-xs">{k}</th>)}</tr></thead>
          <tbody>
            {Object.entries(access).map(([role, kbs]) => (
              <tr key={role} className="border-t border-border">
                <td className="px-3 py-2"><p className="font-semibold">{roleLabel(role)}</p><p className="font-mono text-xs text-ink-muted">{role}</p></td>
                {KBS.map((kb) => {
                  const on = kbs.includes(kb);
                  return (
                    <td key={kb} className="px-3 py-2">
                      <Switch checked={on} disabled={!editable} aria-label={`${role} reads ${kb}`} onCheckedChange={(v) => { setMsg(""); setPending({ role, kb, grant: v }); }} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!editable && <p className="text-xs text-ink-muted">View only: changing access needs <code className="font-mono">manage_access</code>.</p>}
      {msg && <p role="status" className="text-sm font-semibold">{msg}</p>}

      <div>
        <h2 className="text-lg font-semibold">Protected role holders</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(["manage_access", "approve_legal"] as Capability[]).map((c) => {
            const h = holders(c);
            return h.map((p) => (
              <li key={`${c}-${p.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3">
                <span><b>{p.name}</b> · {p.label} · holds <code className="font-mono">{c}</code></span>
                <span className="flex flex-col items-end gap-1">
                  <Button size="sm" variant="outline" disabled>Remove</Button>
                  <span className="text-xs text-ink-muted">{h.length <= 1 ? `Last holder of ${c}: cannot be removed` : "Removal is not part of this prototype"}</span>
                </span>
              </li>
            ));
          })}
        </ul>
      </div>

      <Dialog open={!!pending} onOpenChange={(o) => { if (!o) { setPending(null); setReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pending?.grant ? "Grant" : "Revoke"} {pending?.kb} for {pending ? roleLabel(pending.role) : ""}</DialogTitle>
            <DialogDescription>A reason is required. The change is recorded with your name in the audit log.</DialogDescription>
          </DialogHeader>
          <Textarea aria-label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)" rows={3} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setPending(null); setReason(""); }}>Cancel</Button>
            <Button disabled={!reason.trim()} onClick={confirm}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PagePlaceholder } from "@/components/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ask — Verity" },
      { name: "description", content: "Verity: one approved truth, in every channel. Governed knowledge search for advocates." },
      { property: "og:title", content: "Ask — Verity" },
      { property: "og:description", content: "One approved truth, in every channel." },
    ],
  }),
  component: AskPage,
});

function AskPage() {
  const [lob, setLob] = useState("MAPD");
  const [state, setState] = useState("");
  return (
    <PagePlaceholder title="Ask">
      <p className="text-ink-muted">One approved truth, in every channel.</p>
      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2 text-ink-muted">
          Line of business
          <select className="field-select" value={lob} onChange={(e) => setLob(e.target.value)}>
            <option value="MAPD">MAPD</option>
            <option value="PDP">PDP</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-ink-muted">
          State
          <select className="field-select" value={state} onChange={(e) => setState(e.target.value)}>
            <option value="">Unknown</option>
            <option value="KY">KY</option>
            <option value="FL">FL</option>
            <option value="OH">OH</option>
          </select>
        </label>
      </div>
    </PagePlaceholder>
  );
}

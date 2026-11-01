import { FlaskConical } from "lucide-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel, Btn, inputCls } from "@/components/ui-kit";
import { useSim } from "@/lib/sim/store";
import { WORKLOADS, generate, type WorkloadKind } from "@/lib/sim/workload";

export const Route = createFileRoute("/workload-lab")({
  head: () => ({
    meta: [
      { title: "Workload Lab — Page Replacement Simulator" },
      { name: "description", content: "Generate sequential, looping, mixed, random and locality-heavy reference strings." },
      { property: "og:title", content: "Workload Lab — Page Replacement Simulator" },
      { property: "og:description", content: "Generate sequential, looping, mixed, random and locality-heavy reference strings." },
    ],
  }),
  component: Lab,
});

function Lab() {
  const s = useSim();
  const nav = useNavigate();
  const [length, setLength] = useState(30);
  const [range, setRange] = useState(8);
  const [out, setOut] = useState<{ kind: WorkloadKind; refs: number[] } | null>(null);

  const send = () => {
    if (!out) return;
    s.setRefText(out.refs.join(" "));
    s.setWorkloadName(out.kind);
    nav({ to: "/simulator" });
  };

  return (
    <>
      <PageHeader eyebrow="Generators" icon={FlaskConical} title="Workload Lab" description="Generate reference strings with different access patterns and send them to the simulator." />
      <Panel title="Controls" className="mb-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-medium">Length<input type="number" min={1} max={5000} className={`${inputCls} mt-1 font-mono`} value={length} onChange={(e) => setLength(Math.max(1, Math.min(5000, Number(e.target.value) || 1)))} /></label>
          <label className="text-sm font-medium">Page range (0 to n−1)<input type="number" min={1} max={100} className={`${inputCls} mt-1 font-mono`} value={range} onChange={(e) => setRange(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} /></label>
          <label className="text-sm font-medium">Frames<input type="number" min={1} max={20} className={`${inputCls} mt-1 font-mono`} value={s.frames} onChange={(e) => s.setFrames(Number(e.target.value))} /></label>
        </div>
      </Panel>
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {WORKLOADS.map((w) => (
          <div key={w.kind} className="clay-card flex flex-col p-5">
            <div className="text-lg font-semibold">{w.kind === "Locality" ? "Locality-heavy" : w.kind}</div>
            <p className="mb-3 text-sm text-muted-foreground">{w.description}</p>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {w.traits.map((t) => <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{t}</span>)}
            </div>
            <Btn className="mt-auto" onClick={() => setOut({ kind: w.kind, refs: generate(w.kind, length, range) })}>Generate</Btn>
          </div>
        ))}
      </div>
      {out && (
        <Panel title={`Generated: ${out.kind}`}>
          <p className="mb-4 max-h-40 overflow-auto break-words rounded-lg bg-muted p-3 font-mono text-sm">{out.refs.join(" ")}</p>
          <Btn variant="primary" onClick={send}>Send to Simulator</Btn>
        </Panel>
      )}
    </>
  );
}

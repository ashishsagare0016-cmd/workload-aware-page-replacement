import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2, Beaker } from "lucide-react";
import { PageHeader, Panel, Btn, pct, inputCls } from "@/components/ui-kit";
import { GroupedBar } from "@/components/Charts";
import { useSim } from "@/lib/sim/store";
import { POLICIES, POLICY_LABEL } from "@/lib/sim/algorithms";
import { simulate, generate, WORKLOADS, type WorkloadKind } from "@/lib/sim/workload";
import { parseRefs, validateFrames } from "@/lib/sim/validation";

export const Route = createFileRoute("/experiments")({
  head: () => ({
    meta: [
      { title: "Experiments — Page Replacement Simulator" },
      { name: "description", content: "Run every policy across multiple workloads and compare results side by side." },
      { property: "og:title", content: "Experiments — Page Replacement Simulator" },
      { property: "og:description", content: "Run every policy across multiple workloads and compare results side by side." },
    ],
  }),
  component: Experiments,
});

function Experiments() {
  const s = useSim();
  const [kind, setKind] = useState<WorkloadKind | "Manual">("Random");
  const [manual, setManual] = useState("");
  const [len, setLen] = useState(40);
  const [frames, setFrames] = useState(3);
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    const fe = validateFrames(frames);
    if (fe) return setError(fe);
    let refs: number[];
    if (kind === "Manual") {
      const p = parseRefs(manual);
      if (!p.ok) return setError(p.error);
      refs = p.refs;
    } else refs = generate(kind, Math.max(1, len), 10);
    setError(null);
    s.setExperiments((e) => [...e, { id: crypto.randomUUID(), name: `${kind} #${e.length + 1}`, refs, frames }]);
  };

  const runAll = () =>
    s.setExperiments((e) => e.map((x) => ({ ...x, results: POLICIES.map((p) => { const r = simulate(p, x.refs, x.frames); return { policy: p, faults: r.faults, hitRatio: r.hitRatio, timeMs: r.timeMs }; }) })));

  const done = s.experiments.filter((e) => e.results);
  const chart = done.map((e) => ({ name: e.name, ...Object.fromEntries(e.results!.map((r) => [POLICY_LABEL[r.policy], r.faults])) }));

  return (
    <>
      <PageHeader eyebrow="Batch runs" icon={Beaker} title="Experiments" description="Queue several workloads, run all four policies on each and compare.">
        <div className="flex gap-2">
          <Btn variant="primary" disabled={!s.experiments.length} onClick={runAll}>Run all</Btn>
          <Btn disabled={!s.experiments.length} onClick={() => s.setExperiments([])}>Clear history</Btn>
        </div>
      </PageHeader>
      <Panel title="Add workload" className="mb-6">
        <div className="grid gap-4 md:grid-cols-4">
          <label className="text-sm font-medium">Type
            <select className={`${inputCls} mt-1`} value={kind} onChange={(e) => setKind(e.target.value as WorkloadKind)}>
              {WORKLOADS.map((w) => <option key={w.kind} value={w.kind}>{w.kind}</option>)}
              <option value="Manual">Manual</option>
            </select>
          </label>
          {kind === "Manual" ? (
            <label className="text-sm font-medium md:col-span-2">Reference string<input className={`${inputCls} mt-1 font-mono`} value={manual} onChange={(e) => setManual(e.target.value)} placeholder="1 2 3 1 4" /></label>
          ) : (
            <label className="text-sm font-medium md:col-span-2">Length<input type="number" min={1} className={`${inputCls} mt-1 font-mono`} value={len} onChange={(e) => setLen(Number(e.target.value))} /></label>
          )}
          <label className="text-sm font-medium">Frames<input type="number" min={1} max={20} className={`${inputCls} mt-1 font-mono`} value={frames} onChange={(e) => setFrames(Number(e.target.value))} /></label>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
        <Btn className="mt-4" onClick={add}>Add to experiment</Btn>
      </Panel>
      {s.experiments.length === 0 ? (
        <Panel><p className="text-muted-foreground">No workloads queued yet.</p></Panel>
      ) : (
        <>
          {done.length > 0 && <Panel title="Page faults by workload" className="mb-6"><GroupedBar data={chart} keys={POLICIES.map((p) => POLICY_LABEL[p])} /></Panel>}
          <Panel title="Results">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="p-2">Workload</th><th className="p-2">Refs</th><th className="p-2">Frames</th>{POLICIES.map((p) => <th key={p} className="p-2">{POLICY_LABEL[p]}</th>)}<th /></tr></thead>
                <tbody>
                  {s.experiments.map((e) => (
                    <tr key={e.id} className="border-t border-border">
                      <td className="p-2 font-medium">{e.name}</td><td className="p-2 font-mono">{e.refs.length}</td><td className="p-2 font-mono">{e.frames}</td>
                      {POLICIES.map((p) => { const r = e.results?.find((x) => x.policy === p); return <td key={p} className="p-2 font-mono">{r ? `${r.faults} · ${pct(r.hitRatio)}` : "—"}</td>; })}
                      <td className="p-2"><button aria-label={`Delete ${e.name}`} onClick={() => s.setExperiments((x) => x.filter((y) => y.id !== e.id))} className="rounded p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </>
  );
}

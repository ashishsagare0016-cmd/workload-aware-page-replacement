import { ScanSearch } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Stat, pct } from "@/components/ui-kit";
import { SimpleBar } from "@/components/Charts";
import { useSim } from "@/lib/sim/store";
import { analyze, classify } from "@/lib/sim/workload";
import { parseRefs } from "@/lib/sim/validation";

export const Route = createFileRoute("/analysis")({
  head: () => ({
    meta: [
      { title: "Workload Analysis — Page Replacement Simulator" },
      { name: "description", content: "Measure locality, repetition and sequentiality of a reference string and get a recommended policy." },
      { property: "og:title", content: "Workload Analysis — Page Replacement Simulator" },
      { property: "og:description", content: "Measure locality, repetition and sequentiality of a reference string and get a recommended policy." },
    ],
  }),
  component: Analysis,
});

function Analysis() {
  const s = useSim();
  if (!s.ready) return null;
  const p = parseRefs(s.refText);
  if (!p.ok)
    return (
      <>
        <PageHeader eyebrow="Insights" icon={ScanSearch} title="Workload Analysis" description="Features extracted from the current reference string." />
        <Panel><p className="text-muted-foreground">{p.error}</p></Panel>
      </>
    );
  const f = analyze(p.refs, s.frames);
  const c = classify(f);
  return (
    <>
      <PageHeader eyebrow="Insights" icon={ScanSearch} title="Workload Analysis" description={`Analysing ${f.length} references (${s.workloadName}).`} />
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Repetition" value={pct(f.repetition)} />
        <Stat label="Locality" value={pct(f.locality)} hint={`Reuse within ${Math.max(2, s.frames * 2)} steps`} />
        <Stat label="Sequentiality" value={pct(f.sequentiality)} />
        <Stat label="Unique ratio" value={pct(f.uniqueRatio)} hint={`${f.unique} distinct pages`} />
        <Stat label="Working set" value={f.workingSet.toFixed(1)} hint="Avg distinct per 10 refs" />
        <Stat label="Avg reuse distance" value={f.avgReuseDistance.toFixed(1)} />
        <Stat label="Pattern score" value={pct(f.patternScore)} />
        <Stat label="Confidence" value={pct(c.confidence)} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Classification">
          <div className="mb-2 text-2xl font-bold">{c.label}</div>
          <div className="mb-4">Recommended: <span className="rounded-full bg-accent px-3 py-1 text-sm font-semibold text-accent-foreground">{c.recommended === "Trial" ? "Trial FIFO vs LRU" : c.recommended}</span></div>
          <p className="mb-4 text-muted-foreground">{c.reason}</p>
          <div className="space-y-2 text-sm">
            {(["fifo", "lru"] as const).map((k) => (
              <div key={k}>
                <div className="mb-1 flex justify-between"><span className="uppercase">{k} score</span><span className="font-mono">{c.scores[k].toFixed(2)}</span></div>
                <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, c.scores[k] * 100)}%` }} /></div>
              </div>
            ))}
            <p className="pt-2 text-xs text-muted-foreground">FIFO score = 0.7 × sequentiality + 0.3 × unique ratio. LRU score = 0.6 × locality + 0.4 × repetition.</p>
          </div>
        </Panel>
        <Panel title="Frequency distribution (top 15)">
          <SimpleBar data={f.frequency.slice(0, 15).map((x) => ({ name: String(x.page), count: x.count }))} dataKey="count" color="var(--chart-2)" height={260} />
        </Panel>
      </div>
    </>
  );
}

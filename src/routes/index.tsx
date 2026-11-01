import { createFileRoute, Link } from "@tanstack/react-router";
import { Play, Shuffle, Beaker, ArrowRight, LayoutDashboard, Layers, Trophy, AlertTriangle, Target, Clock, ListOrdered, BarChart3, ScanSearch, Sparkles, Workflow } from "lucide-react";
import { PageHeader, Stat, Panel, IconChip, Meter, pct, type Tone } from "@/components/ui-kit";
import { useSim } from "@/lib/sim/store";
import { POLICY_LABEL, type Policy } from "@/lib/sim/algorithms";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Page Replacement Simulator" },
      { name: "description", content: "Overview of your latest page replacement simulations and quick actions." },
      { property: "og:title", content: "Dashboard — Page Replacement Simulator" },
      { property: "og:description", content: "Overview of your latest page replacement simulations and quick actions." },
    ],
  }),
  component: Dashboard,
});

const ALGO_INFO: Record<Policy, { tag: string; desc: string; tone: Tone }> = {
  FIFO: { tag: "Queue", desc: "Evicts the oldest loaded page.", tone: "primary" },
  LRU: { tag: "Recency", desc: "Evicts the least recently used page.", tone: "accent" },
  OPT: { tag: "Benchmark", desc: "Evicts the page used furthest ahead.", tone: "warning" },
  ADAPTIVE: { tag: "Smart", desc: "Picks FIFO or LRU from the workload.", tone: "success" },
};

function Dashboard() {
  const { last, workloadName, experiments, frames, refText } = useSim();
  const practical = last.filter((r) => r.policy !== "OPT");
  const best = practical.length ? practical.reduce((a, b) => (b.faults < a.faults ? b : a)) : null;
  const first = last[0];
  const maxFaults = Math.max(1, ...last.map((r) => r.faults));
  const actions = [
    { to: "/simulator", label: "Simulator", icon: Play, desc: "Step through every replacement decision frame-by-frame.", tone: "primary" },
    { to: "/page-fault", label: "Page Fault Routine", icon: Workflow, desc: "Explore the 6-step hardware & OS paging sequence.", tone: "warning" },
    { to: "/workload-lab", label: "Workload Lab", icon: Shuffle, desc: "Create sequential, looping, random and locality patterns.", tone: "accent" },
    { to: "/experiments", label: "Run Experiment", icon: Beaker, desc: "Compare all policies across many workloads at once.", tone: "success" },
  ] as const;
  const explore = [
    { to: "/comparison", label: "Comparison", icon: BarChart3 },
    { to: "/analysis", label: "Analysis", icon: ScanSearch },
  ] as const;

  return (
    <>
      <PageHeader eyebrow="OS Lab · Memory management" icon={LayoutDashboard} title="Page Replacement Simulator" description="Explore how FIFO, LRU, Optimal and a workload-aware adaptive policy manage a fixed number of memory frames. Everything is simulated in your browser.">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/page-fault" className="clay-btn inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold">
            <Workflow className="h-4 w-4" /> 6-Step Page Fault Routine
          </Link>
          <Link to="/simulator" className="clay-btn-primary inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold">
            Start simulating <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map(({ to, label, icon, desc, tone }) => (
          <Link key={to} to={to} className="clay-card group flex flex-col p-5 transition-transform hover:-translate-y-1">
            <IconChip icon={icon} tone={tone} size="lg" />
            <div className="mt-4 text-lg font-semibold">{label}</div>
            <div className="mb-4 text-sm text-muted-foreground">{desc}</div>
            <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary">
              Open <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Layers} label="Last workload" value={first ? workloadName : "—"} hint={first ? `${first.refs.length} refs · ${first.frames} frames` : "Nothing run yet"} />
        <Stat icon={Trophy} tone="success" label="Best policy" value={best ? POLICY_LABEL[best.policy] : "—"} hint="Excluding Optimal" />
        <Stat icon={AlertTriangle} tone="danger" label="Page faults" value={best?.faults ?? first?.faults ?? "—"} hint="Best practical run" />
        <Stat icon={Target} tone="accent" label="Hit ratio" value={first ? pct(best?.hitRatio ?? first.hitRatio) : "—"} hint="Higher is better" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Latest results" subtitle="Faults per policy from your last run" icon={BarChart3} className="lg:col-span-2"
          action={<Link to="/comparison" className="text-sm font-medium text-primary">Details</Link>}>
          {last.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <IconChip icon={Sparkles} size="lg" tone="accent" />
              <p className="text-muted-foreground">No simulations yet. Run one to see your results here.</p>
              <Link to="/simulator" className="clay-btn px-4 py-2 text-sm">New simulation</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {last.map((r) => (
                <div key={r.policy} className="rounded-xl border border-border bg-muted/40 p-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-semibold">{POLICY_LABEL[r.policy]}{r === best && <span className="ml-2 rounded-full bg-success-soft px-2 py-0.5 text-xs text-success">best</span>}</span>
                    <span className="font-mono">{r.faults} faults · {pct(r.hitRatio)} hits</span>
                  </div>
                  <Meter value={r.faults / maxFaults} tone={r === best ? "success" : "danger"} />
                </div>
              ))}
            </div>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel title="Current setup" icon={ListOrdered}>
            <div className="mb-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted p-3"><div className="text-xs text-muted-foreground">Frames</div><div className="font-mono text-xl font-semibold">{frames}</div></div>
              <div className="rounded-xl bg-muted p-3"><div className="text-xs text-muted-foreground">Experiments</div><div className="font-mono text-xl font-semibold">{experiments.length}</div></div>
            </div>
            <div className="truncate rounded-xl bg-muted p-3 font-mono text-sm">{refText || "—"}</div>
          </Panel>
          <Panel title="Explore" icon={Clock}>
            <div className="grid grid-cols-2 gap-3">
              {explore.map(({ to, label, icon }) => (
                <Link key={to} to={to} className="clay-btn flex flex-col items-center gap-2 p-4 text-sm font-medium">
                  <IconChip icon={icon} size="sm" />{label}
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <h2 className="mb-4 mt-8 text-lg font-semibold">Algorithms</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(ALGO_INFO) as Policy[]).map((p) => (
          <div key={p} className="clay-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-lg font-bold">{POLICY_LABEL[p]}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ALGO_INFO[p].tone === "success" ? "bg-success-soft text-success" : ALGO_INFO[p].tone === "warning" ? "bg-warning/15 text-warning" : ALGO_INFO[p].tone === "accent" ? "bg-accent text-accent-foreground" : "bg-secondary text-primary"}`}>{ALGO_INFO[p].tag}</span>
            </div>
            <p className="text-sm text-muted-foreground">{ALGO_INFO[p].desc}</p>
          </div>
        ))}
      </div>
    </>
  );
}

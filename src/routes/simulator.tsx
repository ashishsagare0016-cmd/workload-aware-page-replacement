import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Cpu, SlidersHorizontal, MonitorPlay, Table2, AlertTriangle, CheckCircle2, Target, Percent, ListOrdered, Timer, Check, Workflow, Trophy, ArrowRight, Activity, Layers, HardDrive } from "lucide-react";
import { PageHeader, Panel, Stat, Btn, pct, inputCls } from "@/components/ui-kit";
import { useSim } from "@/lib/sim/store";
import { POLICIES, POLICY_LABEL, type Policy, type SimResult } from "@/lib/sim/algorithms";
import { simulate } from "@/lib/sim/workload";
import { parseRefs, validateFrames } from "@/lib/sim/validation";
import { PageFaultDiagram } from "@/components/PageFaultDiagram";

export const Route = createFileRoute("/simulator")({
  head: () => ({
    meta: [
      { title: "Simulator — Page Replacement Simulator" },
      { name: "description", content: "Step through FIFO, LRU, Optimal and adaptive page replacement frame by frame." },
      { property: "og:title", content: "Simulator — Page Replacement Simulator" },
      { property: "og:description", content: "Step through FIFO, LRU, Optimal and adaptive page replacement frame by frame." },
    ],
  }),
  component: SimulatorPage,
});

const PAGE = 50;

function SimulatorPage() {
  const s = useSim();
  const [policy, setPolicy] = useState<Policy>("LRU");
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState(0);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(600);
  const [tablePage, setTablePage] = useState(0);
  const [showFaultDiagram, setShowFaultDiagram] = useState(true);
  const [displayMode, setDisplayMode] = useState<"diagram" | "frames" | "both">("both");

  const result: SimResult | undefined = s.last[view] ?? s.last[0];
  const steps = result?.steps ?? [];
  const cur = steps[step];

  useEffect(() => {
    if (!playing) return;
    if (step >= steps.length - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setStep((x) => x + 1), speed);
    return () => clearTimeout(t);
  }, [playing, step, steps.length, speed]);

  const run = (all: boolean) => {
    const p = parseRefs(s.refText);
    const fe = validateFrames(s.frames);
    if (!p.ok) return setError(p.error);
    if (fe) return setError(fe);
    setError(null);
    const list = all ? POLICIES : [policy];
    s.setLast(list.map((x) => simulate(x, p.refs, s.frames)));
    setView(0);
    setStep(0);
    setTablePage(0);
    setPlaying(false);
  };

  const reset = () => {
    s.setLast([]);
    setStep(0);
    setPlaying(false);
    setError(null);
  };

  const rows = useMemo(() => steps.slice(tablePage * PAGE, tablePage * PAGE + PAGE), [steps, tablePage]);
  const pages = Math.ceil(steps.length / PAGE);

  return (
    <>
      <PageHeader eyebrow="Step-by-step" icon={Cpu} title="Simulator" description="Enter a reference string, choose frames and a policy, then replay every decision." />
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Panel title="Input" subtitle="Configure your run" icon={SlidersHorizontal} className="h-fit lg:sticky lg:top-6">
          <label className="mb-1 block text-sm font-medium">Reference string</label>
          <textarea rows={4} className={`${inputCls} font-mono`} value={s.refText} onChange={(e) => { s.setRefText(e.target.value); s.setWorkloadName("Manual"); }} placeholder="e.g. 7 0 1 2 0 3" />
          <p className="mb-4 mt-1 text-xs text-muted-foreground">Separate pages with spaces, commas or tabs.</p>
          <label className="mb-1 block text-sm font-medium">Frames</label>
          <input type="number" min={1} max={20} className={`${inputCls} mb-4 font-mono`} value={s.frames} onChange={(e) => s.setFrames(Number(e.target.value))} />
          <label className="mb-1 block text-sm font-medium">Algorithm</label>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {POLICIES.map((p) => (
              <button key={p} onClick={() => setPolicy(p)} className={`relative rounded-xl border-2 p-3 text-left transition-colors ${policy === p ? "border-primary bg-secondary" : "border-border bg-card hover:bg-muted"}`}>
                {policy === p && <Check className="absolute right-2 top-2 h-4 w-4 text-primary" />}
                <div className="text-sm font-semibold">{POLICY_LABEL[p]}</div>
                <div className="text-[11px] text-muted-foreground">{{ FIFO: "Oldest out", LRU: "Least recent out", OPT: "Future-aware", ADAPTIVE: "Auto-select" }[p]}</div>
              </button>
            ))}
          </div>
          {error && <div role="alert" className="mb-4 rounded-lg bg-fault-soft p-3 text-sm text-destructive">{error}</div>}
          <div className="flex flex-col gap-2">
            <Btn variant="primary" onClick={() => run(false)}>Run selected</Btn>
            <Btn onClick={() => run(true)}>Run comparison</Btn>
            <Btn variant="ghost" onClick={reset}><RotateCcw className="h-4 w-4" />Reset</Btn>
          </div>
        </Panel>

        <div className="min-w-0 space-y-6">
          {!result ? (
            <Panel title="Playback" icon={MonitorPlay}><p className="py-10 text-center text-muted-foreground">Run a simulation to see frames, decisions and metrics.</p></Panel>
          ) : (
            <>
              {s.last.length > 1 && (() => {
                const practicalList = s.last.filter((r) => r.policy !== "OPT");
                const bestAlgo = practicalList.reduce((a, b) => (b.faults < a.faults ? b : a));
                const worstAlgo = practicalList.reduce((a, b) => (b.faults > a.faults ? b : a));
                const optAlgo = s.last.find((r) => r.policy === "OPT");
                const sortedLast = [...s.last].sort((a, b) => a.faults - b.faults);

                return (
                  <div className="space-y-3 rounded-2xl border-2 border-amber-400/80 bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-sky-500/10 p-4 shadow-md">
                    {/* Header with Winner Verdict */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md">
                          <Trophy className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                              Comparison Verdict
                            </span>
                            <span className="rounded-full bg-amber-100 dark:bg-amber-950 px-2 py-0.5 text-[10px] font-black text-amber-800 dark:text-amber-300 border border-amber-400">
                              BEST ALGORITHM
                            </span>
                          </div>
                          <h3 className="text-lg md:text-xl font-black text-foreground">
                            🏆 Winner: <span className="text-emerald-600 dark:text-emerald-400">{POLICY_LABEL[bestAlgo.policy]}</span>
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right text-xs">
                          <span className="text-muted-foreground">Fewest Faults: </span>
                          <span className="font-mono font-black text-emerald-600 text-sm">{bestAlgo.faults}</span>
                          <span className="text-muted-foreground ml-2">Hit Ratio: </span>
                          <span className="font-mono font-black text-sky-600 text-sm">{pct(bestAlgo.hitRatio)}</span>
                        </div>
                        <Link to="/comparison" className="clay-btn inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold">
                          View Full Charts <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>

                    {/* Quick Explanation */}
                    <p className="text-xs text-muted-foreground">
                      <strong>Why {POLICY_LABEL[bestAlgo.policy]} is Best:</strong> It achieved {bestAlgo.faults} faults (Hit Ratio {pct(bestAlgo.hitRatio)}), outperforming {POLICY_LABEL[worstAlgo.policy]} by {worstAlgo.faults - bestAlgo.faults} fewer faults! {optAlgo && `(Theoretical Optimal lower bound is ${optAlgo.faults} faults).`}
                    </p>

                    {/* 4 Clickable Algorithm Scorecards */}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {s.last.map((r, i) => {
                        const rank = sortedLast.findIndex((x) => x.policy === r.policy) + 1;
                        const isWinner = r === bestAlgo;
                        const isOpt = r.policy === "OPT";
                        const isSelected = view === i;

                        return (
                          <button
                            key={r.policy}
                            onClick={() => {
                              setView(i);
                              setStep(0);
                              setPlaying(false);
                            }}
                            className={`rounded-xl border-2 p-3 text-left transition-all ${
                              isSelected
                                ? "border-primary bg-card shadow-md ring-2 ring-primary/40 scale-[1.02]"
                                : "border-border bg-card/60 hover:bg-card hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span>{POLICY_LABEL[r.policy]}</span>
                              {isWinner ? (
                                <span className="text-[10px] text-emerald-600 font-extrabold">🏆 #1 Best</span>
                              ) : isOpt ? (
                                <span className="text-[10px] text-sky-600 font-medium">Benchmark</span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">Rank #{rank}</span>
                              )}
                            </div>
                            <div className="mt-1 font-mono text-xl font-extrabold text-foreground">
                              {r.faults} <span className="text-[10px] font-normal text-muted-foreground">faults</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              Hit Ratio: <span className="font-mono font-semibold text-foreground">{pct(r.hitRatio)}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              <Panel
                icon={MonitorPlay}
                title={POLICY_LABEL[result.policy]}
                subtitle={`Step ${step + 1} of ${steps.length}`}
                action={
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                      <button
                        onClick={() => setDisplayMode("diagram")}
                        className={`rounded px-2.5 py-1 font-semibold transition-all ${
                          displayMode === "diagram" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Diagram Flow (Ma'am's View)
                      </button>
                      <button
                        onClick={() => setDisplayMode("frames")}
                        className={`rounded px-2.5 py-1 font-semibold transition-all ${
                          displayMode === "frames" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Frames Grid
                      </button>
                      <button
                        onClick={() => setDisplayMode("both")}
                        className={`rounded px-2.5 py-1 font-semibold transition-all ${
                          displayMode === "both" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Both
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border-2 border-success bg-success-soft" />Hit</span>
                      <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border-2 border-destructive bg-fault-soft" />Fault</span>
                    </div>
                  </div>
                }
              >
                {/* Reference String Visual Stream Strip */}
                <div className="mb-4">
                  <div className="mb-1.5 flex items-center justify-between text-xs font-semibold uppercase text-muted-foreground">
                    <span>Reference String Stream:</span>
                    <span className="font-mono text-primary font-bold">Page #{step + 1} of {steps.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-muted/60 border border-border overflow-x-auto max-h-24">
                    {result.refs.map((refPage, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setStep(idx);
                          setPlaying(false);
                        }}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg font-mono text-xs font-bold transition-all ${
                          idx === step
                            ? "bg-primary text-primary-foreground shadow-md scale-110 ring-2 ring-primary/40"
                            : idx < step
                            ? steps[idx]?.hit
                              ? "bg-success-soft text-success border border-success/40"
                              : "bg-fault-soft text-destructive border border-destructive/40"
                            : "bg-card text-muted-foreground hover:bg-muted"
                        }`}
                        title={`Page ${refPage} (Index ${idx + 1})`}
                      >
                        {refPage}
                      </button>
                    ))}
                  </div>
                </div>

                {result.adaptiveNote && <p className="mb-3 rounded-lg bg-accent p-3 text-sm text-accent-foreground">{result.adaptiveNote}</p>}
                {cur && (
                  <>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">Page</span>
                        <span className="font-mono text-3xl font-bold">{cur.page}</span>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cur.hit ? "bg-success-soft text-success" : "bg-fault-soft text-destructive"}`}>
                          {cur.hit ? "HIT" : "PAGE FAULT"}
                        </span>
                      </div>
                      <p className="rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm">{cur.decision}</p>
                    </div>

                    {/* 1. Textbook Page Fault Diagram View */}
                    {(displayMode === "diagram" || displayMode === "both") && (
                      <div className="mb-5 overflow-hidden rounded-2xl">
                        <PageFaultDiagram
                          page={cur.page}
                          frameIndex={cur.slot}
                          isHit={cur.hit}
                          activeFrames={cur.frames}
                          hideControls={true}
                          interactive={true}
                        />
                      </div>
                    )}

                    {/* 2. Classic Frames Grid View */}
                    {(displayMode === "frames" || displayMode === "both") && (
                      <div className="mb-4">
                        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Physical Memory Allocation:
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {cur.frames.map((f, i) => {
                            const active = i === cur.slot;
                            const tone = active ? (cur.hit ? "border-success bg-success-soft" : "border-destructive bg-fault-soft") : "border-border bg-muted";
                            return (
                              <div key={i} className={`flex h-20 w-20 flex-col items-center justify-center rounded-xl border-2 ${tone} transition-colors`}>
                                <span className="text-[10px] uppercase text-muted-foreground">F{i + 1}</span>
                                <span className="font-mono text-2xl font-semibold">{f ?? "–"}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <Btn aria-label="Step back" onClick={() => setStep((x) => Math.max(0, x - 1))}><SkipBack className="h-4 w-4" /></Btn>
                  <Btn variant="primary" aria-label={playing ? "Pause" : "Play"} onClick={() => { if (step >= steps.length - 1) setStep(0); setPlaying(!playing); }}>
                    {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Btn>
                  <Btn aria-label="Step forward" onClick={() => setStep((x) => Math.min(steps.length - 1, x + 1))}><SkipForward className="h-4 w-4" /></Btn>
                  <select className="clay-btn px-2 py-2 text-sm" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} aria-label="Speed">
                    <option value={1200}>0.5×</option>
                    <option value={600}>1×</option>
                    <option value={250}>2×</option>
                    <option value={80}>4×</option>
                  </select>
                  <input type="range" className="flex-1 accent-primary" min={0} max={Math.max(0, steps.length - 1)} value={step} onChange={(e) => setStep(Number(e.target.value))} aria-label="Scrub" />
                </div>
              </Panel>

              {/* LIVE & OVERALL RATIOS (Hit Ratio & Fault Ratio) */}
              {(() => {
                const curSteps = steps.slice(0, step + 1);
                const curHits = curSteps.filter((x) => x.hit).length;
                const curFaults = curSteps.filter((x) => !x.hit).length;
                const curTotal = curSteps.length || 1;
                const liveHitRatio = curHits / curTotal;
                const liveFaultRatio = curFaults / curTotal;

                return (
                  <div className="space-y-4">
                    {/* Live step metrics vs Final summary */}
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      <Stat
                        icon={Target}
                        tone="accent"
                        label="Live Hit Ratio"
                        value={pct(liveHitRatio)}
                        hint={`Step ${step + 1}: ${curHits} hits / ${curTotal} refs`}
                      />
                      <Stat
                        icon={Percent}
                        tone="warning"
                        label="Live Fault Ratio"
                        value={pct(liveFaultRatio)}
                        hint={`Step ${step + 1}: ${curFaults} faults / ${curTotal} refs`}
                      />
                      <Stat
                        icon={CheckCircle2}
                        tone="success"
                        label="Overall Hit Ratio"
                        value={pct(result.hitRatio)}
                        hint={`${result.hits} hits / ${result.refs.length} total`}
                      />
                      <Stat
                        icon={AlertTriangle}
                        tone="danger"
                        label="Overall Fault Ratio"
                        value={pct(result.faultRate)}
                        hint={`${result.faults} faults / ${result.refs.length} total`}
                      />
                    </div>

                    {/* Formula Explanation Banner */}
                    <div className="rounded-xl border border-border bg-card p-3.5 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">Formulas:</span>
                        <span>• Hit Ratio = <span className="font-mono text-success font-semibold">(Hits / References) × 100%</span></span>
                        <span>• Fault Ratio = <span className="font-mono text-destructive font-semibold">(Faults / References) × 100%</span></span>
                      </div>
                      <div className="font-mono text-xs font-semibold text-primary">
                        Hit Ratio ({pct(liveHitRatio)}) + Fault Ratio ({pct(liveFaultRatio)}) = 100%
                      </div>
                    </div>

                    {/* PHASE 2 EVALUATION METRICS: Memory Accesses, Execution Time & Overhead */}
                    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-border pb-2.5">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-primary" />
                          <h4 className="text-sm font-bold uppercase tracking-wider text-foreground">
                            Phase 2 Evaluation Metrics ({POLICY_LABEL[result.policy]})
                          </h4>
                        </div>
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                          Hardware & System Model
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {/* 1. Memory Accesses Breakdown */}
                        <div className="rounded-xl border border-border bg-muted/40 p-3">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                            <Layers className="h-3.5 w-3.5 text-sky-500" /> Total Accesses
                          </div>
                          <div className="mt-1 font-mono text-xl font-black text-foreground">
                            {result.memoryAccesses?.totalAccesses ?? result.refs.length}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            RAM: <strong className="text-success">{result.memoryAccesses?.ramAccesses ?? result.hits}</strong> · Disk: <strong className="text-destructive">{result.memoryAccesses?.diskAccesses ?? result.faults}</strong>
                          </div>
                        </div>

                        {/* 2. Effective Memory Access Time (EAT) */}
                        <div className="rounded-xl border border-border bg-muted/40 p-3">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                            <Timer className="h-3.5 w-3.5 text-amber-500" /> Effective Access Time
                          </div>
                          <div className="mt-1 font-mono text-xl font-black text-foreground">
                            {result.memoryAccesses?.effectiveAccessTimeMs ?? (result.faultRate * 10).toFixed(2)} <span className="text-xs font-normal">ms</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {(result.memoryAccesses?.effectiveAccessTimeNs ?? 0).toLocaleString()} ns / ref
                          </div>
                        </div>

                        {/* 3. Execution Time & Benchmark */}
                        <div className="rounded-xl border border-border bg-muted/40 p-3">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                            <Cpu className="h-3.5 w-3.5 text-indigo-500" /> Execution Time
                          </div>
                          <div className="mt-1 font-mono text-xl font-black text-foreground">
                            {result.timeUs ? `${result.timeUs} μs` : `${result.timeMs.toFixed(3)} ms`}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            ~{result.timePerAccessUs ?? 0.05} μs per page
                          </div>
                        </div>

                        {/* 4. Algorithm Overhead */}
                        <div className="rounded-xl border border-border bg-muted/40 p-3">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                            <HardDrive className="h-3.5 w-3.5 text-emerald-500" /> Algorithm Overhead
                          </div>
                          <div className="mt-1 font-mono text-lg font-black text-foreground">
                            {result.overhead?.overheadScore ?? "Low"}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {result.overhead?.timeComplexityPerAccess ?? "O(1)"} · {result.overhead?.spaceComplexity ?? "O(F)"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <Panel title="Step-by-step table" subtitle="Click a row to jump to it" icon={Table2}>
                {steps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Step details were not saved for this large run. Run it again to view them.</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full font-mono text-sm">
                        <thead className="text-left text-xs uppercase text-muted-foreground">
                          <tr><th className="p-2">#</th><th className="p-2">Page</th><th className="p-2">Frames</th><th className="p-2">Result</th><th className="p-2">Replaced</th></tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => (
                            <tr key={r.index} onClick={() => setStep(r.index)} className={`cursor-pointer border-t border-border ${r.index === step ? "bg-secondary" : "hover:bg-muted"}`}>
                              <td className="p-2">{r.index + 1}</td>
                              <td className="p-2">{r.page}</td>
                              <td className="p-2">[{r.frames.map((f) => f ?? "-").join(", ")}]</td>
                              <td className={`p-2 font-semibold ${r.hit ? "text-success" : "text-destructive"}`}>{r.hit ? "Hit" : "Fault"}</td>
                              <td className="p-2">{r.replaced ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {pages > 1 && (
                      <div className="mt-3 flex items-center gap-2 text-sm">
                        <Btn disabled={tablePage === 0} onClick={() => setTablePage(tablePage - 1)}>Prev</Btn>
                        <span>Page {tablePage + 1} / {pages}</span>
                        <Btn disabled={tablePage >= pages - 1} onClick={() => setTablePage(tablePage + 1)}>Next</Btn>
                      </div>
                    )}
                  </>
                )}
              </Panel>
            </>
          )}
        </div>
      </div>
    </>
  );
}

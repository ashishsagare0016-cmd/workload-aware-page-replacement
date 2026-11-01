import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  Workflow,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Cpu,
  SlidersHorizontal,
  Table2,
  AlertTriangle,
  CheckCircle2,
  Target,
  Percent,
  ListOrdered,
  Timer,
  Check,
  HardDrive,
} from "lucide-react";
import { PageHeader, Panel, Stat, Btn, pct, inputCls } from "@/components/ui-kit";
import { useSim } from "@/lib/sim/store";
import { POLICIES, POLICY_LABEL, type Policy, type SimResult } from "@/lib/sim/algorithms";
import { simulate } from "@/lib/sim/workload";
import { parseRefs, validateFrames } from "@/lib/sim/validation";
import { PageFaultDiagram } from "@/components/PageFaultDiagram";

export const Route = createFileRoute("/page-fault")({
  head: () => ({
    meta: [
      { title: "Page Fault Routine & Simulation — Reference String & Ratios" },
      {
        name: "description",
        content: "Interactive reference string simulation showing exact 6-step Page Fault handling, frames, hit ratio, and fault ratio.",
      },
    ],
  }),
  component: PageFaultPage,
});

function PageFaultPage() {
  const s = useSim();

  // Local state initialized from store
  const [refInput, setRefInput] = useState<string>(s.refText || "7 0 1 2 0 3 0 4 2 3 0 3 2");
  const [framesCount, setFramesCount] = useState<number>(s.frames || 3);
  const [policy, setPolicy] = useState<Policy>("FIFO");
  const [error, setError] = useState<string | null>(null);

  // Stepper & Playback state
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1800);

  // Run simulation whenever input, frames or policy change
  const simResult: SimResult = useMemo(() => {
    const p = parseRefs(refInput);
    const fe = validateFrames(framesCount);
    if (!p.ok || fe) {
      // Fallback safe simulation
      return simulate(policy, [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2], 3);
    }
    return simulate(policy, p.refs, framesCount);
  }, [refInput, framesCount, policy]);

  const steps = simResult.steps;
  const currentStep = steps[stepIndex] ?? steps[0];

  // Auto-play through reference string
  useEffect(() => {
    if (!playing) return;
    if (stepIndex >= steps.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      setStepIndex((idx) => idx + 1);
    }, speed);
    return () => clearTimeout(timer);
  }, [playing, stepIndex, steps.length, speed]);

  // Compute live cumulative stats up to the current step
  const currentRefs = simResult.refs.slice(0, stepIndex + 1);
  const currentSteps = steps.slice(0, stepIndex + 1);
  const currentFaults = currentSteps.filter((st) => !st.hit).length;
  const currentHits = currentSteps.filter((st) => st.hit).length;
  const totalRefsSoFar = currentSteps.length || 1;
  const liveHitRatio = currentHits / totalRefsSoFar;
  const liveFaultRatio = currentFaults / totalRefsSoFar;

  const handleApply = () => {
    const p = parseRefs(refInput);
    const fe = validateFrames(framesCount);
    if (!p.ok) return setError(p.error);
    if (fe) return setError(fe);
    setError(null);
    setStepIndex(0);
    setPlaying(false);
    s.setRefText(refInput);
    s.setFrames(framesCount);
  };

  const handleReset = () => {
    setStepIndex(0);
    setPlaying(false);
  };

  return (
    <>
      <PageHeader
        eyebrow="Virtual Memory Architecture · Live Simulator"
        icon={Workflow}
        title="Page Fault Diagram & Ratio Simulator"
        description="Enter your reference string and frames, step through each page access, and watch the exact 6-step textbook diagram animate while computing Hit Ratio and Fault Ratio."
      >
        <div className="flex items-center gap-2">
          <Link to="/simulator" className="clay-btn inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold">
            <Cpu className="h-4 w-4" /> Classic Simulator
          </Link>
        </div>
      </PageHeader>

      {/* Main Grid: Left Controls, Right Live Diagram & Metrics */}
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">

        {/* LEFT COLUMN: Input Configuration (Matching Screenshot) */}
        <Panel title="INPUT" subtitle="Configure your run" icon={SlidersHorizontal} className="h-fit lg:sticky lg:top-6">
          <label className="mb-1 block text-sm font-medium">Reference string</label>
          <textarea
            rows={3}
            className={`${inputCls} font-mono`}
            value={refInput}
            onChange={(e) => setRefInput(e.target.value)}
            placeholder="e.g. 7 0 1 2 0 3 0 4 2 3 0 3 2"
          />
          <p className="mb-4 mt-1 text-xs text-muted-foreground">Separate pages with spaces or commas.</p>

          <label className="mb-1 block text-sm font-medium">Frames</label>
          <input
            type="number"
            min={1}
            max={10}
            className={`${inputCls} mb-4 font-mono`}
            value={framesCount}
            onChange={(e) => setFramesCount(Number(e.target.value) || 1)}
          />

          <label className="mb-1 block text-sm font-medium">Algorithm</label>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {(["FIFO", "LRU", "OPT"] as Policy[]).map((p) => (
              <button
                key={p}
                onClick={() => {
                  setPolicy(p);
                  setStepIndex(0);
                }}
                className={`relative rounded-xl border-2 p-2.5 text-left transition-colors ${policy === p ? "border-primary bg-secondary" : "border-border bg-card hover:bg-muted"
                  }`}
              >
                {policy === p && <Check className="absolute right-2 top-2 h-4 w-4 text-primary" />}
                <div className="text-sm font-semibold">{POLICY_LABEL[p]}</div>
                <div className="text-[11px] text-muted-foreground">
                  {{ FIFO: "Oldest out", LRU: "Least recent", OPT: "Optimal" }[p]}
                </div>
              </button>
            ))}
          </div>

          {error && <div className="mb-4 rounded-lg bg-fault-soft p-3 text-sm text-destructive">{error}</div>}

          <div className="flex flex-col gap-2">
            <Btn variant="primary" onClick={handleApply}>
              Update Reference String
            </Btn>
            <Btn variant="ghost" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" /> Reset to Step 1
            </Btn>
          </div>

          {/* Quick presets for class demonstration */}
          <div className="mt-5 border-t border-border pt-4">
            <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Textbook Examples:</div>
            <div className="flex flex-col gap-1.5 text-xs">
              <button
                onClick={() => {
                  setRefInput("7 0 1 2 0 3 0 4 2 3 0 3 2");
                  setFramesCount(3);
                  setStepIndex(0);
                }}
                className="text-left text-primary hover:underline"
              >
                • 7 0 1 2 0 3 0 4 2 3 (Silberschatz)
              </button>
              <button
                onClick={() => {
                  setRefInput("1 2 3 4 1 2 5 1 2 3 4 5");
                  setFramesCount(3);
                  setStepIndex(0);
                }}
                className="text-left text-primary hover:underline"
              >
                • Belady's Anomaly (1 2 3 4 1 2 5...)
              </button>
            </div>
          </div>
        </Panel>

        {/* RIGHT COLUMN: Live Simulation, Metrics & Diagram */}
        <div className="min-w-0 space-y-6">

          {/* Live Step Card & Frame View (Matching User's Screenshot) */}
          <Panel
            icon={Workflow}
            title={`${POLICY_LABEL[policy]} Simulation`}
            subtitle={`Step ${stepIndex + 1} of ${steps.length}`}
            action={
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded border-2 border-success bg-success-soft" /> Hit
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded border-2 border-destructive bg-fault-soft" /> Fault
                </span>
              </div>
            }
          >
            {/* Reference String Visual Stream Strip */}
            <div className="mb-5">
              <div className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground flex justify-between">
                <span>Reference String Stream:</span>
                <span className="font-mono text-primary font-bold">Index #{stepIndex + 1}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-muted/60 border border-border overflow-x-auto">
                {simResult.refs.map((refPage, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setStepIndex(idx);
                      setPlaying(false);
                    }}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg font-mono text-xs font-bold transition-all ${idx === stepIndex
                        ? "bg-primary text-primary-foreground shadow-md scale-110 ring-2 ring-primary/40"
                        : idx < stepIndex
                          ? steps[idx]?.hit
                            ? "bg-success-soft text-success border border-success/40"
                            : "bg-fault-soft text-destructive border border-destructive/40"
                          : "bg-card text-muted-foreground hover:bg-muted"
                      }`}
                  >
                    {refPage}
                  </button>
                ))}
              </div>
            </div>

            {/* Current Reference & Frames Row (Exact Replica of User's Screenshot) */}
            {currentStep && (
              <div className="mb-5 rounded-2xl border border-border bg-card p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground">Page</span>
                    <span className="font-mono text-4xl font-extrabold text-foreground">{currentStep.page}</span>
                    <span
                      className={`rounded-full px-3.5 py-1 text-xs font-bold tracking-wider ${currentStep.hit ? "bg-success-soft text-success border border-success/30" : "bg-fault-soft text-destructive border border-destructive/30"
                        }`}
                    >
                      {currentStep.hit ? "HIT" : "FAULT"}
                    </span>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm text-foreground max-w-md">
                    {currentStep.decision}
                  </div>
                </div>

                {/* Frames Rectangles matching F1, F2, F3 in screenshot */}
                <div className="mb-2">
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Physical Memory Frames (RAM):
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {currentStep.frames.map((f, i) => {
                      const active = i === currentStep.slot;
                      const tone = active
                        ? currentStep.hit
                          ? "border-success bg-success-soft text-success shadow-sm"
                          : "border-destructive bg-fault-soft text-destructive shadow-sm"
                        : "border-border bg-muted/30 text-foreground";

                      return (
                        <div
                          key={i}
                          className={`flex h-20 w-20 flex-col items-center justify-center rounded-2xl border-2 ${tone} transition-all duration-300`}
                        >
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">F{i + 1}</span>
                          <span className="font-mono text-2xl font-black mt-0.5">{f ?? "–"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Stepper Controls Bar */}
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
              <Btn
                aria-label="Step back"
                onClick={() => {
                  setStepIndex((idx) => Math.max(0, idx - 1));
                  setPlaying(false);
                }}
                disabled={stepIndex === 0}
              >
                <SkipBack className="h-4 w-4" /> Prev Page
              </Btn>

              <Btn
                variant="primary"
                onClick={() => {
                  if (stepIndex >= steps.length - 1) setStepIndex(0);
                  setPlaying(!playing);
                }}
                className="w-32"
              >
                {playing ? (
                  <>
                    <Pause className="h-4 w-4" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" /> Play All
                  </>
                )}
              </Btn>

              <Btn
                aria-label="Step forward"
                onClick={() => {
                  setStepIndex((idx) => Math.min(steps.length - 1, idx + 1));
                  setPlaying(false);
                }}
                disabled={stepIndex >= steps.length - 1}
              >
                Next Page <SkipForward className="h-4 w-4" />
              </Btn>

              <select
                className="clay-btn px-2.5 py-2 text-xs font-mono"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
              >
                <option value={2600}>0.5×</option>
                <option value={1800}>1×</option>
                <option value={1000}>1.8×</option>
                <option value={500}>3×</option>
              </select>

              <input
                type="range"
                className="flex-1 accent-primary min-w-[120px]"
                min={0}
                max={Math.max(0, steps.length - 1)}
                value={stepIndex}
                onChange={(e) => {
                  setStepIndex(Number(e.target.value));
                  setPlaying(false);
                }}
              />
            </div>
          </Panel>

          {/* METRICS ROW: Properly Showing Hit Ratio & Fault Ratio (Requested by user) */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat
              icon={Target}
              tone="accent"
              label="Hit Ratio"
              value={pct(liveHitRatio)}
              hint={`${currentHits} hits / ${totalRefsSoFar} total`}
            />
            <Stat
              icon={Percent}
              tone="warning"
              label="Fault Ratio"
              value={pct(liveFaultRatio)}
              hint={`${currentFaults} faults / ${totalRefsSoFar} total`}
            />
            <Stat
              icon={CheckCircle2}
              tone="success"
              label="Total Hits"
              value={currentHits}
              hint={`Hits at step ${stepIndex + 1}`}
            />
            <Stat
              icon={AlertTriangle}
              tone="danger"
              label="Page Faults"
              value={currentFaults}
              hint={`Faults at step ${stepIndex + 1}`}
            />
          </div>

          {/* Phase 2 Metrics Strip (Memory Accesses & EAT) */}
          <div className="rounded-xl border border-border bg-card p-3.5 text-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-foreground">Phase 2 Metrics:</span>
              <span>• Memory Accesses: <strong className="font-mono text-foreground">{totalRefsSoFar}</strong> (RAM Hits: <strong className="text-success">{currentHits}</strong>, Disk Faults: <strong className="text-destructive">{currentFaults}</strong>)</span>
              <span>• EAT: <strong className="font-mono text-amber-600">{((liveHitRatio * 100 + liveFaultRatio * 10_000_000) / 1_000_000).toFixed(2)} ms</strong></span>
              <span>• Exec Speed: <strong className="font-mono text-indigo-600">~{simResult.timeUs ?? 18} μs</strong></span>
              <span>• Overhead: <strong className="font-mono text-primary">{simResult.overhead?.overheadScore ?? "Minimal"}</strong></span>
            </div>
            <div className="font-mono text-[11px] text-muted-foreground">
              Hardware Model: T(RAM)=100ns, T(Disk)=10ms
            </div>
          </div>

          {/* THE LIVE 6-STEP DIAGRAM SIMULATION WITH BACKING STORE CHECK */}
          <div className="rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-card overflow-hidden shadow-sm">
            <div className="bg-slate-100 dark:bg-muted/60 px-5 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-sky-500 animate-ping" />
                <span className="font-bold text-sm text-foreground uppercase tracking-wide">
                  Live Diagram Execution for Step #{stepIndex + 1} (Page {currentStep?.page})
                </span>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {currentStep?.hit ? "Status: Cache Hit" : "Status: Page Fault Handling Routine"}
              </span>
            </div>

            <div className="p-4">
              <PageFaultDiagram
                page={currentStep?.page ?? 4}
                frameIndex={currentStep?.slot ?? 0}
                isHit={currentStep?.hit}
                activeFrames={currentStep?.frames}
                hideControls={true}
                interactive={true}
              />
            </div>
          </div>

          {/* Step-by-Step Decision Table */}
          <Panel title="Execution History Table" subtitle="Click any row to jump directly to that step in the diagram" icon={Table2}>
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-xs text-left">
                <thead className="border-b border-border bg-muted/60 text-[10px] uppercase text-muted-foreground">
                  <tr>
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">Page</th>
                    <th className="p-2.5">Frames</th>
                    <th className="p-2.5">Outcome</th>
                    <th className="p-2.5">Hit Ratio</th>
                    <th className="p-2.5">Fault Ratio</th>
                    <th className="p-2.5">Evicted Page</th>
                  </tr>
                </thead>
                <tbody>
                  {steps.map((st, idx) => {
                    const subSteps = steps.slice(0, idx + 1);
                    const subHits = subSteps.filter((x) => x.hit).length;
                    const subFaults = subSteps.filter((x) => !x.hit).length;
                    const subHitRatio = subHits / (idx + 1);
                    const subFaultRatio = subFaults / (idx + 1);

                    return (
                      <tr
                        key={idx}
                        onClick={() => {
                          setStepIndex(idx);
                          setPlaying(false);
                        }}
                        className={`cursor-pointer border-t border-border transition-colors ${idx === stepIndex ? "bg-secondary font-bold" : "hover:bg-muted/40"
                          }`}
                      >
                        <td className="p-2.5">{idx + 1}</td>
                        <td className="p-2.5 font-bold">Page {st.page}</td>
                        <td className="p-2.5 font-mono">[{st.frames.map((f) => f ?? "-").join(", ")}]</td>
                        <td className="p-2.5">
                          <span
                            className={`rounded px-2 py-0.5 font-bold ${st.hit ? "bg-success-soft text-success" : "bg-fault-soft text-destructive"
                              }`}
                          >
                            {st.hit ? "HIT" : "FAULT"}
                          </span>
                        </td>
                        <td className="p-2.5 text-accent-foreground font-semibold">{pct(subHitRatio)}</td>
                        <td className="p-2.5 text-destructive font-semibold">{pct(subFaultRatio)}</td>
                        <td className="p-2.5 text-muted-foreground">{st.replaced !== null ? `Page ${st.replaced}` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

        </div>
      </div>
    </>
  );
}

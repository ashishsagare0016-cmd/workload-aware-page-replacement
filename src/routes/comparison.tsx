import { BarChart3, Trophy, CheckCircle2, AlertTriangle, Target, Percent, Sparkles, ArrowRight } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Panel, Btn, pct } from "@/components/ui-kit";
import { SimpleBar } from "@/components/Charts";
import { useSim } from "@/lib/sim/store";
import { POLICIES, POLICY_LABEL, type Policy, type SimResult } from "@/lib/sim/algorithms";
import { simulate, analyze, classify } from "@/lib/sim/workload";
import { parseRefs } from "@/lib/sim/validation";

export const Route = createFileRoute("/comparison")({
  head: () => ({
    meta: [
      { title: "Algorithm Comparison & Best Policy — Page Replacement Simulator" },
      { name: "description", content: "Compare all four policies (FIFO, LRU, Optimal, Adaptive) and find the best algorithm." },
      { property: "og:title", content: "Algorithm Comparison & Best Policy" },
      { property: "og:description", content: "Compare all four policies and see which algorithm performs best." },
    ],
  }),
  component: Comparison,
});

function Comparison() {
  const s = useSim();
  if (!s.ready) return null;
  const parsed = parseRefs(s.refText);
  const results: SimResult[] = parsed.ok ? POLICIES.map((p) => simulate(p, parsed.refs, s.frames)) : [];

  if (!parsed.ok || !results.length)
    return (
      <>
        <PageHeader eyebrow="Benchmark" icon={BarChart3} title="Algorithm Comparison" description="All four policies on the current reference string." />
        <Panel>
          <p className="mb-3 text-muted-foreground">The current reference string is invalid: {!parsed.ok && parsed.error}</p>
          <Link to="/simulator"><Btn>Fix in Simulator</Btn></Link>
        </Panel>
      </>
    );

  const practical = results.filter((r) => r.policy !== "OPT");
  const bestPractical = practical.reduce((a, b) => (b.faults < a.faults ? b : a));
  const worstPractical = practical.reduce((a, b) => (b.faults > a.faults ? b : a));
  const opt = results.find((r) => r.policy === "OPT")!;
  const c = classify(analyze(parsed.refs, s.frames));

  // Sort by faults ascending (fewest faults = highest rank)
  const sorted = [...results].sort((a, b) => a.faults - b.faults);

  // Chart dataset (Replaces flat 0 execution time with Hits count and Hit ratio)
  const data = results.map((r) => ({
    name: POLICY_LABEL[r.policy],
    faults: r.faults,
    hits: r.hits,
    hit: +(r.hitRatio * 100).toFixed(1),
    fault: +(r.faultRate * 100).toFixed(1),
  }));

  return (
    <>
      <PageHeader
        eyebrow="Benchmark & Verdict"
        icon={BarChart3}
        title="4-Way Algorithm Comparison"
        description={`${parsed.refs.length} references · ${s.frames} frames · Workload: ${s.workloadName}`}
      >
        <div className="flex items-center gap-2">
          <Link to="/simulator">
            <Btn variant="primary" onClick={() => s.setLast(results)}>
              Replay in Simulator View <ArrowRight className="ml-1 h-4 w-4" />
            </Btn>
          </Link>
        </div>
      </PageHeader>

      {/* 🏆 DEFINITIVE BEST ALGORITHM VERDICT BANNER (Requested by user) */}
      <div className="mb-6 rounded-2xl border-2 border-amber-400/80 bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-sky-500/10 p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md">
              <Trophy className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Comprehensive Evaluation
                </span>
                <span className="rounded-full bg-amber-100 dark:bg-amber-950/80 px-2.5 py-0.5 text-[11px] font-black text-amber-800 dark:text-amber-300 border border-amber-400/40">
                  WINNER
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-foreground">
                Best Practical Algorithm:{" "}
                <span className="text-emerald-600 dark:text-emerald-400">{POLICY_LABEL[bestPractical.policy]}</span>
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl border border-border bg-card/90 px-4 py-2.5 text-center shadow-sm backdrop-blur">
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Fewest Faults</div>
              <div className="font-mono text-2xl font-black text-emerald-600">{bestPractical.faults}</div>
            </div>
            <div className="rounded-xl border border-border bg-card/90 px-4 py-2.5 text-center shadow-sm backdrop-blur">
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Highest Hit Ratio</div>
              <div className="font-mono text-2xl font-black text-sky-600">{pct(bestPractical.hitRatio)}</div>
            </div>
            <div className="rounded-xl border border-border bg-card/90 px-4 py-2.5 text-center shadow-sm backdrop-blur">
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Faults Saved vs Worst</div>
              <div className="font-mono text-2xl font-black text-amber-600">
                +{worstPractical.faults - bestPractical.faults}
              </div>
            </div>
          </div>
        </div>

        {/* Clear Explanation of WHY it is the best */}
        <div className="mt-4 rounded-xl border border-border bg-card/80 p-3.5 text-sm text-foreground backdrop-blur">
          <p className="leading-relaxed">
            <strong>Why {POLICY_LABEL[bestPractical.policy]} is the BEST:</strong> For this reference string,{" "}
            <strong>{POLICY_LABEL[bestPractical.policy]}</strong> achieved the minimum page faults (
            <span className="font-mono font-bold text-emerald-600">{bestPractical.faults} faults</span>) and the highest hit ratio (
            <span className="font-mono font-bold text-sky-600">{pct(bestPractical.hitRatio)}</span>), reducing slow disk swap I/O operations by{" "}
            <strong>{worstPractical.faults - bestPractical.faults} faults</strong> compared to {POLICY_LABEL[worstPractical.policy]}.
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            <strong>Theoretical Bound:</strong> Optimal (OPT) achieved {opt.faults} faults ({pct(opt.hitRatio)} hit ratio). Since Optimal requires future knowledge that real operating systems cannot have,{" "}
            <strong>{POLICY_LABEL[bestPractical.policy]}</strong> is the optimal real-world choice.
          </p>
        </div>
      </div>

      {/* 4 Cards with Ranking Badges (1st, 2nd, 3rd, 4th) */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {results.map((r) => {
          const rank = sorted.findIndex((x) => x.policy === r.policy) + 1;
          const isWinner = r === bestPractical;
          const isOpt = r.policy === "OPT";

          return (
            <div
              key={r.policy}
              className={`clay-card relative p-4 transition-all ${
                isWinner ? "border-2 border-emerald-500 shadow-md ring-2 ring-emerald-500/20" : isOpt ? "border-2 border-sky-400" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-base">{POLICY_LABEL[r.policy]}</span>
                {isWinner ? (
                  <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-300 border border-emerald-400">
                    🏆 1st (BEST)
                  </span>
                ) : isOpt ? (
                  <span className="rounded-full bg-sky-100 dark:bg-sky-950 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-300 border border-sky-400">
                    Benchmark
                  </span>
                ) : (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    Rank #{rank}
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-baseline gap-2 font-mono text-3xl font-black">
                {r.faults}
                <span className="text-xs font-semibold uppercase text-muted-foreground">Page Faults</span>
              </div>

              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Hit Ratio:</span>
                <span className="font-mono font-bold text-foreground">{pct(r.hitRatio)}</span>
              </div>

              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Total Hits:</span>
                <span className="font-mono font-bold text-success">{r.hits}</span>
              </div>

              {r.chosen && (
                <div className="mt-2.5 rounded-lg bg-muted/60 px-2 py-1 text-[11px] text-muted-foreground">
                  Adaptive selected: <strong>{r.chosen}</strong>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 4 PROPER COMPARISON CHARTS (Page Faults, Hit Ratio, Memory Accesses, Execution Time) */}
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <Panel title="1. Page Faults (Lower is Better)">
          <SimpleBar data={data} dataKey="faults" color="var(--chart-5)" />
        </Panel>
        <Panel title="2. Hit Ratio % (Higher is Better)">
          <SimpleBar data={data} dataKey="hit" color="var(--chart-3)" />
        </Panel>
        <Panel title="3. RAM Accesses vs Disk Accesses (RAM Hits)">
          <SimpleBar data={data} dataKey="hits" color="var(--chart-2)" />
        </Panel>
        <Panel title="4. Execution Time Benchmark (Microseconds μs)">
          <SimpleBar
            data={results.map((r) => ({
              name: POLICY_LABEL[r.policy],
              timeUs: r.timeUs || Number((r.timeMs * 1000).toFixed(1)),
            }))}
            dataKey="timeUs"
            color="var(--chart-1)"
          />
        </Panel>
      </div>

      {/* EVALUATION METRICS PANEL 1: Memory Accesses & Effective Access Time (EAT) */}
      <Panel
        title="Evaluation Metric: Memory Accesses & Effective Access Time (EAT)"
        subtitle="Modeled with RAM Access Latency (100 ns) vs Disk Fault Service Latency (10 ms)"
        className="mb-6"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
          {results.map((r) => {
            const isWinner = r === bestPractical;
            const eatNs = r.memoryAccesses?.effectiveAccessTimeNs ?? Math.round((r.hitRatio * 100) + (r.faultRate * 10_000_000));
            const eatMs = (eatNs / 1_000_000).toFixed(3);

            return (
              <div key={r.policy} className={`rounded-xl border p-4 ${isWinner ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/30" : "border-border bg-card"}`}>
                <div className="flex items-center justify-between text-xs font-bold mb-2">
                  <span>{POLICY_LABEL[r.policy]}</span>
                  {isWinner && <span className="text-[10px] text-emerald-600 font-extrabold">Lowest EAT</span>}
                </div>
                <div className="font-mono text-2xl font-black text-foreground">
                  {eatMs} <span className="text-xs font-normal text-muted-foreground">ms</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Effective Access Time
                </div>
                <div className="mt-3 space-y-1 text-xs border-t border-border pt-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">RAM Accesses:</span>
                    <span className="font-mono font-bold text-success">{r.memoryAccesses?.ramAccesses ?? r.hits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Disk Accesses:</span>
                    <span className="font-mono font-bold text-destructive">{r.memoryAccesses?.diskAccesses ?? r.faults}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Exec Speed:</span>
                    <span className="font-mono font-semibold">{r.timeUs ?? (r.timeMs * 1000).toFixed(0)} μs</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>Formula:</strong> Effective Access Time (EAT) = (Hit Ratio × T_RAM) + (Fault Rate × T_Disk), where T_RAM = 100 ns and T_Disk = 10 ms. Algorithms with fewer page faults drastically decrease the effective memory latency.
        </p>
      </Panel>

      {/* EVALUATION METRICS PANEL 2: Algorithm Overhead Comparison */}
      <Panel
        title="Evaluation Metric: Algorithm Overhead Comparison"
        subtitle="Comparing Computational Time Complexity, Kernel Space Metadata, and Hardware Requirements"
        className="mb-6"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2.5">Algorithm</th>
                <th className="p-2.5">Time per Access</th>
                <th className="p-2.5">Time per Fault</th>
                <th className="p-2.5">Space Complexity</th>
                <th className="p-2.5">Kernel Metadata</th>
                <th className="p-2.5">Hardware / OS Requirements</th>
                <th className="p-2.5">Overhead Score</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              {results.map((r) => {
                const ov = r.overhead;
                const isWinner = r === bestPractical;
                return (
                  <tr key={r.policy} className={`border-t border-border ${isWinner ? "bg-emerald-500/5 font-semibold" : ""}`}>
                    <td className="p-2.5 font-sans font-bold text-foreground">
                      {POLICY_LABEL[r.policy]}
                    </td>
                    <td className="p-2.5">{ov?.timeComplexityPerAccess ?? "O(1)"}</td>
                    <td className="p-2.5">{ov?.timeComplexityPerFault ?? "O(1)"}</td>
                    <td className="p-2.5">{ov?.spaceComplexity ?? "O(F)"}</td>
                    <td className="p-2.5">{ov?.metadataBytes ?? 16} bytes</td>
                    <td className="p-2.5 font-sans text-muted-foreground">{ov?.hardwareRequirements ?? "Standard"}</td>
                    <td className="p-2.5 font-sans">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        ov?.overheadScore === "Minimal"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : ov?.overheadScore === "Theoretical Only"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          : "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
                      }`}>
                        {ov?.overheadScore ?? "Low"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Structured Performance Table with Ranks */}
      <Panel title="Comprehensive Performance Scorecard Table" subtitle="Sorted by rank & efficiency" className="mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2.5">Rank</th>
                <th className="p-2.5">Algorithm Policy</th>
                <th className="p-2.5">Page Faults</th>
                <th className="p-2.5">Total Hits</th>
                <th className="p-2.5">Hit Ratio</th>
                <th className="p-2.5">Fault Rate</th>
                <th className="p-2.5">EAT (ms)</th>
                <th className="p-2.5">Exec Time (μs)</th>
                <th className="p-2.5">Performance Verdict</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              {sorted.map((r, idx) => {
                const isWinner = r === bestPractical;
                const isOpt = r.policy === "OPT";

                return (
                  <tr
                    key={r.policy}
                    className={`border-t border-border transition-colors ${
                      isWinner ? "bg-emerald-500/10 font-bold" : "hover:bg-muted/40"
                    }`}
                  >
                    <td className="p-2.5">
                      {isWinner ? "🏆 #1" : isOpt ? "⭐ Bench" : `#${idx + 1}`}
                    </td>
                    <td className="p-2.5 font-sans font-bold text-foreground">
                      {POLICY_LABEL[r.policy]}
                    </td>
                    <td className="p-2.5 text-destructive font-black">{r.faults}</td>
                    <td className="p-2.5 text-success font-black">{r.hits}</td>
                    <td className="p-2.5 font-black text-sky-600">{pct(r.hitRatio)}</td>
                    <td className="p-2.5">{pct(r.faultRate)}</td>
                    <td className="p-2.5 text-amber-600 font-bold">{r.memoryAccesses?.effectiveAccessTimeMs ?? "-"}</td>
                    <td className="p-2.5 font-bold">{r.timeUs ?? (r.timeMs * 1000).toFixed(0)}</td>
                    <td className="p-2.5 font-sans">
                      {isWinner ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                          🏆 Best Practical Choice
                        </span>
                      ) : isOpt ? (
                        <span className="text-sky-600 font-medium">Theoretical Benchmark</span>
                      ) : (
                        <span className="text-muted-foreground">+{r.faults - bestPractical.faults} faults vs best</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Adaptive Analysis Panel */}
      <Panel title="Workload Analysis & Recommendation">
        <p className="mb-2">
          <strong>Best practical policy:</strong> {POLICY_LABEL[bestPractical.policy]} with {bestPractical.faults} faults (
          {bestPractical.faults - opt.faults} more than theoretical Optimal).
        </p>
        <p className="mb-2 text-sm text-muted-foreground">
          Optimal needs future references (Belady's algorithm) so it cannot be implemented in hardware/OS. It acts as the mathematical lower bound.
        </p>
        <p>
          <strong>Adaptive recommendation:</strong> {c.label} workload → {c.recommended === "Trial" ? "trial FIFO and LRU" : c.recommended}. {c.reason}
        </p>
      </Panel>
    </>
  );
}

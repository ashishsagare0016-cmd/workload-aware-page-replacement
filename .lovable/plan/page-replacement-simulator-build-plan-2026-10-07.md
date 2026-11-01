# Page Replacement Simulator — Build Plan

An educational OS simulator comparing FIFO, LRU, Optimal and a Workload-Aware Adaptive policy. Everything runs in the browser on simulated frames; nothing touches real system memory. No login, no backend — recent runs and preferences saved locally.

## Pages (sidebar navigation, active item highlighted)
1. **Dashboard** — title, description, quick actions (New Simulation, Generate Workload, Run Experiment), summary cards (Last Workload, Best Policy, Page Faults, Hit Ratio) with a real empty state.
2. **Simulator** — left: reference string, frames, algorithm picker, Run Selected / Run Comparison / Reset with inline validation. Right: current step, page, frame boxes (hit/fault/replaced highlighting), decision text, playback (play, pause, step back/forward, speed, scrubber), full step-by-step table, metrics (faults, hits, hit ratio, fault rate, references, execution time).
3. **Workload Lab** — five cards (Sequential, Looping, Mixed, Random, Locality-heavy) with description, traits, Generate button; controls for length, page range, frames; send to Simulator.
4. **Algorithm Comparison** — four algorithm cards, bar charts (faults, hit ratio, fault rate, time), performance table, best practical policy, Optimal shown as theoretical benchmark, adaptive recommendation.
5. **Workload Analysis** — extracted features (repetition, locality, sequentiality, unique ratio, working-set size, average reuse distance, frequency distribution, pattern score), classification with confidence, recommended policy and plain explanation of why.
6. **Experiments** — add multiple generated/manual workloads, run all, cross-experiment chart and table, saved history (clear/delete).
7. **About Project** — terminology (page, frame, hit, fault, etc.), how each algorithm works, Optimal caveat, "no real system resources used" note.

## Adaptive policy
Measures workload features, scores them with transparent rules (high sequentiality → FIFO, high locality/repetition → LRU, mixed → quick trial of both and pick better), shows the score breakdown, then actually runs the chosen policy.

## Look and feel
Modern claymorphism: soft off-white cool-gray background, raised cards with soft outer + subtle inner shadows, moderate radius, tactile buttons. Deep navy primary, soft blue secondary, sparing teal accent, muted green/amber/red for hit/warning/fault. Clean sans (Manrope) with JetBrains Mono for strings, frames and tables. Optional dark mode toggle. No gradients, glow or AI imagery.

## Edge cases covered
1 frame, frames > unique pages, single repeated page, empty input, one reference, large strings (table virtual-ish paging), page 0, multi-digit pages, commas/spaces/tabs separators, non-numeric rejection with clear messages.

## Technical details
- Routes: `/`, `/simulator`, `/workload-lab`, `/comparison`, `/analysis`, `/experiments`, `/about`, each with own head metadata; sidebar in `__root.tsx`.
- `src/lib/algorithms/` pure TS: `fifo.ts`, `lru.ts`, `optimal.ts`, `adaptive.ts`, shared `types.ts` returning full step history; `workload/generators.ts`, `workload/analyzer.ts`, `validation.ts`.
- React Context for current simulation + experiments; localStorage read in `useEffect` (hydration-safe).
- Recharts for charts, lucide-react icons, `performance.now()` for timing.
- Vitest unit tests for algorithm correctness on textbook examples (e.g. 7 0 1 2 0 3 0 4 2 3 0 3 2 with 3 frames: FIFO 10, LRU 9, Optimal 7 faults... verified via tests).
- Design tokens in `src/styles.css` (clay shadow utilities), AGENTS.md and memory updated.

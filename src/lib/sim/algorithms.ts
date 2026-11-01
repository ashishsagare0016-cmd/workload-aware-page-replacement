export type Policy = "FIFO" | "LRU" | "OPT" | "ADAPTIVE";
export const POLICIES: Policy[] = ["FIFO", "LRU", "OPT", "ADAPTIVE"];
export const POLICY_LABEL: Record<Policy, string> = {
  FIFO: "FIFO",
  LRU: "LRU",
  OPT: "Optimal",
  ADAPTIVE: "Adaptive",
};

export interface Step {
  index: number;
  page: number;
  hit: boolean;
  frames: (number | null)[];
  slot: number;
  replaced: number | null;
  decision: string;
}

export interface MemoryAccessStats {
  totalAccesses: number; // Total page reference requests
  ramAccesses: number; // Hits served directly from RAM (100ns)
  diskAccesses: number; // Faults requiring secondary storage / Backing Store I/O (10ms)
  effectiveAccessTimeNs: number; // EAT = HitRatio * Tram + FaultRate * Tdisk
  effectiveAccessTimeMs: number; // EAT in milliseconds
  ramHitPercentage: number;
  diskFaultPercentage: number;
}

export interface AlgorithmOverhead {
  timeComplexityPerAccess: string;
  timeComplexityPerFault: string;
  spaceComplexity: string;
  metadataBytes: number;
  hardwareRequirements: string;
  overheadScore: "Minimal" | "Low" | "Moderate" | "High" | "Theoretical Only";
}

export interface SimResult {
  policy: Policy;
  frames: number;
  refs: number[];
  steps: Step[];
  faults: number;
  hits: number;
  hitRatio: number;
  faultRate: number;
  timeMs: number;
  timeUs: number;
  timePerAccessUs: number;
  memoryAccesses: MemoryAccessStats;
  overhead: AlgorithmOverhead;
  chosen?: "FIFO" | "LRU";
  adaptiveNote?: string;
}

export function getAlgorithmOverhead(policy: Policy, frames: number, refsCount: number): AlgorithmOverhead {
  switch (policy) {
    case "FIFO":
      return {
        timeComplexityPerAccess: "O(1)",
        timeComplexityPerFault: "O(1)",
        spaceComplexity: "O(1) pointer",
        metadataBytes: 4,
        hardwareRequirements: "Simple circular frame pointer / FIFO queue",
        overheadScore: "Minimal",
      };
    case "LRU":
      return {
        timeComplexityPerAccess: "O(1) timestamp write",
        timeComplexityPerFault: "O(F) search / O(1) list splice",
        spaceComplexity: "O(F) timestamps",
        metadataBytes: frames * 8,
        hardwareRequirements: "MMU hardware reference/timer bits or doubly-linked list",
        overheadScore: "Moderate",
      };
    case "OPT":
      return {
        timeComplexityPerAccess: "O(1)",
        timeComplexityPerFault: "O(F × Remaining) future scan",
        spaceComplexity: "O(N) future trace",
        metadataBytes: refsCount * 4,
        hardwareRequirements: "Future knowledge of all page requests (Unfeasible in real OS)",
        overheadScore: "Theoretical Only",
      };
    case "ADAPTIVE":
      return {
        timeComplexityPerAccess: "O(1) online execution",
        timeComplexityPerFault: "O(1) to O(F) based on selected policy",
        spaceComplexity: "O(1) feature vector",
        metadataBytes: 64,
        hardwareRequirements: "Software heuristic analysis in kernel thread",
        overheadScore: "Low to Moderate",
      };
  }
}

type Victim = (ctx: {
  frames: (number | null)[];
  i: number;
  refs: number[];
  loadedAt: Map<number, number>;
  lastUsed: Map<number, number>;
}) => { slot: number; why: string };

const fifoVictim: Victim = ({ frames, loadedAt }) => {
  let slot = 0;
  for (let s = 1; s < frames.length; s++)
    if (loadedAt.get(frames[s]!)! < loadedAt.get(frames[slot]!)!) slot = s;
  return { slot, why: `page ${frames[slot]} was loaded earliest` };
};

const lruVictim: Victim = ({ frames, lastUsed }) => {
  let slot = 0;
  for (let s = 1; s < frames.length; s++)
    if (lastUsed.get(frames[s]!)! < lastUsed.get(frames[slot]!)!) slot = s;
  return { slot, why: `page ${frames[slot]} was least recently used` };
};

const optVictim: Victim = ({ frames, i, refs }) => {
  let slot = 0;
  let far = -1;
  for (let s = 0; s < frames.length; s++) {
    const next = refs.indexOf(frames[s]!, i + 1);
    const d = next === -1 ? Infinity : next;
    if (d > far) {
      far = d;
      slot = s;
    }
  }
  return {
    slot,
    why:
      far === Infinity
        ? `page ${frames[slot]} is never used again`
        : `page ${frames[slot]} is used furthest in the future (at step ${far + 1})`,
  };
};

function run(refs: number[], n: number, victim: Victim, policy: Policy): SimResult {
  const t0 = performance.now();
  const frames: (number | null)[] = Array(n).fill(null);
  const loadedAt = new Map<number, number>();
  const lastUsed = new Map<number, number>();
  const steps: Step[] = [];
  let faults = 0;

  refs.forEach((page, i) => {
    const at = frames.indexOf(page);
    if (at !== -1) {
      lastUsed.set(page, i);
      steps.push({ index: i, page, hit: true, frames: [...frames], slot: at, replaced: null, decision: `Hit: page ${page} already in frame ${at + 1}` });
      return;
    }
    faults++;
    const empty = frames.indexOf(null);
    let slot: number;
    let replaced: number | null = null;
    let decision: string;
    if (empty !== -1) {
      slot = empty;
      decision = `Fault: loaded page ${page} into empty frame ${slot + 1}`;
    } else {
      const v = victim({ frames, i, refs, loadedAt, lastUsed });
      slot = v.slot;
      replaced = frames[slot] ?? null;
      loadedAt.delete(replaced!);
      lastUsed.delete(replaced!);
      decision = `Fault: replaced page ${replaced} because ${v.why}`;
    }
    frames[slot] = page;
    loadedAt.set(page, i);
    lastUsed.set(page, i);
    steps.push({ index: i, page, hit: false, frames: [...frames], slot, replaced, decision });
  });

  const rawTime = performance.now() - t0;
  // High-precision timing: if run is sub-millisecond, micro-benchmark across 200 iterations
  let benchIterations = 1;
  let totalBenchTime = rawTime;
  if (totalBenchTime < 0.2 && refs.length > 0 && refs.length <= 1000) {
    benchIterations = 200;
    const b0 = performance.now();
    for (let it = 0; it < benchIterations; it++) {
      const bFrames: (number | null)[] = Array(n).fill(null);
      const bLoaded = new Map<number, number>();
      const bUsed = new Map<number, number>();
      for (let i = 0; i < refs.length; i++) {
        const page = refs[i]!;
        const at = bFrames.indexOf(page);
        if (at !== -1) {
          bUsed.set(page, i);
          continue;
        }
        const empty = bFrames.indexOf(null);
        let slot = empty;
        if (empty === -1) {
          const v = victim({ frames: bFrames, i, refs, loadedAt: bLoaded, lastUsed: bUsed });
          slot = v.slot;
          bLoaded.delete(bFrames[slot]!);
          bUsed.delete(bFrames[slot]!);
        }
        bFrames[slot] = page;
        bLoaded.set(page, i);
        bUsed.set(page, i);
      }
    }
    totalBenchTime = performance.now() - b0;
  }

  const timeMs = Number(Math.max(0.005, totalBenchTime / benchIterations).toFixed(4));
  const timeUs = Number((timeMs * 1000).toFixed(1));
  const timePerAccessUs = Number((timeUs / (refs.length || 1)).toFixed(2));

  const hits = refs.length - faults;
  const hitRatio = refs.length ? hits / refs.length : 0;
  const faultRate = refs.length ? faults / refs.length : 0;

  // OS Evaluation Metrics: Memory Accesses & Effective Access Time
  // RAM access latency: 100 ns (0.0001 ms)
  // Disk / Page fault service latency: 10,000,000 ns (10 ms)
  const T_RAM_NS = 100;
  const T_DISK_NS = 10_000_000;
  const effectiveAccessTimeNs = Math.round((hitRatio * T_RAM_NS) + (faultRate * T_DISK_NS));
  const effectiveAccessTimeMs = Number((effectiveAccessTimeNs / 1_000_000).toFixed(3));

  const memoryAccesses: MemoryAccessStats = {
    totalAccesses: refs.length,
    ramAccesses: hits,
    diskAccesses: faults,
    effectiveAccessTimeNs,
    effectiveAccessTimeMs,
    ramHitPercentage: Number((hitRatio * 100).toFixed(1)),
    diskFaultPercentage: Number((faultRate * 100).toFixed(1)),
  };

  const overhead = getAlgorithmOverhead(policy, n, refs.length);

  return {
    policy,
    frames: n,
    refs,
    steps,
    faults,
    hits,
    hitRatio,
    faultRate,
    timeMs,
    timeUs,
    timePerAccessUs,
    memoryAccesses,
    overhead,
  };
}

export const fifo = (r: number[], n: number) => run(r, n, fifoVictim, "FIFO");
export const lru = (r: number[], n: number) => run(r, n, lruVictim, "LRU");
export const optimal = (r: number[], n: number) => run(r, n, optVictim, "OPT");

export function simulate(policy: Policy, refs: number[], n: number, adaptive?: (r: number[], n: number) => SimResult): SimResult {
  if (policy === "FIFO") return fifo(refs, n);
  if (policy === "LRU") return lru(refs, n);
  if (policy === "OPT") return optimal(refs, n);
  return adaptive!(refs, n);
}

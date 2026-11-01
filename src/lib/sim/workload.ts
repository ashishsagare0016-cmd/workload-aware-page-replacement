import { fifo, lru, simulate as baseSim, type Policy, type SimResult, getAlgorithmOverhead } from "./algorithms";

export type WorkloadKind = "Sequential" | "Looping" | "Mixed" | "Random" | "Locality";

export const WORKLOADS: { kind: WorkloadKind; description: string; traits: string[] }[] = [
  { kind: "Sequential", description: "Pages are accessed in increasing order, like scanning a file.", traits: ["High sequentiality", "Low reuse", "Streaming"] },
  { kind: "Looping", description: "A fixed group of pages is accessed again and again in the same order.", traits: ["Periodic", "Fixed working set", "Predictable"] },
  { kind: "Mixed", description: "Alternates between sequential scans and focused reuse phases.", traits: ["Phase changes", "Moderate locality", "Varied"] },
  { kind: "Random", description: "Every page is equally likely at each step.", traits: ["No pattern", "High unique ratio", "Worst case"] },
  { kind: "Locality", description: "A small hot set of pages receives most accesses.", traits: ["Strong locality", "High repetition", "Small working set"] },
];

const rnd = (n: number) => Math.floor(Math.random() * n);

export function generate(kind: WorkloadKind, length: number, range: number): number[] {
  const out: number[] = [];
  const R = Math.max(1, range);
  if (kind === "Sequential") for (let i = 0; i < length; i++) out.push(i % R);
  else if (kind === "Looping") {
    const k = Math.max(2, Math.min(R, Math.round(R / 2)));
    for (let i = 0; i < length; i++) out.push(i % k);
  } else if (kind === "Random") for (let i = 0; i < length; i++) out.push(rnd(R));
  else if (kind === "Locality") {
    const hot: number[] = Array.from({ length: Math.max(1, Math.min(3, R)) }, () => rnd(R));
    for (let i = 0; i < length; i++) out.push(Math.random() < 0.8 ? (hot[rnd(hot.length)] ?? 0) : rnd(R));
  } else {
    let i = 0;
    while (out.length < length) {
      const phase = Math.floor(i / 8) % 2;
      if (phase === 0) out.push(i % R);
      else out.push(rnd(Math.max(1, Math.min(3, R))));
      i++;
    }
  }
  return out;
}

export interface Features {
  length: number;
  unique: number;
  uniqueRatio: number;
  repetition: number;
  sequentiality: number;
  locality: number;
  workingSet: number;
  avgReuseDistance: number;
  frequency: { page: number; count: number }[];
  patternScore: number;
}

export function analyze(refs: number[], frames = 3): Features {
  const n = refs.length;
  const unique = new Set(refs).size;
  let seq = 0;
  for (let i = 1; i < n; i++) if (refs[i] === refs[i - 1]! + 1) seq++;
  const last = new Map<number, number>();
  let reuseSum = 0,
    reuseCount = 0,
    local = 0;
  const w = Math.max(2, frames * 2);
  refs.forEach((p, i) => {
    if (last.has(p)) {
      const d = i - last.get(p)!;
      reuseSum += d;
      reuseCount++;
      if (d <= w) local++;
    }
    last.set(p, i);
  });
  let wsSum = 0,
    wsCnt = 0;
  for (let i = 0; i + 10 <= n; i++) {
    wsSum += new Set(refs.slice(i, i + 10)).size;
    wsCnt++;
  }
  const counts = new Map<number, number>();
  refs.forEach((p) => counts.set(p, (counts.get(p) ?? 0) + 1));
  const frequency = [...counts.entries()].map(([page, count]) => ({ page, count })).sort((a, b) => b.count - a.count);
  const sequentiality = n > 1 ? seq / (n - 1) : 0;
  const locality = n ? local / n : 0;
  const uniqueRatio = n ? unique / n : 0;
  return {
    length: n,
    unique,
    uniqueRatio,
    repetition: 1 - uniqueRatio,
    sequentiality,
    locality,
    workingSet: wsCnt ? wsSum / wsCnt : unique,
    avgReuseDistance: reuseCount ? reuseSum / reuseCount : 0,
    frequency,
    patternScore: Math.max(sequentiality, locality),
  };
}

export interface Classification {
  label: "Sequential" | "Locality-heavy" | "Mixed";
  confidence: number;
  recommended: "FIFO" | "LRU" | "Trial";
  scores: { fifo: number; lru: number };
  reason: string;
}

export function classify(f: Features): Classification {
  const fifoScore = f.sequentiality * 0.7 + f.uniqueRatio * 0.3;
  const lruScore = f.locality * 0.6 + f.repetition * 0.4;
  const margin = Math.abs(fifoScore - lruScore);
  if (f.sequentiality > 0.5 && fifoScore > lruScore)
    return { label: "Sequential", confidence: Math.min(0.99, 0.5 + margin), recommended: "FIFO", scores: { fifo: fifoScore, lru: lruScore }, reason: "Pages arrive mostly in order and are rarely reused soon, so recency adds little; FIFO is simple and equally effective." };
  if (lruScore > fifoScore && f.locality > 0.45)
    return { label: "Locality-heavy", confidence: Math.min(0.99, 0.5 + margin), recommended: "LRU", scores: { fifo: fifoScore, lru: lruScore }, reason: "Recently used pages tend to be used again soon, so keeping the most recent pages (LRU) avoids faults." };
  return { label: "Mixed", confidence: Math.max(0.3, 0.5 - margin), recommended: "Trial", scores: { fifo: fifoScore, lru: lruScore }, reason: "No single pattern dominates, so the adaptive policy trials FIFO and LRU on the string and keeps whichever faults less." };
}

export function adaptive(refs: number[], n: number): SimResult {
  const t0 = performance.now();
  const c = classify(analyze(refs, n));
  let res: SimResult;
  let chosen: "FIFO" | "LRU";
  if (c.recommended === "FIFO") {
    res = fifo(refs, n);
    chosen = "FIFO";
  } else if (c.recommended === "LRU") {
    res = lru(refs, n);
    chosen = "LRU";
  } else {
    const a = fifo(refs, n),
      b = lru(refs, n);
    res = b.faults <= a.faults ? b : a;
    chosen = b.faults <= a.faults ? "LRU" : "FIFO";
  }
  const timeMs = Number(Math.max(0.015, performance.now() - t0).toFixed(4));
  const timeUs = Number((timeMs * 1000).toFixed(1));
  const timePerAccessUs = Number((timeUs / (refs.length || 1)).toFixed(2));
  const overhead = getAlgorithmOverhead("ADAPTIVE", n, refs.length);

  return {
    ...res,
    policy: "ADAPTIVE",
    chosen,
    adaptiveNote: `Classified as ${c.label} (FIFO score ${c.scores.fifo.toFixed(2)}, LRU score ${c.scores.lru.toFixed(2)}) → used ${chosen}.`,
    timeMs,
    timeUs,
    timePerAccessUs,
    overhead,
  };
}

export const simulate = (p: Policy, refs: number[], n: number) => baseSim(p, refs, n, adaptive);

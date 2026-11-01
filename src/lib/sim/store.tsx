import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Policy, SimResult } from "./algorithms";

export interface Experiment {
  id: string;
  name: string;
  refs: number[];
  frames: number;
  results?: { policy: Policy; faults: number; hitRatio: number; timeMs: number }[];
}

interface Store {
  refText: string;
  setRefText: (s: string) => void;
  frames: number;
  setFrames: (n: number) => void;
  workloadName: string;
  setWorkloadName: (s: string) => void;
  last: SimResult[];
  setLast: (r: SimResult[]) => void;
  ready: boolean;
  experiments: Experiment[];
  setExperiments: (e: Experiment[] | ((p: Experiment[]) => Experiment[])) => void;
}

const Ctx = createContext<Store | null>(null);
const KEY = "prs-state-v1";

export function SimProvider({ children }: { children: ReactNode }) {
  const [refText, setRefText] = useState("7 0 1 2 0 3 0 4 2 3 0 3 2");
  const [frames, setFrames] = useState(3);
  const [workloadName, setWorkloadName] = useState("Manual");
  const [last, setLast] = useState<SimResult[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) ?? "null");
      if (s) {
        if (s.refText) setRefText(s.refText);
        if (s.frames) setFrames(s.frames);
        if (s.workloadName) setWorkloadName(s.workloadName);
        if (s.experiments) setExperiments(s.experiments);
        if (s.last) setLast(s.last);
      }
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const slim = last.map((r) => ({ ...r, steps: r.steps.length > 500 ? [] : r.steps }));
    localStorage.setItem(KEY, JSON.stringify({ refText, frames, workloadName, experiments, last: slim }));
  }, [loaded, refText, frames, workloadName, experiments, last]);

  return (
    <Ctx.Provider value={{ refText, setRefText, frames, setFrames, workloadName, setWorkloadName, last, setLast, ready: loaded, experiments, setExperiments }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSim() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSim outside provider");
  return c;
}

import { Info } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel } from "@/components/ui-kit";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Page Replacement Simulator" },
      { name: "description", content: "Key terms and how FIFO, LRU, Optimal and adaptive page replacement work." },
      { property: "og:title", content: "About — Page Replacement Simulator" },
      { property: "og:description", content: "Key terms and how FIFO, LRU, Optimal and adaptive page replacement work." },
    ],
  }),
  component: About,
});

const TERMS = [
  ["Page", "A fixed-size block of a program's memory."],
  ["Frame", "A slot in physical memory that can hold one page."],
  ["Reference string", "The sequence of pages a program accesses."],
  ["Hit", "The requested page is already in a frame."],
  ["Page fault", "The page is not in memory and must be loaded, possibly evicting another."],
  ["Hit ratio", "Hits divided by total references."],
  ["Locality", "The tendency to reuse recently accessed pages."],
  ["Working set", "The pages a program actively uses over a short window."],
];

const ALGOS = [
  ["FIFO", "Evicts the page that has been in memory longest. Simple, but ignores how often pages are used."],
  ["LRU", "Evicts the page that hasn't been used for the longest time. Works well when recent pages are reused."],
  ["Optimal", "Evicts the page whose next use is furthest in the future. It gives the fewest possible faults but needs knowledge of the future, so it's a theoretical benchmark only."],
  ["Adaptive", "Measures the workload's sequentiality, locality and repetition, scores FIFO and LRU with transparent rules, and runs the better fit. For mixed workloads it trials both and keeps the winner."],
];

function About() {
  return (
    <>
      <PageHeader eyebrow="Learn" icon={Info} title="About this project" description="An educational simulator for operating system page replacement policies." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Terminology">
          <dl className="space-y-3">{TERMS.map(([t, d]) => <div key={t}><dt className="font-semibold">{t}</dt><dd className="text-sm text-muted-foreground">{d}</dd></div>)}</dl>
        </Panel>
        <Panel title="Algorithms">
          <dl className="space-y-3">{ALGOS.map(([t, d]) => <div key={t}><dt className="font-semibold">{t}</dt><dd className="text-sm text-muted-foreground">{d}</dd></div>)}</dl>
        </Panel>
      </div>
      <Panel className="mt-6"><p className="text-sm">This simulator runs entirely in your browser on simulated frames. It does not read, allocate or modify any real system memory.</p></Panel>
    </>
  );
}

import { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HardDrive,
  Cpu,
  Layers,
  Search,
  Zap,
  ArrowRight,
  ShieldAlert,
  Server,
  Database,
} from "lucide-react";

interface PageFaultDiagramProps {
  page?: number | string;
  frameIndex?: number;
  interactive?: boolean;
  isHit?: boolean;
  hideControls?: boolean;
  activeFrames?: (number | null)[];
}

export function PageFaultDiagram({
  page: initialPage = 4,
  frameIndex = 0,
  interactive = true,
  isHit = false,
  hideControls = false,
  activeFrames,
}: PageFaultDiagramProps) {
  // Input page to load directly from reference string
  const targetPage = Number(initialPage) ?? 4;

  // Backing store disk storage list of pages (automatically includes valid workload pages)
  const [diskPages, setDiskPages] = useState<number[]>([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const [isSearchingDisk, setIsSearchingDisk] = useState<boolean>(false);

  // Active arrow step: 1 = reference, 2 = trap, 3 = check backing store, 4 = bring in missing page, 5 = reset table, 6 = restart instruction
  const [currentStep, setCurrentStep] = useState<number>(isHit ? 6 : 1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1800);

  // State of page table bit and physical memory
  const [tableBit, setTableBit] = useState<"i" | "v">(isHit ? "v" : "i");
  const [loadedInFrame, setLoadedInFrame] = useState<boolean>(Boolean(isHit));

  // Sync state whenever page or isHit changes from the parent reference string simulation
  useEffect(() => {
    setCurrentStep(isHit ? 6 : 1);
    setTableBit(isHit ? "v" : "i");
    setLoadedInFrame(Boolean(isHit));
    setIsSearchingDisk(false);
    setIsPlaying(false);
  }, [initialPage, isHit, frameIndex]);

  // Check if current target page exists in backing store
  const isPresentInBackingStore = diskPages.includes(targetPage);

  // Reset simulation states
  const resetSimulation = (p = targetPage, hit = isHit) => {
    setCurrentStep(1);
    setTableBit(hit ? "v" : "i");
    setLoadedInFrame(Boolean(hit));
    setIsSearchingDisk(false);
    setIsPlaying(false);
  };

  // Step advancement logic
  const advanceStep = () => {
    if (currentStep === 1) {
      // 1 -> 2: MMU detects invalid bit 'i' -> Trap to OS
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // 2 -> 3: OS goes to Backing Store to check if page is there
      setCurrentStep(3);
      setIsSearchingDisk(true);
    } else if (currentStep === 3) {
      // 3 -> 4: If page is in backing store -> Bring in missing page to free frame
      setIsSearchingDisk(false);
      if (isPresentInBackingStore) {
        setCurrentStep(4);
        setLoadedInFrame(true);
      } else {
        // Page NOT in backing store -> Segmentation fault
        setIsPlaying(false);
      }
    } else if (currentStep === 4) {
      // 4 -> 5: Reset page table (flip i -> v)
      setCurrentStep(5);
      setTableBit("v");
    } else if (currentStep === 5) {
      // 5 -> 6: Restart instruction
      setCurrentStep(6);
    } else if (currentStep === 6) {
      // Completed, loop back or stop
      setIsPlaying(false);
    }
  };

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setTimeout(() => {
      if (currentStep < 6) {
        advanceStep();
      } else {
        setIsPlaying(false);
      }
    }, speed);
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, speed, isPresentInBackingStore]);

  // Step explanations matching OS concepts
  const stepInfo: Record<
    number,
    { title: string; arrow: string; desc: string; status: string; statusType: "info" | "warn" | "error" | "success" }
  > = {
    1: {
      title: "Step 1: Reference (load M)",
      arrow: "Arrow ①: CPU → Page Table",
      desc: `CPU executes 'load ${targetPage}'. MMU references the Page Table. The Valid/Invalid bit is set to 'i' (invalid) — Page ${targetPage} is NOT in RAM!`,
      status: `Page Table check: Bit is 'i' (Page Fault Triggered)`,
      statusType: "warn",
    },
    2: {
      title: "Step 2: Trap to OS",
      arrow: "Arrow ②: Page Table → Operating System",
      desc: `Because the bit is 'i', the hardware MMU halts execution and triggers a hardware Trap (Page Fault Interrupt) to the Operating System. CPU switches to Kernel Mode.`,
      status: `OS Kernel Trap Handler invoked`,
      statusType: "warn",
    },
    3: {
      title: "Step 3: Page is on Backing Store",
      arrow: "Arrow ③: Operating System → Backing Store (Disk)",
      desc: `The OS checks the Backing Store (Disk / Swap storage) to verify if Page ${targetPage} is present on secondary storage.`,
      status: isPresentInBackingStore
        ? `✓ Page ${targetPage} is PRESENT on Backing Store (Block #0x${(targetPage * 128 + 40).toString(16).toUpperCase()})`
        : `✗ Page ${targetPage} is NOT in Backing Store! (Invalid reference / Segmentation Fault)`,
      statusType: isPresentInBackingStore ? "success" : "error",
    },
    4: {
      title: "Step 4: Bring in Missing Page",
      arrow: "Arrow ④: Backing Store → Physical Memory (Free Frame)",
      desc: `OS disk controller reads Page ${targetPage} from Backing Store and transfers it into an available free frame in Physical Memory.`,
      status: `Page ${targetPage} copied into Free Frame in RAM`,
      statusType: "success",
    },
    5: {
      title: "Step 5: Reset Page Table",
      arrow: "Arrow ⑤: Free Frame → Page Table",
      desc: `Disk I/O completes. The OS updates the Page Table entry for Page ${targetPage}: sets frame pointer and flips the bit from 'i' (invalid) to 'v' (valid).`,
      status: `Page Table entry updated: Bit flipped from 'i' → 'v' (Valid)`,
      statusType: "success",
    },
    6: {
      title: "Step 6: Restart Instruction",
      arrow: "Arrow ⑥: Page Table → CPU (load M)",
      desc: `The OS restores process state and restarts the trapped instruction 'load ${targetPage}'. The MMU references the Page Table, sees 'v', and accesses RAM with zero fault!`,
      status: `Instruction completed successfully (RAM Hit)`,
      statusType: "success",
    },
  };

  const active = stepInfo[currentStep] || stepInfo[1];

  return (
    <div className="w-full rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-card p-4 md:p-6 shadow-lg">
      {/* Simulation Header: Streamlined for Main Simulator & Reference String */}
      {hideControls ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white font-mono text-lg font-black shadow-md">
              {targetPage}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm md:text-base font-extrabold text-foreground">
                  Reference String Instruction: <span className="font-mono text-sky-600 dark:text-sky-400">load {targetPage}</span>
                </span>
                <span
                  className={`rounded-full px-3 py-0.5 text-xs font-black tracking-wider border ${
                    isHit
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-400"
                      : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-400"
                  }`}
                >
                  {isHit ? "CACHE HIT" : "PAGE FAULT"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isHit
                  ? `Page ${targetPage} is present in RAM Frame F${(frameIndex ?? 0) + 1}. Hardware MMU resolves address with 0 disk I/O.`
                  : `Page ${targetPage} is NOT in RAM. Triggers 6-step cycle: Trap → Backing Store Search → Free Frame Allocation.`}
              </p>
            </div>
          </div>

          {/* Step Badges for Diagram Arrows 1 to 6 */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-muted p-1.5 rounded-xl text-xs">
            <span className="text-[11px] font-bold text-muted-foreground px-1 uppercase">Cycle Step:</span>
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <button
                key={s}
                onClick={() => setCurrentStep(s)}
                className={`flex h-7 w-7 items-center justify-center rounded-lg font-mono text-xs font-bold transition-all ${
                  currentStep === s
                    ? "bg-sky-600 text-white shadow-md ring-2 ring-sky-300 scale-105"
                    : isHit
                    ? "bg-card text-muted-foreground opacity-60"
                    : currentStep > s
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-400/40"
                    : "bg-card text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                }`}
                title={`Arrow ${s}: ${stepInfo[s]?.title}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Standalone Header with Controls (when used in isolation) */
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b-2 border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                Page Fault Routine Simulation
              </h2>
              <span className="rounded-full bg-sky-100 dark:bg-sky-950 border border-sky-400 px-3 py-0.5 font-mono text-xs font-bold text-sky-700 dark:text-sky-300">
                load {targetPage}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Exact animated execution of the 6-step diagram with Backing Store search
            </p>
          </div>

          {/* Stepper controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                if (currentStep >= 6) resetSimulation();
                setIsPlaying(!isPlaying);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-1.5 text-xs font-bold shadow transition-transform active:scale-95"
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {isPlaying ? "Pause" : "Play Simulation"}
            </button>

            <button
              onClick={advanceStep}
              disabled={currentStep >= 6}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-muted px-3 py-1.5 text-xs font-bold shadow-sm disabled:opacity-40 transition-colors"
            >
              Next Step <SkipForward className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => resetSimulation()}
              className="rounded-xl border border-slate-300 dark:border-slate-700 p-2 hover:bg-slate-100 dark:hover:bg-muted text-muted-foreground"
              title="Reset simulation"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* SVG Canvas with Animated Arrows and Diagram Elements */}
      <div className="relative w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-4 md:p-6 shadow-inner">
        <svg
          viewBox="0 0 940 560"
          className="mx-auto w-full select-none"
          style={{ minWidth: "820px", maxWidth: "940px" }}
        >
          <defs>
            {/* Standard Black Marker Arrow */}
            <marker
              id="pf-arrow-black"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#0f172a" />
            </marker>

            {/* Glowing Active Blue Marker Arrow */}
            <marker
              id="pf-arrow-active"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="8"
              markerHeight="8"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#0284c7" />
            </marker>

            {/* Pulse Glow Filter */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Backing Store Cylinder Gradient */}
            <linearGradient id="cylinderGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#bae6fd" />
              <stop offset="35%" stopColor="#e0f2fe" />
              <stop offset="70%" stopColor="#bae6fd" />
              <stop offset="100%" stopColor="#7dd3fc" />
            </linearGradient>
            <linearGradient id="cylinderTopGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e0f2fe" />
              <stop offset="100%" stopColor="#bae6fd" />
            </linearGradient>
          </defs>

          {/* ============================================================== */}
          {/* 1. LEFT: PROCESS & `load M`                                    */}
          {/* ============================================================== */}
          <line x1="80" y1="210" x2="80" y2="470" stroke="#0f172a" strokeWidth="2" />
          <line x1="150" y1="210" x2="150" y2="470" stroke="#0f172a" strokeWidth="2" />

          {/* `load M` block */}
          <rect
            x="80"
            y="265"
            width="70"
            height="70"
            fill={currentStep === 1 || currentStep === 6 ? "#e0f2fe" : "#ffffff"}
            stroke={currentStep === 1 || currentStep === 6 ? "#0284c7" : "#0f172a"}
            strokeWidth={currentStep === 1 || currentStep === 6 ? "3" : "2"}
            className="transition-colors duration-300"
          />
          <text
            x="115"
            y="308"
            textAnchor="middle"
            className="font-mono text-[15px] font-bold fill-slate-900"
          >
            load {targetPage}
          </text>

          {/* Instruction status tag */}
          <text
            x="115"
            y="325"
            textAnchor="middle"
            className="font-sans text-[10px] font-semibold fill-slate-500"
          >
            {currentStep === 6 ? "✓ HIT / RESTARTED" : currentStep === 1 ? "EXECUTE" : "WAITING"}
          </text>

          {/* ============================================================== */}
          {/* 2. TOP CENTER: OPERATING SYSTEM                                */}
          {/* ============================================================== */}
          <rect
            x="375"
            y="45"
            width="75"
            height="70"
            fill={currentStep === 2 || currentStep === 3 ? "#e0f2fe" : "#ffffff"}
            stroke={currentStep === 2 || currentStep === 3 ? "#0284c7" : "#0f172a"}
            strokeWidth={currentStep === 2 || currentStep === 3 ? "3" : "2"}
            className="transition-colors duration-300"
          />
          <text
            x="412"
            y="132"
            textAnchor="middle"
            className="text-[13px] font-sans font-medium fill-slate-900"
          >
            operating
          </text>
          <text
            x="412"
            y="148"
            textAnchor="middle"
            className="text-[13px] font-sans font-medium fill-slate-900"
          >
            system
          </text>

          {/* OS mode indicator */}
          <rect
            x="385"
            y="55"
            width="55"
            height="18"
            rx="4"
            fill={currentStep >= 2 && currentStep <= 5 ? "#fed7aa" : "#e2e8f0"}
          />
          <text
            x="412"
            y="68"
            textAnchor="middle"
            className="text-[9px] font-bold font-mono fill-slate-800"
          >
            {currentStep >= 2 && currentStep <= 5 ? "KERNEL" : "USER"}
          </text>

          {/* ============================================================== */}
          {/* 3. CENTER: PAGE TABLE                                          */}
          {/* ============================================================== */}
          <rect
            x="440"
            y="265"
            width="70"
            height="70"
            fill="#ffffff"
            stroke={currentStep === 1 || currentStep === 5 ? "#0284c7" : "#0f172a"}
            strokeWidth={currentStep === 1 || currentStep === 5 ? "3" : "2"}
            className="transition-colors duration-300"
          />
          {/* Row dividers */}
          <line x1="440" y1="285" x2="510" y2="285" stroke="#0f172a" strokeWidth="1.5" />
          <line x1="440" y1="312" x2="510" y2="312" stroke="#0f172a" strokeWidth="1.5" />

          {/* Entry row highlighting */}
          <rect
            x="440"
            y="285"
            width="70"
            height="27"
            fill={tableBit === "v" ? "#dcfce7" : "#cbd5e1"}
            className="transition-colors duration-500"
          />
          {/* Frame/Bit divider */}
          <line x1="485" y1="285" x2="485" y2="312" stroke="#0f172a" strokeWidth="1.5" />

          {/* Frame slot text inside page table */}
          <text
            x="462"
            y="303"
            textAnchor="middle"
            className="font-mono text-[11px] font-bold fill-slate-700"
          >
            {tableBit === "v" ? `F#${frameIndex + 1}` : "—"}
          </text>

          {/* Valid/Invalid bit */}
          <text
            x="497"
            y="304"
            textAnchor="middle"
            className={`font-mono text-[14px] font-black transition-colors ${
              tableBit === "v" ? "fill-emerald-600 animate-bounce" : "fill-rose-700"
            }`}
          >
            {tableBit}
          </text>

          {/* Label below page table */}
          <text
            x="475"
            y="355"
            textAnchor="middle"
            className="text-[13px] font-sans font-medium fill-slate-900"
          >
            page table
          </text>

          {/* ============================================================== */}
          {/* 4. BOTTOM CENTER: PHYSICAL MEMORY                              */}
          {/* ============================================================== */}
          {/* Physical Memory Outer Container */}
          <rect
            x="550"
            y="310"
            width="82"
            height="180"
            fill="#ffffff"
            stroke={currentStep === 4 ? "#0284c7" : "#0f172a"}
            strokeWidth={currentStep === 4 ? "3" : "2"}
            className="transition-colors duration-300"
          />

          {activeFrames && activeFrames.length > 0 ? (
            /* DYNAMIC FRAMES FROM REFERENCE STRING SIMULATION */
            activeFrames.map((val, idx) => {
              const count = activeFrames.length;
              const slotH = 180 / count;
              const slotY = 310 + idx * slotH;
              const isActiveSlot = idx === frameIndex;
              const isAllocated = isActiveSlot && (isHit || currentStep >= 4);
              const displayVal = isAllocated ? targetPage : val;

              return (
                <g key={idx}>
                  <rect
                    x="550"
                    y={slotY}
                    width="82"
                    height={slotH}
                    fill={
                      isAllocated
                        ? "#dcfce7"
                        : isActiveSlot && !isHit && currentStep < 4
                        ? "#fee2e2"
                        : displayVal !== null && displayVal !== undefined
                        ? "#f8fafc"
                        : "#ffffff"
                    }
                    stroke={isActiveSlot ? (isHit || currentStep >= 4 ? "#16a34a" : "#dc2626") : "none"}
                    strokeWidth={isActiveSlot ? "2" : "0"}
                    className="transition-colors duration-500"
                  />
                  {idx < count - 1 && (
                    <line x1="550" y1={slotY + slotH} x2="632" y2={slotY + slotH} stroke="#0f172a" strokeWidth="1.5" />
                  )}
                  {/* Frame ID badge */}
                  <text x="556" y={slotY + 12} className="font-mono text-[9px] font-bold fill-slate-400">
                    F{idx + 1}
                  </text>
                  {/* Page contents in slot */}
                  <text
                    x="591"
                    y={slotY + slotH / 2 + 4}
                    textAnchor="middle"
                    className={`font-sans text-[11px] font-bold ${
                      isAllocated ? "fill-emerald-800" : displayVal !== null && displayVal !== undefined ? "fill-slate-800" : "fill-slate-400 italic"
                    }`}
                  >
                    {displayVal !== null && displayVal !== undefined ? `Page ${displayVal}` : "free frame"}
                  </text>
                </g>
              );
            })
          ) : (
            /* Standard Textbook Slots */
            <>
              <line x1="550" y1="340" x2="632" y2="340" stroke="#0f172a" strokeWidth="1.5" />
              <line x1="550" y1="370" x2="632" y2="370" stroke="#0f172a" strokeWidth="1.5" />
              <line x1="550" y1="400" x2="632" y2="400" stroke="#0f172a" strokeWidth="1.5" />
              <line x1="550" y1="430" x2="632" y2="430" stroke="#0f172a" strokeWidth="1.5" />
              <line x1="550" y1="460" x2="632" y2="460" stroke="#0f172a" strokeWidth="1.5" />

              {/* Free frame slot (Slot 3) */}
              <rect
                x="550"
                y="370"
                width="82"
                height="30"
                fill={loadedInFrame ? "#dcfce7" : "#ffffff"}
                stroke={currentStep === 4 ? "#16a34a" : "none"}
                strokeWidth="2"
                className="transition-colors duration-500"
              />
              <text
                x="591"
                y="390"
                textAnchor="middle"
                className={`font-sans text-[11px] font-bold ${
                  loadedInFrame ? "fill-emerald-800" : "fill-slate-900"
                }`}
              >
                {loadedInFrame ? `Page ${targetPage}` : "free frame"}
              </text>
            </>
          )}

          {/* Label below Physical Memory */}
          <text
            x="591"
            y="510"
            textAnchor="middle"
            className="text-[13px] font-sans font-medium fill-slate-900"
          >
            physical
          </text>
          <text
            x="591"
            y="525"
            textAnchor="middle"
            className="text-[13px] font-sans font-medium fill-slate-900"
          >
            memory
          </text>

          {/* ============================================================== */}
          {/* 5. RIGHT: BACKING STORE (DISK CYLINDER)                        */}
          {/* ============================================================== */}
          <g>
            {/* Cylinder body */}
            <path
              d="M 700 160 L 700 460 A 80 30 0 0 0 860 460 L 860 160 Z"
              fill="url(#cylinderGradient)"
              stroke={currentStep === 3 || currentStep === 4 ? "#0284c7" : "#0f172a"}
              strokeWidth={currentStep === 3 || currentStep === 4 ? "3" : "2"}
              className="transition-colors duration-300"
            />
            {/* Top ellipse */}
            <ellipse
              cx="780"
              cy="160"
              rx="80"
              ry="30"
              fill="url(#cylinderTopGrad)"
              stroke={currentStep === 3 || currentStep === 4 ? "#0284c7" : "#0f172a"}
              strokeWidth={currentStep === 3 || currentStep === 4 ? "3" : "2"}
            />

            {/* Backing store header tag */}
            <text
              x="780"
              y="165"
              textAnchor="middle"
              className="text-[10px] font-mono font-bold fill-slate-700 uppercase"
            >
              Disk Storage
            </text>

            {/* Target Page block inside cylinder */}
            <rect
              x="765"
              y="265"
              width="32"
              height="32"
              fill={isPresentInBackingStore ? "#ffffff" : "#fee2e2"}
              stroke={currentStep === 3 || currentStep === 4 ? "#0284c7" : "#0f172a"}
              strokeWidth={currentStep === 3 || currentStep === 4 ? "3" : "2"}
              className="transition-all duration-300"
            />
            <text
              x="781"
              y="286"
              textAnchor="middle"
              className="font-mono text-[14px] font-black fill-slate-900"
            >
              {isPresentInBackingStore ? targetPage : "?"}
            </text>

            {/* Page search status badge on disk */}
            {currentStep === 3 && (
              <g>
                <rect
                  x="720"
                  y="320"
                  width="120"
                  height="26"
                  rx="6"
                  fill={isPresentInBackingStore ? "#16a34a" : "#dc2626"}
                  filter="url(#glow)"
                />
                <text
                  x="780"
                  y="337"
                  textAnchor="middle"
                  className="font-sans text-[11px] font-bold fill-white"
                >
                  {isPresentInBackingStore ? "✓ FOUND ON DISK" : "✗ NOT ON DISK"}
                </text>
              </g>
            )}
          </g>

          {/* ============================================================== */}
          {/* 6. THE 6 CONNECTING ARROWS WITH MOVING PARTICLES               */}
          {/* ============================================================== */}

          {/* --- ARROW 1: reference --- */}
          <g className={`transition-opacity duration-300 ${currentStep === 1 ? "opacity-100" : "opacity-35"}`}>
            <path
              id="path-arrow-1"
              d="M 150 285 L 360 285 L 440 298"
              fill="none"
              stroke={currentStep === 1 ? "#0284c7" : "#0f172a"}
              strokeWidth={currentStep === 1 ? "3.5" : "1.8"}
              markerEnd={currentStep === 1 ? "url(#pf-arrow-active)" : "url(#pf-arrow-black)"}
            />
            {/* Animated packet on Arrow 1 */}
            {currentStep === 1 && (
              <circle r="5" fill="#0284c7" filter="url(#glow)">
                <animateMotion dur="1.2s" repeatCount="indefinite" path="M 150 285 L 360 285 L 440 298" />
              </circle>
            )}
            <circle cx="280" cy="165" r="13" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
            <text x="280" y="170" textAnchor="middle" className="font-sans text-[13px] font-black fill-sky-600">
              1
            </text>
            <text x="280" y="186" textAnchor="middle" className="text-[12px] font-sans font-medium fill-slate-800">
              reference
            </text>
          </g>

          {/* --- ARROW 2: trap --- */}
          <g className={`transition-opacity duration-300 ${currentStep === 2 ? "opacity-100" : "opacity-35"}`}>
            <path
              id="path-arrow-2"
              d="M 510 298 L 536 298 L 536 115 L 450 115"
              fill="none"
              stroke={currentStep === 2 ? "#0284c7" : "#0f172a"}
              strokeWidth={currentStep === 2 ? "3.5" : "1.8"}
              markerEnd={currentStep === 2 ? "url(#pf-arrow-active)" : "url(#pf-arrow-black)"}
            />
            {/* Animated packet on Arrow 2 */}
            {currentStep === 2 && (
              <circle r="5" fill="#0284c7" filter="url(#glow)">
                <animateMotion dur="1.2s" repeatCount="indefinite" path="M 510 298 L 536 298 L 536 115 L 450 115" />
              </circle>
            )}
            <circle cx="560" cy="205" r="13" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
            <text x="560" y="210" textAnchor="middle" className="font-sans text-[13px] font-black fill-sky-600">
              2
            </text>
            <text x="560" y="226" textAnchor="middle" className="text-[12px] font-sans font-medium fill-slate-800">
              trap
            </text>
          </g>

          {/* --- ARROW 3: page is on backing store --- */}
          <g className={`transition-opacity duration-300 ${currentStep === 3 ? "opacity-100" : "opacity-35"}`}>
            <path
              id="path-arrow-3"
              d="M 450 80 L 781 80 L 781 265"
              fill="none"
              stroke={currentStep === 3 ? "#0284c7" : "#0f172a"}
              strokeWidth={currentStep === 3 ? "3.5" : "1.8"}
              markerEnd={currentStep === 3 ? "url(#pf-arrow-active)" : "url(#pf-arrow-black)"}
            />
            {/* Animated packet on Arrow 3 */}
            {currentStep === 3 && (
              <circle r="5" fill="#0284c7" filter="url(#glow)">
                <animateMotion dur="1.4s" repeatCount="indefinite" path="M 450 80 L 781 80 L 781 265" />
              </circle>
            )}
            <circle cx="510" cy="65" r="13" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
            <text x="510" y="70" textAnchor="middle" className="font-sans text-[13px] font-black fill-sky-600">
              3
            </text>
            <text x="630" y="68" textAnchor="middle" className="text-[12px] font-sans font-medium fill-slate-800">
              page is on backing store
            </text>
          </g>

          {/* --- ARROW 4: bring in missing page --- */}
          <g className={`transition-opacity duration-300 ${currentStep === 4 ? "opacity-100" : "opacity-35"}`}>
            <path
              id="path-arrow-4"
              d="M 765 285 L 725 285 L 725 385 L 632 385"
              fill="none"
              stroke={currentStep === 4 ? "#0284c7" : "#0f172a"}
              strokeWidth={currentStep === 4 ? "3.5" : "1.8"}
              markerEnd={currentStep === 4 ? "url(#pf-arrow-active)" : "url(#pf-arrow-black)"}
            />
            {/* Animated packet on Arrow 4 */}
            {currentStep === 4 && (
              <circle r="5" fill="#0284c7" filter="url(#glow)">
                <animateMotion dur="1.3s" repeatCount="indefinite" path="M 765 285 L 725 285 L 725 385 L 632 385" />
              </circle>
            )}
            <circle cx="740" cy="425" r="13" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
            <text x="740" y="430" textAnchor="middle" className="font-sans text-[13px] font-black fill-sky-600">
              4
            </text>
            <text x="740" y="445" textAnchor="middle" className="text-[12px] font-sans font-medium fill-slate-800">
              bring in
            </text>
            <text x="740" y="460" textAnchor="middle" className="text-[12px] font-sans font-medium fill-slate-800">
              missing page
            </text>
          </g>

          {/* --- ARROW 5: reset page table --- */}
          <g className={`transition-opacity duration-300 ${currentStep === 5 ? "opacity-100" : "opacity-35"}`}>
            <path
              id="path-arrow-5"
              d="M 550 385 L 415 385 L 415 300 L 440 300"
              fill="none"
              stroke={currentStep === 5 ? "#0284c7" : "#0f172a"}
              strokeWidth={currentStep === 5 ? "3.5" : "1.8"}
              markerEnd={currentStep === 5 ? "url(#pf-arrow-active)" : "url(#pf-arrow-black)"}
            />
            {/* Animated packet on Arrow 5 */}
            {currentStep === 5 && (
              <circle r="5" fill="#0284c7" filter="url(#glow)">
                <animateMotion dur="1.3s" repeatCount="indefinite" path="M 550 385 L 415 385 L 415 300 L 440 300" />
              </circle>
            )}
            <circle cx="415" cy="420" r="13" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
            <text x="415" y="425" textAnchor="middle" className="font-sans text-[13px] font-black fill-sky-600">
              5
            </text>
            <text x="415" y="440" textAnchor="middle" className="text-[12px] font-sans font-medium fill-slate-800">
              reset page
            </text>
            <text x="415" y="455" textAnchor="middle" className="text-[12px] font-sans font-medium fill-slate-800">
              table
            </text>
          </g>

          {/* --- ARROW 6: restart instruction --- */}
          <g className={`transition-opacity duration-300 ${currentStep === 6 ? "opacity-100" : "opacity-35"}`}>
            <path
              id="path-arrow-6"
              d="M 440 320 L 150 320"
              fill="none"
              stroke={currentStep === 6 ? "#0284c7" : "#0f172a"}
              strokeWidth={currentStep === 6 ? "3.5" : "1.8"}
              markerEnd={currentStep === 6 ? "url(#pf-arrow-active)" : "url(#pf-arrow-black)"}
            />
            {/* Animated packet on Arrow 6 */}
            {currentStep === 6 && (
              <circle r="5" fill="#0284c7" filter="url(#glow)">
                <animateMotion dur="1.1s" repeatCount="indefinite" path="M 440 320 L 150 320" />
              </circle>
            )}
            <circle cx="280" cy="355" r="13" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
            <text x="280" y="360" textAnchor="middle" className="font-sans text-[13px] font-black fill-sky-600">
              6
            </text>
            <text x="280" y="375" textAnchor="middle" className="text-[12px] font-sans font-medium fill-slate-800">
              restart
            </text>
            <text x="280" y="390" textAnchor="middle" className="text-[12px] font-sans font-medium fill-slate-800">
              instruction
            </text>
          </g>
        </svg>
      </div>

      {/* Backing Store Inspection & Live Simulation Activity Console */}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {/* Step details & animated arrow state */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-muted/40 p-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-white font-mono text-xs font-bold">
                {currentStep}
              </span>
              <span className="font-bold text-sm text-foreground">{active.title}</span>
            </div>
            <span className="font-mono text-xs font-semibold text-sky-600">{active.arrow}</span>
          </div>
          <p className="text-xs text-foreground leading-relaxed">{active.desc}</p>
          <div
            className={`mt-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${
              active.statusType === "success"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : active.statusType === "error"
                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
            }`}
          >
            {active.statusType === "success" ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : active.statusType === "error" ? (
              <XCircle className="h-3.5 w-3.5" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            {active.status}
          </div>
        </div>

        {/* Backing Store Live Check Card (Specially requested by teacher) */}
        <div className="rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50/60 dark:bg-sky-950/20 p-4">
          <div className="flex items-center justify-between border-b border-sky-200 dark:border-sky-800 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-sky-600" />
              <span className="font-bold text-sm text-foreground">Backing Store Disk Contents</span>
            </div>
            <span className="text-[11px] font-mono font-semibold text-muted-foreground">Swap Blocks</span>
          </div>

          <p className="text-xs text-muted-foreground mb-3">
            Pages currently stored on the secondary backing store (disk):
          </p>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {diskPages.map((dp) => (
              <span
                key={dp}
                className={`rounded-md px-2.5 py-1 font-mono text-xs font-bold border transition-colors ${
                  dp === targetPage
                    ? "border-sky-500 bg-sky-600 text-white shadow-sm scale-105"
                    : "border-slate-300 dark:border-slate-700 bg-white dark:bg-card text-slate-800 dark:text-slate-200"
                }`}
              >
                Page {dp}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-sky-200/60 dark:border-sky-800/60 text-xs">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Is Page {targetPage} on Backing Store?
            </span>
            <span
              className={`font-mono font-bold px-2 py-0.5 rounded ${
                isPresentInBackingStore
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
                  : "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300"
              }`}
            >
              {isPresentInBackingStore ? "YES (Present on Disk)" : "NO (Page Missing)"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

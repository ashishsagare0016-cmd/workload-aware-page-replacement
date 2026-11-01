import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type Tone = "primary" | "success" | "danger" | "warning" | "accent";
const TONE: Record<Tone, string> = {
  primary: "bg-secondary text-primary",
  success: "bg-success-soft text-success",
  danger: "bg-fault-soft text-destructive",
  warning: "bg-warning/15 text-warning",
  accent: "bg-accent text-accent-foreground",
};

export function IconChip({ icon: Icon, tone = "primary", size = "md" }: { icon: LucideIcon; tone?: Tone; size?: "sm" | "md" | "lg" }) {
  const s = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const i = size === "lg" ? "h-6 w-6" : size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-xl ${s} ${TONE[tone]}`}>
      <Icon className={i} />
    </span>
  );
}

export function PageHeader({ title, description, eyebrow, icon, children }: { title: string; description: string; eyebrow?: string; icon?: LucideIcon; children?: ReactNode }) {
  return (
    <div className="clay-card relative mb-8 overflow-hidden p-6 md:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-secondary" />
      <div className="pointer-events-none absolute -bottom-20 right-24 h-32 w-32 rounded-full bg-accent/60" />
      <div className="relative flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          {icon && <IconChip icon={icon} size="lg" />}
          <div>
            {eyebrow && <div className="mb-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">{eyebrow}</div>}
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <p className="mt-1 max-w-2xl text-muted-foreground">{description}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Panel({ title, subtitle, icon, action, children, className = "" }: { title?: ReactNode; subtitle?: string; icon?: LucideIcon; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`clay-card p-5 ${className}`}>
      {title && (
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            {icon && <IconChip icon={icon} size="sm" />}
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider">{title}</h2>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, icon, tone = "primary" }: { label: string; value: ReactNode; hint?: string; icon?: LucideIcon; tone?: Tone }) {
  return (
    <div className="clay-card flex items-start gap-3 p-4">
      {icon && <IconChip icon={icon} tone={tone} />}
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-1 truncate font-mono text-2xl font-semibold">{value}</div>
        {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
      </div>
    </div>
  );
}

export function Meter({ value, tone = "primary" }: { value: number; tone?: "primary" | "success" | "danger" }) {
  const c = tone === "success" ? "bg-success" : tone === "danger" ? "bg-destructive" : "bg-primary";
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div className={`h-2 rounded-full ${c} transition-all`} style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }} />
    </div>
  );
}

export function Btn({ children, variant = "default", className = "", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "primary" | "ghost" }) {
  const v = variant === "primary" ? "clay-btn-primary" : variant === "ghost" ? "rounded-lg hover:bg-muted" : "clay-btn";
  return (
    <button {...p} className={`${v} inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium disabled:opacity-50 ${className}`}>
      {children}
    </button>
  );
}

export const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
export const inputCls = "w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-inner outline-none focus:ring-2 focus:ring-ring";

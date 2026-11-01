import { Link, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutDashboard, Cpu, FlaskConical, BarChart3, ScanSearch, Beaker, Info, Moon, Sun, Menu, Workflow } from "lucide-react";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/simulator", label: "Simulator", icon: Cpu },
  { to: "/page-fault", label: "Page Fault Routine", icon: Workflow },
  { to: "/workload-lab", label: "Workload Lab", icon: FlaskConical },
  { to: "/comparison", label: "Algorithm Comparison", icon: BarChart3 },
  { to: "/analysis", label: "Workload Analysis", icon: ScanSearch },
  { to: "/experiments", label: "Experiments", icon: Beaker },
  { to: "/about", label: "About Project", icon: Info },
] as const;

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("prs-theme", next ? "dark" : "light");
  };
  return (
    <button onClick={toggle} aria-label="Toggle dark mode" className="clay-btn flex w-full items-center gap-2 px-3 py-2 text-sm">
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {dark ? "Light mode" : "Dark mode"}
    </button>
  );
}

export function AppShell() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 border-r border-border bg-sidebar p-4 transition-transform md:static md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-6 px-2">
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">OS Lab</div>
          <div className="text-lg font-bold">Page Replacement</div>
        </div>
        <nav className="space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              activeOptions={{ exact: to === "/" }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
              activeProps={{ className: "bg-primary text-primary-foreground font-semibold shadow-sm" }}
              inactiveProps={{ className: "text-sidebar-foreground hover:bg-sidebar-accent" }}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-6">
          <ThemeToggle />
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-20 bg-foreground/20 md:hidden" onClick={() => setOpen(false)} />}
      <main className="min-w-0 flex-1">
        <div className="flex items-center gap-2 border-b border-border p-3 md:hidden">
          <button aria-label="Open menu" onClick={() => setOpen(true)} className="clay-btn p-2">
            <Menu className="h-4 w-4" />
          </button>
          <span className="font-semibold">Page Replacement</span>
        </div>
        <div className="mx-auto max-w-7xl p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

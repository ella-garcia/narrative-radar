import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Logo } from "./Logo";

const NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/feed", label: "Video feed" },
  { to: "/briefing", label: "Briefings" },
  { to: "/audit", label: "Audit log" },
];

const DOC_NAV = [
  { to: "/documentation", label: "Platform Docs" },
  { to: "/legal", label: "Legal Basis" },
];

export function Layout() {
  const location = useLocation();
  const docsActive = DOC_NAV.some((n) => location.pathname === n.to);

  return (
    <div className="min-h-full">
      <header className="border-b border-eu-slate-200 bg-white">
        <div className="max-w-[1280px] mx-auto px-6 min-h-16 py-3 flex flex-wrap items-center justify-between gap-3">
          <Logo />
          <nav className="flex flex-wrap items-center justify-center gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === "/"}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md text-sm font-medium transition ${
                    isActive
                      ? "bg-eu-blue text-white"
                      : "text-eu-slate-700 hover:bg-eu-slate-100"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
            <div className="relative group">
              <button
                type="button"
                aria-haspopup="true"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  docsActive
                    ? "bg-eu-blue text-white"
                    : "text-eu-slate-700 hover:bg-eu-slate-100"
                }`}
              >
                Documentation
              </button>
              <div className="absolute right-0 z-20 mt-2 hidden min-w-44 rounded-md border border-eu-slate-200 bg-white p-1 shadow-card group-hover:block group-focus-within:block">
                {DOC_NAV.map((n) => (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    className={({ isActive }) =>
                      `block rounded px-3 py-2 text-sm font-medium transition ${
                        isActive
                          ? "bg-eu-blue/10 text-eu-blue"
                          : "text-eu-slate-700 hover:bg-eu-slate-100"
                      }`
                    }
                  >
                    {n.label}
                  </NavLink>
                ))}
              </div>
            </div>
          </nav>
          <div className="flex items-center gap-2 text-xs text-eu-slate-500">
            <div className="hidden md:flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              <span>backend live</span>
            </div>
            <span className="kbd">v0.1 · prototype</span>
          </div>
        </div>
        <div className="max-w-[1280px] mx-auto px-6 pb-2 -mt-1">
          <p className="text-[11px] text-eu-slate-500 italic">
            Indicators of potential platform obligation failures under EU law. All findings require human review and qualified legal assessment before any action is taken.
          </p>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto px-6 py-6">
        <Outlet />
      </main>

      <footer className="max-w-[1280px] mx-auto px-6 py-8 mt-8 border-t border-eu-slate-200 text-xs text-eu-slate-500">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            Narrative Radar — EU AI Hackathon 2026.
          </div>
          <div className="flex gap-3">
            <span>Data: EUvsDisinfo · EDMO · DSA Transparency DB</span>
            <span>·</span>
            <span>No content classification, no automated enforcement.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { disclosures } from "@/lib/education/content";
import { usePlanner } from "@/components/planner-provider";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/heloc", label: "HELOC" },
  { href: "/cash-flow", label: "Cash flow" },
  { href: "/strategies", label: "Strategies" },
  { href: "/consolidation", label: "Consolidation" },
  { href: "/stress", label: "Stress test" },
  { href: "/scenarios", label: "Scenarios" },
  { href: "/education", label: "Learn" },
  { href: "/report", label: "Report" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state } = usePlanner();

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-[#d7c49a] bg-[#10243f] text-[#f7f3ea]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full border border-[#e4c57a] text-sm font-semibold tracking-wide text-[#e4c57a]">
              LB
            </span>
            <span>
              <span className="block text-[11px] tracking-[0.18em] text-[#e4c57a] uppercase">
                Legacy Builders Enterprise Group
              </span>
              <span className="font-heading block text-lg leading-tight text-white">HELOC Strategy Calculator</span>
            </span>
          </Link>
          <div className="text-left md:text-right">
            <p className="text-sm text-[#f7f3ea]">{state.scenarioName}</p>
            <p className="text-xs text-[#c9d0c0]">Workshop model · figures stay in this browser</p>
          </div>
        </div>
        <nav className="mx-auto flex w-full max-w-7xl gap-1 overflow-x-auto px-4 pb-3 md:px-6" aria-label="Sections">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors",
                  active ? "bg-[#e4c57a] text-[#10243f]" : "text-[#e7e2d4] hover:bg-white/10",
                )}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <div className="border-b border-[#e4d7b8] bg-[#efe6cf] px-4 py-2 text-sm text-[#3d3112] md:px-6">
        Educational model only. Borrowing against a home can lead to foreclosure if payments are not made. A lower interest estimate is not a recommendation to open or draw a HELOC.
      </div>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 md:py-8">{children}</main>
      <footer className="border-t border-border bg-[#10243f] px-4 py-6 text-sm text-[#d5d8cf] md:px-6">
        <div className="mx-auto grid w-full max-w-7xl gap-3 md:grid-cols-[1.2fr_2fr]">
          <p className="font-heading text-base text-[#e4c57a]">Legacy Builders Enterprise Group</p>
          <p>{disclosures[0]}</p>
        </div>
      </footer>
    </div>
  );
}

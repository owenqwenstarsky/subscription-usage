"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Usage" },
  { href: "/activity", label: "Activity" },
  { href: "/logs", label: "Logbook" },
];

export function SiteNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-1 px-4 py-3 sm:px-6">
        <span className="mr-3 hidden text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 sm:inline">
          Proxy Ops
        </span>
        {links.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

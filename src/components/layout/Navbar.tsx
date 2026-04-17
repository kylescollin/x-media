"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, List } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/library", label: "Library", icon: Film },
  { href: "/watchlist", label: "Watchlist", icon: List },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-black/50 backdrop-blur-md">
      <nav className="mx-auto flex max-w-screen-2xl items-center gap-8 px-4 sm:px-6 h-16">
        {/* Logo */}
        <Link href="/library" className="flex items-center gap-2 shrink-0">
          <span className="text-base font-semibold tracking-tight text-white">
            Kyle<span className="text-amber-400">'</span>s Media
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150",
                  active
                    ? "text-white"
                    : "text-white/40 hover:text-white/80"
                )}
              >
                <Icon className={cn("h-4 w-4", active ? "text-white" : "text-white/40")} />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, List, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/library", label: "Library", icon: Film },
  { href: "/watchlist", label: "Watchlist", icon: List },
  { href: "/validate", label: "Validate", icon: ShieldCheck },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-black/80 backdrop-blur-md sm:hidden">
      <div className="flex items-center justify-around h-14">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 flex-1 py-2 transition-colors",
                active ? "text-white" : "text-white/35 hover:text-white/70"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, Tv, List, ShieldCheck } from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import Avatar from "@/components/settings/Avatar";

const links = [
  { href: "/library", label: "Movies", icon: Film },
  { href: "/tv", label: "TV Shows", icon: Tv },
  { href: "/watchlist", label: "Watchlist", icon: List },
  { href: "/validate", label: "Validate", icon: ShieldCheck },
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const firstName = user?.name?.split(" ")[0];

  if (pathname.startsWith("/auth")) return null;

  return (
    <header className="hidden sm:block sticky top-0 z-50 border-b border-white/5 bg-black/50 backdrop-blur-md">
      <nav className="flex items-center gap-8 px-6 sm:px-10 lg:px-16 h-20">
        {/* Logo */}
        <Link href="/library" className="flex items-center gap-2 shrink-0">
          <span className="text-xl font-semibold tracking-tight text-white">
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

        {/* Profile */}
        <Link
          href="/settings"
          className={cn(
            "ml-auto flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-medium transition-colors duration-150",
            pathname.startsWith("/settings")
              ? "bg-white/10 text-white"
              : "text-white/60 hover:bg-white/5 hover:text-white"
          )}
        >
          <Avatar
            image={user?.image}
            name={user?.name}
            email={user?.email}
            size={32}
          />
          {firstName && <span className="hidden sm:inline">{firstName}</span>}
        </Link>
      </nav>
    </header>
  );
}

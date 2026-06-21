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

export default function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const settingsActive = pathname.startsWith("/settings");

  if (pathname.startsWith("/auth")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-black/80 backdrop-blur-md sm:hidden">
      <div className="flex items-stretch justify-around h-14">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full min-h-[44px]",
                "touch-manipulation select-none transition-colors active:bg-white/10 active:text-white",
                active ? "text-white" : "text-white/35 hover:text-white/70"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
        <Link
          href="/settings"
          className={cn(
            "flex flex-col items-center justify-center gap-1 flex-1 h-full min-h-[44px]",
            "touch-manipulation select-none transition-colors active:bg-white/10 active:text-white",
            settingsActive ? "text-white" : "text-white/35 hover:text-white/70"
          )}
        >
          <Avatar
            image={user?.image}
            name={user?.name}
            email={user?.email}
            size={20}
            className={cn(
              "ring-1 ring-transparent",
              settingsActive && "ring-white/70"
            )}
          />
          <span className="text-[10px] font-medium">You</span>
        </Link>
      </div>
    </nav>
  );
}

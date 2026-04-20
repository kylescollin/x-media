import ShowGrid from "@/components/tv/ShowGrid";
import Link from "next/link";
import { Plus } from "lucide-react";

export const metadata = { title: "TV Shows — Kyle's Media" };

export default function TvPage() {
  return (
    <div className="px-6 sm:px-10 lg:px-16 py-8 sm:py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-4xl font-bold tracking-tight text-white">TV Shows</h1>
        <Link
          href="/tv/import"
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium border border-white/8 text-white/40 hover:border-white/15 hover:text-white/70 transition-all duration-150"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Import Shows</span>
        </Link>
      </div>
      <ShowGrid />
    </div>
  );
}

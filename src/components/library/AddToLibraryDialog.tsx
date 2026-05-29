"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { tmdbImage } from "@/lib/tmdb";
import { useTmdbSearch } from "@/hooks/useTmdbSearch";
import { useAddMovie } from "@/hooks/useMovies";

interface AddToLibraryDialogProps {
  type: "movie" | "tv";
}

export default function AddToLibraryDialog({ type }: AddToLibraryDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { results, isLoading } = useTmdbSearch(query, type);
  const { mutate: addMovie, isPending } = useAddMovie();

  const label = type === "movie" ? "movie" : "TV show";

  function handleSelect(id: number) {
    addMovie(
      { tmdbId: id, type },
      {
        onSuccess: () => {
          setOpen(false);
          setQuery("");
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white text-black text-sm font-semibold h-8 px-3 hover:bg-white/90 transition-colors">
        <Plus className="h-3.5 w-3.5" />
        <span>Add {label}</span>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-[oklch(0.10_0_0)] border-white/10 p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-white/8">
          <DialogTitle className="text-base font-semibold text-white">Add {label}</DialogTitle>
        </DialogHeader>

        <div className="px-4 pt-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${label}s…`}
              autoFocus
              className="w-full rounded-lg bg-white/6 border border-white/10 text-sm text-white placeholder:text-white/30 pl-9 pr-3 py-2 outline-none focus:border-white/25 transition-colors"
            />
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto scrollbar-thin px-2 pb-3 space-y-0.5">
          {isLoading && (
            <p className="text-sm text-white/35 px-3 py-6 text-center">Searching…</p>
          )}
          {!isLoading && query.length >= 2 && results.length === 0 && (
            <p className="text-sm text-white/35 px-3 py-6 text-center">No results found</p>
          )}
          {results.map((result) => {
            const title = result.title ?? result.name ?? "";
            const year = (result.release_date ?? result.first_air_date ?? "").slice(0, 4);
            return (
              <button
                key={`${type}-${result.id}`}
                onClick={() => handleSelect(result.id)}
                disabled={isPending}
                className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-white/6 transition-colors"
              >
                <div className="relative h-12 w-8 flex-shrink-0 rounded overflow-hidden bg-white/8">
                  {result.poster_path ? (
                    <Image
                      src={tmdbImage(result.poster_path, "w154")}
                      alt={title}
                      fill
                      sizes="32px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-white/8" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{title}</p>
                  {year && <span className="text-xs text-white/40 mt-0.5 block">{year}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

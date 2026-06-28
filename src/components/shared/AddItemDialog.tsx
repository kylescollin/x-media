"use client";

import { useState, useEffect, useMemo, type ReactNode } from "react";
import { Plus, Loader2, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import SearchResultsList from "@/components/shared/SearchResultsList";
import type { TmdbSearchResult } from "@/types";

interface AddItemDialogProps {
  title: string;
  triggerLabel?: string;
  searchType: "movie" | "tv" | "both";
  searchPlaceholder: string;
  /** Returns the collection id for a tmdbId if it's already in the collection. */
  getExistingId: (tmdbId: number) => number | undefined;
  onAdd: (
    result: TmdbSearchResult,
    cb: { onSuccess: (createdId: number) => void; onError: () => void }
  ) => void;
  /** Omit to make already-added rows show a non-destructive "Added" badge instead of Remove. */
  onRemove?: (id: number, cb: { onSuccess: () => void; onError: () => void }) => void;
  /** Optional slot rendered under the search box (e.g. Mine/Ours toggle). */
  filters?: ReactNode;
}

export default function AddItemDialog({
  title,
  triggerLabel = "Add",
  searchType,
  searchPlaceholder,
  getExistingId,
  onAdd,
  onRemove,
  filters,
}: AddItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [addedThisSession, setAddedThisSession] = useState<Map<number, number>>(new Map());
  const [pendingTmdbId, setPendingTmdbId] = useState<number | null>(null);

  // tmdbId → collection id: existing items + anything added this session
  const inCollection = useMemo(() => {
    const map = new Map<number, number>();
    for (const [tmdbId, id] of addedThisSession) {
      map.set(tmdbId, id);
    }
    return map;
  }, [addedThisSession]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setAddedThisSession(new Map());
      setPendingTmdbId(null);
    }
  }

  // iOS-safe body scroll lock — overflow:hidden alone doesn't work on Safari
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  function handleAdd(result: TmdbSearchResult) {
    setPendingTmdbId(result.id);
    onAdd(result, {
      onSuccess: (createdId) => {
        setAddedThisSession((prev) => new Map(prev).set(result.id, createdId));
        setPendingTmdbId(null);
      },
      onError: () => setPendingTmdbId(null),
    });
  }

  function handleRemove(tmdbId: number, id: number) {
    if (!onRemove) return;
    setPendingTmdbId(tmdbId);
    // Optimistically drop from session tracking to match the cache optimistic update
    setAddedThisSession((prev) => {
      const next = new Map(prev);
      next.delete(tmdbId);
      return next;
    });
    onRemove(id, {
      onSuccess: () => setPendingTmdbId(null),
      onError: () => setPendingTmdbId(null),
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white text-black text-sm font-semibold h-8 px-3 hover:bg-white/90 transition-colors">
        <Plus className="h-4 w-4" />
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="max-w-md bg-[oklch(0.10_0_0)] border-white/10 p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-white/8">
          <DialogTitle className="text-base font-semibold text-white">{title}</DialogTitle>
        </DialogHeader>

        <SearchResultsList
          searchType={searchType}
          searchPlaceholder={searchPlaceholder}
          autoFocus={open}
          filters={filters}
          renderAction={(result) => {
            const sessionId = inCollection.get(result.id);
            const existingId = sessionId ?? getExistingId(result.id);
            const isAdded = existingId !== undefined;
            const isMutating = pendingTmdbId === result.id;

            return isAdded && !onRemove ? (
              <span className="flex-shrink-0 min-w-[56px] flex items-center justify-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md border border-amber-400/30 text-amber-400/90">
                {isMutating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Check className="h-3 w-3" />
                    Added
                  </>
                )}
              </span>
            ) : (
              <button
                type="button"
                disabled={isMutating}
                onClick={() =>
                  isAdded && existingId !== undefined
                    ? handleRemove(result.id, existingId)
                    : handleAdd(result)
                }
                className={`flex-shrink-0 min-w-[56px] flex items-center justify-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md border transition-colors disabled:opacity-50 ${
                  isAdded
                    ? "border-white/15 text-white/50 hover:text-red-400 hover:border-red-400/30"
                    : "border-white/20 text-white/70 hover:text-white hover:border-white/35"
                }`}
              >
                {isMutating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : isAdded ? (
                  "Remove"
                ) : (
                  "Add"
                )}
              </button>
            );
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

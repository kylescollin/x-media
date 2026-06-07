"use client";

import Image from "next/image";
import { X, Trash2 } from "lucide-react";
import { Dialog } from "@base-ui/react/dialog";
import { tmdbImage } from "@/lib/tmdb";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CastList from "@/components/detail/CastList";
import WatchlistSeasonTracker from "./WatchlistSeasonTracker";
import { useRemoveFromWatchlist, useUpdateWatchlistLabel } from "@/hooks/useWatchlist";
import type { WatchlistItem } from "@/types";

interface WatchlistDetailModalProps {
  item: WatchlistItem | null;
  onClose: () => void;
}

function WatchlistDetailContent({ item, onClose }: { item: WatchlistItem; onClose: () => void }) {
  const { mutate: remove, isPending: isRemoving } = useRemoveFromWatchlist();
  const { mutate: updateLabel } = useUpdateWatchlistLabel();

  const year = item.releaseDate ? new Date(item.releaseDate).getFullYear() : null;
  const runtime = item.runtime
    ? `${Math.floor(item.runtime / 60)}h ${item.runtime % 60}m`
    : null;

  function handleRemove() {
    remove(item.id);
    onClose();
  }

  const isTv = item.mediaType === "tv";

  return (
    <div className="flex flex-col bg-[oklch(0.12_0_0)]">

      {/* Backdrop */}
      <div className="relative h-52 sm:h-96 w-full overflow-hidden bg-[oklch(0.09_0_0)] shrink-0">
        {item.backdropPath ? (
          <Image
            src={tmdbImage(item.backdropPath, "original")}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 1024px"
            className="object-cover object-top"
            priority
          />
        ) : item.posterPath ? (
          <Image
            src={tmdbImage(item.posterPath, "w500")}
            alt=""
            fill
            sizes="768px"
            className="object-cover object-top blur-sm scale-110"
            priority
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-[oklch(0.12_0_0)]" />

        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-white/70 hover:text-white hover:bg-black/70 transition-colors duration-150"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Poster + title row */}
      <div className="flex gap-4 px-5 sm:px-6 -mt-14 sm:-mt-20 relative z-10">
        <div className="relative shrink-0 h-28 w-[76px] sm:h-52 sm:w-[138px] rounded-lg overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-white/10 bg-[oklch(0.09_0_0)]">
          <Image
            src={tmdbImage(item.posterPath, "w342")}
            alt={item.title}
            fill
            sizes="138px"
            className="object-cover"
          />
        </div>

        <div className="flex flex-col justify-end pb-1 min-w-0">
          <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight line-clamp-2">
            {item.title}
          </h2>
          <div className="flex items-center gap-1.5 flex-wrap mt-2 text-sm text-white/45">
            {year && <span>{year}</span>}
            {runtime && <><span>·</span><span>{runtime}</span></>}
            <Badge
              variant="outline"
              className="capitalize text-xs py-0.5 px-2 border-white/15 text-white/40 ml-0.5"
            >
              {item.mediaType}
            </Badge>
          </div>
        </div>
      </div>

      {/* Watchlist actions */}
      <div className="px-5 sm:px-6 mt-4 flex flex-col gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/35 font-medium tracking-wide uppercase">For</span>
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-white/5">
              <button
                onClick={() => updateLabel({ id: item.id, viewerLabel: "mine" })}
                className={`text-sm font-medium px-3 py-1 rounded-md transition-colors ${
                  item.viewerLabel === "mine"
                    ? "bg-white/15 text-white"
                    : "text-white/40 hover:text-white/60"
                }`}
              >
                Mine
              </button>
              <button
                onClick={() => updateLabel({ id: item.id, viewerLabel: "ours" })}
                className={`text-sm font-medium px-3 py-1 rounded-md transition-colors ${
                  item.viewerLabel === "ours"
                    ? "bg-white/15 text-white"
                    : "text-white/40 hover:text-white/60"
                }`}
              >
                Ours
              </button>
            </div>
          </div>

          <button
            onClick={handleRemove}
            disabled={isRemoving}
            className="flex items-center gap-1.5 text-white/35 hover:text-red-400 transition-colors duration-150 disabled:opacity-50"
            aria-label="Remove from watchlist"
          >
            <Trash2 className="h-4 w-4" />
            <span className="text-xs font-medium tracking-wide uppercase">Remove</span>
          </button>
        </div>

        {item.genres && item.genres.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {item.genres.map((g) => (
              <span
                key={g.id}
                className="inline-flex text-xs px-2.5 py-1 rounded-full bg-white/8 text-white/55 border border-white/8"
              >
                {g.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="mx-5 sm:mx-6 mt-4 h-px bg-white/6" />

      {/* Content — tabs for TV, simple overview for movies */}
      {isTv ? (
        <Tabs defaultValue="overview" className="px-5 sm:px-6 pt-2 pb-8">
          <TabsList className="mb-4 bg-transparent gap-1 -ml-1">
            <TabsTrigger value="overview" className="text-sm data-active:text-white text-white/40 px-3 py-1.5">
              Overview
            </TabsTrigger>
            <TabsTrigger value="cast" className="text-sm data-active:text-white text-white/40 px-3 py-1.5">
              Cast
            </TabsTrigger>
            <TabsTrigger value="seasons" className="text-sm data-active:text-white text-white/40 px-3 py-1.5">
              Seasons
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0">
            <div className="max-h-40 overflow-y-auto scrollbar-thin">
              {item.overview ? (
                <p className="text-sm leading-relaxed text-white/60">{item.overview}</p>
              ) : (
                <p className="text-sm text-white/35">No overview available.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="cast" className="mt-0">
            <div className="max-h-52 overflow-y-auto scrollbar-thin">
              <CastList cast={item.cast ?? []} />
            </div>
          </TabsContent>

          <TabsContent value="seasons" className="mt-0">
            <div className="max-h-[28rem] overflow-y-auto scrollbar-thin">
              <WatchlistSeasonTracker
                watchlistItemId={item.id}
                tmdbId={item.tmdbId}
                seasons={item.tvSeasons}
              />
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="px-5 sm:px-6 pt-4 pb-8">
          {item.overview ? (
            <p className="text-sm leading-relaxed text-white/60">{item.overview}</p>
          ) : (
            <p className="text-sm text-white/35">No overview available.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function WatchlistDetailModal({ item, onClose }: WatchlistDetailModalProps) {
  return (
    <Dialog.Root
      open={!!item}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm
            data-open:animate-in data-open:fade-in-0
            data-closed:animate-out data-closed:fade-out-0
            duration-200"
        />
        <Dialog.Popup
          className="fixed top-1/2 left-1/2 z-50
            w-full max-w-[calc(100%-2rem)] sm:max-w-4xl
            -translate-x-1/2 -translate-y-1/2
            rounded-2xl overflow-hidden outline-none
            ring-1 ring-white/8
            max-h-[92vh] overflow-y-auto scrollbar-thin
            data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.97]
            data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-[0.97]
            duration-200"
        >
          {item && <WatchlistDetailContent item={item} onClose={onClose} />}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

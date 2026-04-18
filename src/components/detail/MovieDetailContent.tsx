"use client";

import { useState } from "react";
import Image from "next/image";
import { X, MoreHorizontal, Trash2, RefreshCw } from "lucide-react";
import { Menu } from "@base-ui/react";
import { tmdbImage } from "@/lib/tmdb";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StarRating from "./StarRating";
import CastList from "./CastList";
import SeasonTracker from "./SeasonTracker";
import FavoriteToggle from "@/components/library/FavoriteToggle";
import WatchedDateInput from "./WatchedDateInput";
import RematchPanel from "@/components/validate/RematchPanel";
import { useDeleteMovie } from "@/hooks/useMovies";
import type { Movie } from "@/types";

interface MovieDetailContentProps {
  movie: Movie;
  onClose?: () => void;
}

export default function MovieDetailContent({ movie, onClose }: MovieDetailContentProps) {
  const [rematchOpen, setRematchOpen] = useState(false);
  const { mutate: deleteMovie } = useDeleteMovie();

  function handleDelete() {
    deleteMovie(movie.id);
    onClose?.();
  }
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;
  const runtime = movie.runtime
    ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
    : null;

  return (
    <div className="flex flex-col bg-[oklch(0.12_0_0)]">

      {/* ── Cinematic backdrop ───────────────────────────────────────── */}
      <div className="relative h-52 sm:h-96 w-full overflow-hidden bg-[oklch(0.09_0_0)] shrink-0">
        {movie.backdropPath ? (
          <Image
            src={tmdbImage(movie.backdropPath, "original")}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 1024px"
            className="object-cover object-top"
            priority
          />
        ) : (
          /* Fallback: large poster fills the backdrop area */
          movie.posterPath && (
            <Image
              src={tmdbImage(movie.posterPath, "w500")}
              alt=""
              fill
              sizes="768px"
              className="object-cover object-top blur-sm scale-110"
              priority
            />
          )
        )}
        {/* Gradient: transparent top → modal bg bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-[oklch(0.12_0_0)]" />
        {/* Gradient: transparent → modal bg on the sides */}
        <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.12_0_0)]/0 to-transparent" />

        {/* Top-right buttons */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          <Menu.Root>
            <Menu.Trigger
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-white/50 hover:text-white/90 hover:bg-black/70 transition-colors duration-150"
              aria-label="Movie options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner side="bottom" align="end" sideOffset={6} className="isolate z-[70]">
                <Menu.Popup className="min-w-[160px] rounded-lg border border-white/10 bg-[oklch(0.18_0_0)] py-1 shadow-xl shadow-black/60 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 duration-100 origin-(--transform-origin)">
                  <Menu.Item
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/8 cursor-pointer transition-colors duration-100 outline-none"
                    onClick={() => setRematchOpen(true)}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Reconnect movie
                  </Menu.Item>
                  <Menu.Item
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-400/80 hover:text-red-400 hover:bg-white/8 cursor-pointer transition-colors duration-100 outline-none"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete from library
                  </Menu.Item>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
          {onClose && (
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-white/70 hover:text-white hover:bg-black/70 transition-colors duration-150"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Poster + title row ───────────────────────────────────────── */}
      <div className="flex gap-4 px-5 sm:px-6 -mt-14 sm:-mt-20 relative z-10">
        {/* Poster — floats up from bottom of backdrop */}
        <div className="relative shrink-0 h-28 w-[76px] sm:h-52 sm:w-[138px] rounded-lg overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-white/10 bg-[oklch(0.09_0_0)]">
          <Image
            src={tmdbImage(movie.posterPath, "w342")}
            alt={movie.title}
            fill
            sizes="138px"
            className="object-cover"
          />
        </div>

        {/* Title + meta — sits bottom-aligned with poster */}
        <div className="flex flex-col justify-end pb-1 min-w-0">
          <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight line-clamp-2">
            {movie.title}
          </h2>
          <div className="flex items-center gap-1.5 flex-wrap mt-2 text-sm text-white/45">
            {year && <span>{year}</span>}
            {runtime && <><span>·</span><span>{runtime}</span></>}
            {movie.voteAverage && (
              <><span>·</span><span className="text-amber-400/80">★ {movie.voteAverage.toFixed(1)}</span></>
            )}
            <Badge
              variant="outline"
              className="capitalize text-xs py-0.5 px-2 border-white/15 text-white/40 ml-0.5"
            >
              {movie.mediaType}
            </Badge>
          </div>
        </div>
      </div>

      {/* ── Actions + genres ─────────────────────────────────────────── */}
      <div className="px-5 sm:px-6 mt-4 flex flex-col gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/35 font-medium tracking-wide uppercase">Rate</span>
            <StarRating movieId={movie.id} rating={movie.userRating} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-white/35 font-medium tracking-wide uppercase">
              {movie.isFavorite ? "Favorited" : "Favorite"}
            </span>
            <FavoriteToggle movieId={movie.id} isFavorite={movie.isFavorite} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/35 font-medium tracking-wide uppercase">Watched</span>
            <WatchedDateInput movieId={movie.id} watchedDate={movie.watchedDate} />
          </div>
        </div>

        {movie.genres.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {movie.genres.map((g) => (
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

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <Tabs defaultValue="overview" className="px-5 sm:px-6 pt-2 pb-8">
        <TabsList className="mb-4 bg-transparent gap-1 -ml-1">
          <TabsTrigger value="overview" className="text-sm data-active:text-white text-white/40 px-3 py-1.5">
            Overview
          </TabsTrigger>
          <TabsTrigger value="cast" className="text-sm data-active:text-white text-white/40 px-3 py-1.5">
            Cast
          </TabsTrigger>
          {movie.mediaType === "tv" && (
            <TabsTrigger value="seasons" className="text-sm data-active:text-white text-white/40 px-3 py-1.5">
              Seasons
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <div className="max-h-40 overflow-y-auto scrollbar-thin">
            {movie.overview ? (
              <p className="text-sm leading-relaxed text-white/60">{movie.overview}</p>
            ) : (
              <p className="text-sm text-white/35">No overview available.</p>
            )}
            {movie.directors && movie.directors.length > 0 && (
              <p className="mt-3 text-sm">
                <span className="text-white/50 font-medium">
                  Director{movie.directors.length > 1 ? "s" : ""}:
                </span>{" "}
                <span className="text-white/40">{movie.directors.join(", ")}</span>
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="cast" className="mt-0">
          <div className="max-h-52 overflow-y-auto scrollbar-thin">
            <CastList cast={movie.cast ?? []} />
          </div>
        </TabsContent>

        {movie.mediaType === "tv" && (
          <TabsContent value="seasons" className="mt-0">
            <div className="max-h-52 overflow-y-auto scrollbar-thin">
              <SeasonTracker seasons={movie.tvSeasons ?? []} />
            </div>
          </TabsContent>
        )}
      </Tabs>
      <RematchPanel
        movie={movie}
        open={rematchOpen}
        onClose={() => setRematchOpen(false)}
        onRematched={() => setRematchOpen(false)}
      />
    </div>
  );
}

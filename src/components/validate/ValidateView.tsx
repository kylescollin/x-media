"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle, ShieldCheck, XCircle, ArrowRight, Loader2 } from "lucide-react";
import MovieDetailContent from "@/components/detail/MovieDetailContent";
import RematchPanel from "./RematchPanel";
import { useMovies, useUpdateMovie } from "@/hooks/useMovies";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ValidateView() {
  const { data: allMovies, isLoading, isError } = useMovies();
  const { mutateAsync: updateMovie } = useUpdateMovie();

  // Queue is a shuffled array of unvalidated movie ids — initialized once from first fetch
  const [queue, setQueue] = useState<number[]>([]);
  const [validatedCount, setValidatedCount] = useState(0);
  const initialized = useRef(false);
  const [confirming, setConfirming] = useState(false);
  const [rematchOpen, setRematchOpen] = useState(false);

  useEffect(() => {
    if (!allMovies || initialized.current) return;
    initialized.current = true;
    const unvalidated = allMovies.filter((m) => !m.validated).map((m) => m.id);
    setQueue(shuffle(unvalidated));
    setValidatedCount(allMovies.filter((m) => m.validated).length);
  }, [allMovies]);

  // Always read current movie from React Query cache so rating/favorite updates are live
  const movieMap = new Map((allMovies ?? []).map((m) => [m.id, m]));
  const currentId = queue[0] ?? null;
  const current = currentId !== null ? (movieMap.get(currentId) ?? null) : null;
  const totalCount = validatedCount + queue.length;

  function advanceQueue(removeFirst = true) {
    setQueue((q) => (removeFirst ? q.slice(1) : [...q.slice(1), q[0]]));
  }

  async function handleConfirm() {
    if (!current) return;
    setConfirming(true);
    try {
      await updateMovie({ id: current.id, data: { validated: true } });
      setValidatedCount((c) => c + 1);
      advanceQueue(true);
    } finally {
      setConfirming(false);
    }
  }

  function handleSkip() {
    advanceQueue(false);
  }

  function handleRematched() {
    setRematchOpen(false);
    setValidatedCount((c) => c + 1);
    advanceQueue(true);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh]">
        <Loader2 className="h-6 w-6 text-white/30 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh]">
        <p className="text-sm text-white/40">Failed to load movies.</p>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60dvh] gap-4 px-6 text-center">
        <ShieldCheck className="h-12 w-12 text-amber-400/60" />
        <h2 className="text-lg font-semibold text-white">All caught up!</h2>
        <p className="text-sm text-white/45 max-w-xs">
          All {validatedCount} {validatedCount === 1 ? "movie" : "movies"} in your library have been validated.
        </p>
      </div>
    );
  }

  if (!current) return null;

  const progressPct = totalCount > 0 ? (validatedCount / totalCount) * 100 : 0;

  return (
    <div className="mx-auto max-w-screen-sm">
      {/* Progress header */}
      <div className="px-4 sm:px-6 pt-5 pb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-white/45 uppercase tracking-wide">Validation progress</span>
          <span className="text-xs text-white/55">
            <span className="text-white font-semibold">{validatedCount}</span>
            {" of "}
            <span className="text-white font-semibold">{totalCount}</span>
            {" validated"}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/8 overflow-hidden">
          <div
            className="h-full rounded-full bg-amber-400/70 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-white/30">{queue.length} remaining</p>
      </div>

      {/* Movie detail */}
      <div className="border-t border-white/6">
        <MovieDetailContent movie={current} />
      </div>

      {/* Validation prompt + actions */}
      <div className="sticky bottom-0 sm:bottom-auto border-t border-white/8 bg-[oklch(0.07_0_0)]/90 backdrop-blur-md px-4 sm:px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-4">
        <p className="text-xs text-white/40 text-center mb-3">Is this the movie you watched?</p>
        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium hover:bg-emerald-600/30 transition-colors disabled:opacity-50"
          >
            {confirming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Yes, correct
          </button>
          <button
            onClick={() => setRematchOpen(true)}
            disabled={confirming}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-red-600/15 border border-red-500/25 text-red-400 text-sm font-medium hover:bg-red-600/25 transition-colors disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            Wrong match
          </button>
          <button
            onClick={handleSkip}
            disabled={confirming}
            className="flex items-center justify-center gap-1 py-2.5 px-4 rounded-lg bg-white/5 border border-white/8 text-white/40 text-sm font-medium hover:text-white/60 hover:bg-white/8 transition-colors disabled:opacity-50"
          >
            <ArrowRight className="h-4 w-4" />
            Skip
          </button>
        </div>
      </div>

      {/* Rematch panel */}
      {rematchOpen && (
        <RematchPanel
          movie={current}
          open={rematchOpen}
          onClose={() => setRematchOpen(false)}
          onRematched={handleRematched}
        />
      )}
    </div>
  );
}

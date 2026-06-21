// Horizontal watch-progress bar overlaid on the bottom of a poster card.
// Shared by ShowCard and WatchlistCard so the library and watchlist match.
// Callers decide whether to render (e.g. only when pct > 0 && pct < 100).

export default function MediaProgressBar({ pct }: { pct: number }) {
  return (
    <div className="absolute bottom-2 left-2 right-2 opacity-100 group-hover:opacity-0 transition-opacity duration-200">
      <div
        className="h-1 w-full rounded-full bg-black/50 backdrop-blur-sm overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${pct}% watched`}
      >
        <div
          className="h-full rounded-full bg-amber-400 transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

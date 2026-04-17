import type { TvSeason } from "@/types";

interface SeasonTrackerProps {
  seasons: TvSeason[];
}

export default function SeasonTracker({ seasons }: SeasonTrackerProps) {
  if (seasons.length === 0) {
    return <p className="text-sm text-white/35">No season data recorded.</p>;
  }

  return (
    <div className="space-y-2">
      {seasons.map((season) => (
        <div
          key={season.id}
          className="flex items-center justify-between rounded-lg border border-white/8 bg-white/4 px-3 py-2 text-sm"
        >
          <span className="font-medium text-white/80">Season {season.seasonNumber}</span>
          <span className="text-white/40 text-xs">
            {season.episodeCount
              ? `${season.watchedEpisodes} / ${season.episodeCount} eps`
              : "Completed"}
          </span>
        </div>
      ))}
    </div>
  );
}

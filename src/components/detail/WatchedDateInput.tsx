"use client";

import { useUpdateMovie } from "@/hooks/useMovies";

interface WatchedDateInputProps {
  movieId: number;
  watchedDate: string | null;
}

export default function WatchedDateInput({ movieId, watchedDate }: WatchedDateInputProps) {
  const { mutate } = useUpdateMovie();

  // ISO string → YYYY-MM-DD for the input value
  const dateValue = watchedDate
    ? new Date(watchedDate).toISOString().split("T")[0]
    : "";

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    mutate({ id: movieId, data: { watchedDate: e.target.value || null } });
  }

  return (
    <input
      type="date"
      value={dateValue}
      onChange={handleChange}
      className="
        bg-transparent text-sm text-white/60 outline-none cursor-pointer
        border-b border-white/10 hover:border-white/25 focus:border-white/40
        transition-colors duration-150 pb-px
        [color-scheme:dark]
      "
    />
  );
}

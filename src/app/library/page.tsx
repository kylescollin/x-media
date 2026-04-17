import MovieGrid from "@/components/library/MovieGrid";

export const metadata = { title: "Library — Kyle's Media" };

export default function LibraryPage() {
  return (
    <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">Library</h1>
        <p className="text-sm text-white/35 mt-1">Everything we&apos;ve watched</p>
      </div>
      <MovieGrid />
    </div>
  );
}

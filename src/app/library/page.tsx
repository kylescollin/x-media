import MovieGrid from "@/components/library/MovieGrid";

export const metadata = { title: "Library — Kyle's Media" };

export default function LibraryPage() {
  return (
    <div className="px-6 sm:px-10 lg:px-16 py-8 sm:py-10">
      <div className="mb-6">
        <h1 className="text-4xl font-bold tracking-tight text-white">Library</h1>
      </div>
      <MovieGrid />
    </div>
  );
}

import MovieGrid from "@/components/library/MovieGrid";
import AddToLibraryDialog from "@/components/library/AddToLibraryDialog";
import ExportButton from "@/components/library/ExportButton";

export const metadata = { title: "Movies — Kyle's Media" };

export default function LibraryPage() {
  return (
    <div className="px-6 sm:px-10 lg:px-16 py-8 sm:py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-4xl font-bold tracking-tight text-white">Movies</h1>
        <div className="flex items-center gap-2">
          <ExportButton type="movie" />
          <AddToLibraryDialog type="movie" />
        </div>
      </div>
      <MovieGrid />
    </div>
  );
}

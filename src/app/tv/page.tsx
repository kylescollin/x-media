import ShowGrid from "@/components/tv/ShowGrid";
import AddToLibraryDialog from "@/components/library/AddToLibraryDialog";

export const metadata = { title: "TV Shows — Kyle's Media" };

export default function TvPage() {
  return (
    <div className="px-6 sm:px-10 lg:px-16 py-8 sm:py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-4xl font-bold tracking-tight text-white">TV Shows</h1>
        <div className="flex items-center gap-2">
          <AddToLibraryDialog type="tv" />
        </div>
      </div>
      <ShowGrid />
    </div>
  );
}

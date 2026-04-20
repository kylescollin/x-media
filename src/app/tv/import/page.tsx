import TvImportForm from "@/components/tv/TvImportForm";

export const metadata = { title: "Import TV Shows — Kyle's Media" };

export default function TvImportPage() {
  return (
    <div className="px-6 sm:px-10 lg:px-16 py-8 sm:py-10 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-4xl font-bold tracking-tight text-white">Import TV Shows</h1>
        <p className="text-sm text-white/40 mt-2">
          Paste your Google Sheets TV show list. Each row should have the show name in column A and the season number in column B.
        </p>
      </div>
      <TvImportForm />
    </div>
  );
}

import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getMovie } from "@/lib/db/movies";
import MovieDetailContent from "@/components/detail/MovieDetailContent";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const movie = await getMovie(Number(id));
  if (!movie) return { title: "Not found — Kyle's Media" };
  return { title: `${movie.title} — Kyle's Media` };
}

export default async function MovieDetailPage({ params }: Props) {
  const { id } = await params;
  const movie = await getMovie(Number(id));
  if (!movie) notFound();

  return (
    <div className="mx-auto max-w-2xl w-full">
      <div className="px-4 pt-4">
        <Link
          href="/library"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to library
        </Link>
      </div>
      <MovieDetailContent movie={movie} />
    </div>
  );
}

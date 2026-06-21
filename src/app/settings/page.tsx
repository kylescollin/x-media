import { auth } from "@/auth";
import { getMovies } from "@/lib/db/movies";
import { computeStats } from "@/lib/stats";
import Avatar from "@/components/settings/Avatar";
import SettingsActions from "@/components/settings/SettingsActions";

export const metadata = { title: "Settings — Kyle's Media" };

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="text-3xl font-bold tracking-tight text-white">{value}</div>
      <div className="mt-1 text-sm text-white/40">{label}</div>
    </div>
  );
}

export default async function SettingsPage() {
  const [session, movies] = await Promise.all([auth(), getMovies()]);
  const stats = computeStats(movies);
  const user = session?.user;

  return (
    <div className="mx-auto max-w-4xl px-6 sm:px-10 lg:px-16 py-8 sm:py-10">
      <h1 className="mb-8 text-4xl font-bold tracking-tight text-white">
        Settings
      </h1>

      {/* Profile */}
      <section className="mb-10 flex items-center gap-4">
        <Avatar
          image={user?.image}
          name={user?.name}
          email={user?.email}
          size={64}
        />
        <div>
          {user?.name && (
            <div className="text-xl font-semibold text-white">{user.name}</div>
          )}
          {user?.email && (
            <div className="text-sm text-white/40">{user.email}</div>
          )}
        </div>
      </section>

      {/* Stats */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-white">Your stats</h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Movies watched" value={stats.totalMovies} />
          <StatCard label="TV shows" value={stats.totalShows} />
          <StatCard label="Seasons tracked" value={stats.totalSeasons} />
          <StatCard label="Episodes watched" value={stats.totalEpisodes} />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-5 sm:col-span-3">
            <div className="text-3xl font-bold tracking-tight text-amber-400">
              {stats.totalDays} days
            </div>
            <div className="mt-1 text-sm text-white/50">
              of watch time &middot; about {stats.totalHours.toLocaleString()}{" "}
              hours
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Favorites" value={stats.favorites} />
          <StatCard label="5-star picks" value={stats.fiveStars} />
          <StatCard
            label="Average rating"
            value={stats.averageRating != null ? `${stats.averageRating}★` : "—"}
          />
        </div>

        {stats.topGenres.length > 0 && (
          <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="mb-3 text-sm text-white/40">Top genres</div>
            <div className="flex flex-wrap gap-2">
              {stats.topGenres.map((g) => (
                <span
                  key={g.name}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/80"
                >
                  {g.name}
                  <span className="text-amber-400">{g.count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <SettingsActions />
    </div>
  );
}

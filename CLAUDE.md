@AGENTS.md

# x-media

Personal media tracking website for Kyle & his wife. Built with Next.js 16, TypeScript, Tailwind, shadcn/ui, Prisma 7, and the TMDB API.

---

## Project Goal

Bring a long-running Google Sheets movie/TV list to life as a visual, interactive website:
1. **Library** — Every movie ever watched, displayed as a poster grid with ratings and favorites
2. **TV Shows** — Every TV season watched, grouped by show with per-episode tracking
3. **Watchlist** — A running list of what to watch next, with auto-fetched TMDB details
4. **Import** — Paste a title list from Google Sheets to bulk-import with TMDB matching

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | `src/` dir, TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui | shadcn uses `@base-ui/react` (NOT Radix) — no `asChild` prop on triggers |
| Database | Turso (LibSQL) via Prisma 7 | `@prisma/adapter-libsql` + `@libsql/client`. Local dev uses SQLite file, prod uses Turso |
| ORM | Prisma 7 | Client generated at `src/generated/prisma/client` (not `@prisma/client`) |
| Movie data | TMDB API | Proxied server-side via `/api/tmdb/*` — key never exposed to client |
| State | React Query (@tanstack/react-query) | Used for client mutations with optimistic updates |
| Hosting | Vercel | Auto-deploys on push to `main` |

## Design System

- **Theme**: Always dark — `dark` class forced on `<html>`. Deep cinematic palette (`oklch(0.07 0 0)` background).
- **Accent**: Amber (`amber-400` / `text-amber-400`) for stars, favorites, active filter counts.
- **Images**: TMDB `w500` in grid cards (Retina-crisp), `original` for backdrops, `w342` for posters in modal.
- **Animations**: Pure CSS transitions — `group-hover:` pattern for cards, Tailwind `animate-in`/`animate-out` with `data-open`/`data-closed` for modals.
- **Movie/show detail**: Modal overlay (`@base-ui/react/dialog` used directly in `MovieDetailModal.tsx`), NOT page navigation. `/library/[id]` still exists for direct URL access.
- **Default sort**: A-Z (`sortBy = "title"`).
- **Filters**: Hidden behind a "Filters" toggle button — collapsible with CSS `max-h` transition.
- **No `asChild`**: All shadcn triggers render children directly (base-ui pattern).

---

## Environment Variables

```
# Local dev
DATABASE_URL="file:./dev.db"   # SQLite file path (relative to prisma.config.ts)
TMDB_API_KEY="..."             # Free key from themoviedb.org

# Production (Vercel)
DATABASE_URL="libsql://..."    # Turso database URL
TURSO_AUTH_TOKEN="..."         # Turso auth token
TMDB_API_KEY="..."
```

`prisma.config.ts` automatically appends `?authToken=...` when `TURSO_AUTH_TOKEN` is set.

---

## Deployment

The site is live on Vercel. **Push to `main` = deploy.**

```bash
git push origin main   # triggers Vercel deploy automatically
```

For schema changes: run `npx prisma migrate dev` locally first, commit the migration file, then push. Vercel runs `prisma generate` (via `npm run build`) on each deploy; migrations must be applied manually against Turso if needed via `npx prisma migrate deploy`.

**At the end of every coding session, always commit and push without being asked:**
```bash
git add -A && git commit -m "feat/fix: <description>" && git push origin main
```

---

## Getting Started (Local)

```bash
npm install
npx prisma generate         # Regenerate client after schema changes
npx prisma migrate dev      # Apply schema migrations to local dev.db
npm run dev                 # http://localhost:3000
```

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                      # Root layout — wraps with QueryProvider, Navbar, MobileNav
│   ├── page.tsx                        # Redirects → /library
│   ├── library/
│   │   ├── page.tsx                    # Movie grid page (Server Component)
│   │   └── [id]/page.tsx               # Movie detail page (Server Component)
│   ├── tv/
│   │   ├── page.tsx                    # TV shows grid page (Server Component)
│   │   └── import/page.tsx             # TV import page (Client Component)
│   ├── watchlist/page.tsx              # Watchlist page (Client Component)
│   ├── validate/page.tsx               # Validate page (Client Component)
│   └── api/
│       ├── movies/route.ts             # GET all, POST add by tmdbId
│       ├── movies/[id]/route.ts        # GET, PATCH (rating/favorite/etc), DELETE
│       ├── movies/[id]/rematch/route.ts# POST re-match to different TMDB entry
│       ├── movies/[id]/seasons/
│       │   └── [seasonNumber]/route.ts # PATCH episode watched state
│       ├── watchlist/route.ts          # GET all, POST add by tmdbId
│       ├── watchlist/[id]/route.ts     # PATCH, DELETE
│       ├── tmdb/search/route.ts        # Proxy: ?q=title&type=movie|tv
│       ├── tmdb/details/route.ts       # Proxy: ?tmdbId=123&type=movie|tv
│       ├── tmdb/season/route.ts        # Proxy: ?tmdbId=123&season=1 — episode list
│       └── tv/import/route.ts          # POST bulk TV show import
├── components/
│   ├── ui/                             # shadcn auto-generated (do not edit)
│   ├── layout/
│   │   ├── Navbar.tsx                  # Sticky top nav (desktop)
│   │   └── MobileNav.tsx               # Fixed bottom tab bar (mobile, hidden sm+)
│   ├── library/
│   │   ├── MovieGrid.tsx               # Client: filters, sort, search — movies only
│   │   ├── MovieCard.tsx               # Poster card with hover overlay
│   │   ├── MovieCardSkeleton.tsx
│   │   ├── MovieSearch.tsx             # Client-side title search input
│   │   ├── MovieFilters.tsx            # Genre chips + favorites toggle
│   │   ├── MovieDetailModal.tsx        # @base-ui/react Dialog wrapper
│   │   └── FavoriteToggle.tsx          # Star button with optimistic React Query mutation
│   ├── tv/
│   │   ├── ShowGrid.tsx                # Client: filters, sort, search — TV shows only
│   │   ├── ShowCard.tsx                # Poster card with season progress chip
│   │   └── TvImportForm.tsx            # Two-column TSV paste import flow
│   ├── detail/
│   │   ├── MovieDetailContent.tsx      # Full detail view — backdrop, poster, tabs
│   │   ├── StarRating.tsx              # 1–5 star rating (click same star to clear)
│   │   ├── CastList.tsx                # Top 10 cast members with profile photos
│   │   ├── SeasonTracker.tsx           # Interactive season/episode tracker (TV only)
│   │   └── WatchedDateInput.tsx        # Date picker for watched date
│   ├── watchlist/
│   │   ├── WatchlistCard.tsx           # Single watchlist item card
│   │   └── AddToWatchlistDialog.tsx    # Search-as-you-type dialog (movies + TV)
│   └── validate/
│       ├── ValidateView.tsx
│       └── RematchPanel.tsx            # Re-match a title to a different TMDB entry
├── lib/
│   ├── prisma.ts                       # Singleton PrismaClient with libsql adapter
│   ├── tmdb.ts                         # TMDB fetch helpers + extractMovieData() + getTmdbSeasonDetails()
│   ├── db/
│   │   ├── movies.ts                   # getMovies, getMovie, upsertMovie, updateMovie, deleteMovie, upsertTvSeason, updateSeasonEpisodes
│   │   ├── watchlist.ts                # getWatchlistItems, addToWatchlist, removeFromWatchlist
│   │   └── serializers.ts             # JSON.parse/stringify for LibSQL JSON fields
│   └── utils/
│       └── parseTvImport.ts            # Parses two-column TSV (show name + season number)
├── hooks/
│   ├── useMovies.ts                    # React Query: movie list + update/delete mutations
│   ├── useSeasons.ts                   # React Query: episode watched state mutation
│   ├── useWatchlist.ts                 # React Query: watchlist CRUD
│   └── useTmdbSearch.ts               # Debounced TMDB search (300ms)
├── providers/QueryProvider.tsx         # React Query client wrapper
└── types.ts                            # Shared TypeScript types (Movie, TvSeason, TvEpisode, WatchlistItem, etc.)

prisma/
├── schema.prisma                       # DB schema — Movie, TvSeason, WatchlistItem
└── migrations/                         # Migration files — commit these, they run on deploy
prisma.config.ts                        # Prisma 7 config — handles Turso auth token injection
```

---

## Database Schema

**Movie** — Everything watched (both movies and TV shows)
- `tmdbId` (unique) — TMDB movie/show ID
- `title`, `overview`, `posterPath`, `backdropPath`, `releaseDate`, `runtime`, `voteAverage`
- `genres`, `cast`, `directors` — stored as JSON strings (LibSQL limitation)
- `mediaType` — `"movie"` | `"tv"`
- `userRating` — 1–5 (nullable), `isFavorite` — boolean, `userNotes`, `watchedDate`, `validated`

**TvSeason** — Season tracking per Movie (linked by `movieId`)
- `seasonNumber`, `episodeCount`, `watchedEpisodes`, `airDate`, `overview`
- `episodes` — JSON string: `[{number, name, airDate, watched, stillPath}]`

**WatchlistItem** — Want-to-watch queue
- Same TMDB metadata fields as Movie, plus `streamingInfo` (JSON, for future use)

---

## Key Architectural Decisions

### Prisma 7 + LibSQL (Turso)
Prisma 7 removed the `url` from `schema.prisma` — connection string lives in `prisma.config.ts`. The `prisma-client` generator requires a driver adapter; we use `@prisma/adapter-libsql`. Local dev uses a SQLite file (`dev.db`); production uses Turso. The client is generated at `src/generated/prisma/client`.

### JSON fields in LibSQL
`genres`, `cast`, `directors`, `streamingInfo`, `episodes` are stored as JSON strings. All serialization/deserialization is centralized in `src/lib/db/serializers.ts` — zero component changes needed if the DB ever changes.

### Movies vs TV Shows separation
Both live in the single `Movie` table, discriminated by `mediaType`. Library (`/library`) filters to `mediaType==="movie"` client-side. TV Shows (`/tv`) filters to `mediaType==="tv"`. One `useMovies()` hook fetches all — instant filtering, no extra requests.

### TMDB proxy
All TMDB calls go through `/api/tmdb/*` so `TMDB_API_KEY` stays server-side. Never import `tmdb.ts` in Client Components.

### shadcn/ui uses @base-ui/react
This version of shadcn does NOT use Radix UI. Triggers (`DialogTrigger`, etc.) do not support `asChild`. Render trigger content directly inside the trigger component.

### Client-side filtering
The library/TV grids fetch all entries once and filter/sort in React state — instant response. No pagination needed until the library exceeds ~2000 titles.

---

## Imports

### Movie Import
1. Go to `/import` (not currently in nav — direct URL) → paste single-column title list from Google Sheets
2. Titles prefixed/suffixed with `★`, `☆`, or `*` are auto-marked as favorites

### TV Show Import
1. Go to `/tv/import` (linked from the TV Shows page header)
2. Paste two-column TSV from Google Sheets: column A = show name, column B = season number
3. Use `ALL` as season number to import every season TMDB has for that show
4. Each imported season fetches episode lists from TMDB and marks all episodes as watched

---

## Roadmap / Future Features

- **Auth** — NextAuth.js + Google OAuth to support separate lists (Kyle / wife / together)
- **Watch dates** — Google Sheets API + OAuth to read version history
- **Streaming availability** — TMDB watch providers endpoint (`/movie/{id}/watch/providers`)
- **Beyond movies** — Books (Open Library), podcasts, video games (IGDB)

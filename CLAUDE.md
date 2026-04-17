@AGENTS.md

# x-media

Personal media tracking website for Kyle & his wife. Built with Next.js 16, TypeScript, Tailwind, shadcn/ui, Prisma 7, and the TMDB API.

---

## Project Goal

Bring a long-running Google Sheets movie/TV list to life as a visual, interactive website:
1. **Library** — Every movie/TV show ever watched, displayed as a poster grid with ratings and favorites
2. **Watchlist** — A running list of what to watch next, with auto-fetched TMDB details
3. **Import** — Paste a title list from Google Sheets to bulk-import with TMDB matching

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | `src/` dir, TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui | shadcn uses `@base-ui/react` (NOT Radix) — no `asChild` prop on triggers |
| Database | SQLite via Prisma 7 | Uses `@prisma/adapter-libsql` + `@libsql/client` |
| ORM | Prisma 7 | Client generated at `src/generated/prisma/client` |
| Movie data | TMDB API | Proxied server-side via `/api/tmdb/*` — key never exposed to client |
| State | React Query (@tanstack/react-query) | Used for client mutations with optimistic updates |

## Design System

- **Theme**: Always dark — `dark` class forced on `<html>`. Deep cinematic palette (`oklch(0.07 0 0)` background).
- **Accent**: Amber (`amber-400` / `text-amber-400`) for stars, favorites, active filter counts.
- **Images**: TMDB `w500` in grid cards (Retina-crisp), `original` for backdrops, `w342` for posters in modal.
- **Animations**: Pure CSS transitions — `group-hover:` pattern for cards, Tailwind `animate-in`/`animate-out` with `data-open`/`data-closed` for modals.
- **Movie detail**: Modal overlay (`@base-ui/react/dialog` used directly in `MovieDetailModal.tsx`), NOT page navigation. `/library/[id]` still exists for direct URL access.
- **Default sort**: A-Z (`sortBy = "title"`).
- **Filters**: Hidden behind a "Filters" toggle button — collapsible with CSS `max-h` transition.
- **No `asChild`**: All shadcn triggers render children directly (base-ui pattern).

---

## Environment Variables

```
DATABASE_URL="file:./dev.db"   # SQLite file path (relative to prisma.config.ts)
TMDB_API_KEY="..."             # Free key from themoviedb.org
```

---

## Getting Started

```bash
npm install
npx prisma generate         # Regenerate client after schema changes
npx prisma migrate dev      # Apply schema migrations
npm run dev                 # http://localhost:3000
```

First time setup: add your TMDB API key to `.env`, then go to `/import` and paste your Google Sheets title column.

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                 # Root layout — wraps with QueryProvider, Navbar, MobileNav
│   ├── page.tsx                   # Redirects → /library
│   ├── library/
│   │   ├── page.tsx               # Movie grid page (Server Component)
│   │   └── [id]/page.tsx          # Movie detail page (Server Component)
│   ├── watchlist/page.tsx         # Watchlist page (Client Component)
│   ├── import/page.tsx            # Import page (Client Component)
│   └── api/
│       ├── movies/route.ts        # GET all, POST add by tmdbId
│       ├── movies/[id]/route.ts   # GET, PATCH (rating/favorite), DELETE
│       ├── watchlist/route.ts     # GET all, POST add by tmdbId
│       ├── watchlist/[id]/route.ts# PATCH, DELETE
│       ├── tmdb/search/route.ts   # Proxy: ?q=title&type=movie|tv
│       ├── tmdb/details/route.ts  # Proxy: ?tmdbId=123&type=movie|tv
│       └── import/route.ts        # POST bulk title import
├── components/
│   ├── ui/                        # shadcn auto-generated (do not edit)
│   ├── layout/
│   │   ├── Navbar.tsx             # Sticky top nav (desktop)
│   │   └── MobileNav.tsx          # Fixed bottom tab bar (mobile, hidden sm+)
│   ├── library/
│   │   ├── MovieGrid.tsx          # Client: filters, sort, search state
│   │   ├── MovieCard.tsx          # Poster card with hover overlay
│   │   ├── MovieCardSkeleton.tsx
│   │   ├── MovieSearch.tsx        # Client-side title search input
│   │   ├── MovieFilters.tsx       # Genre chips + favorites toggle + sort
│   │   └── FavoriteToggle.tsx     # Star button with optimistic React Query mutation
│   ├── detail/
│   │   ├── MovieDetailContent.tsx # Full detail view — backdrop, poster, tabs
│   │   ├── StarRating.tsx         # 1–5 star rating (click same star to clear)
│   │   ├── CastList.tsx           # Top 10 cast members with profile photos
│   │   └── SeasonTracker.tsx      # TV season progress list
│   ├── watchlist/
│   │   ├── WatchlistCard.tsx      # Single watchlist item card
│   │   └── AddToWatchlistDialog.tsx # Search-as-you-type dialog (movies + TV)
│   └── import/
│       ├── ImportForm.tsx         # Textarea paste + CSV file upload
│       ├── ImportPreview.tsx      # Editable preview before confirming
│       └── ImportProgress.tsx     # Result summary (matched/unmatched/errors)
├── lib/
│   ├── prisma.ts                  # Singleton PrismaClient with libsql adapter
│   ├── tmdb.ts                    # TMDB fetch helpers + extractMovieData()
│   ├── db/
│   │   ├── movies.ts              # getMovies, getMovie, upsertMovie, updateMovie, deleteMovie
│   │   ├── watchlist.ts           # getWatchlistItems, addToWatchlist, removeFromWatchlist
│   │   └── serializers.ts         # JSON.parse/stringify for SQLite JSON fields
│   └── utils/
│       ├── parseImport.ts         # Title list parser — detects ★ / * favorites, season suffixes
│       └── rateLimit.ts           # Batch processor respecting TMDB 40 req/10s limit
├── hooks/
│   ├── useMovies.ts               # React Query: movie list + optimistic update mutation
│   ├── useWatchlist.ts            # React Query: watchlist CRUD
│   └── useTmdbSearch.ts           # Debounced TMDB search (300ms)
├── providers/QueryProvider.tsx    # React Query client wrapper
└── types.ts                       # Shared TypeScript types (Movie, WatchlistItem, etc.)

prisma/
├── schema.prisma                  # DB schema — Movie, TvSeason, WatchlistItem, ImportLog
└── migrations/                    # Auto-generated migration files
prisma.config.ts                   # Prisma 7 config — datasource URL, migration path
```

---

## Database Schema

**Movie** — Everything watched
- `tmdbId` (unique) — TMDB movie/show ID
- `title`, `overview`, `posterPath`, `backdropPath`, `releaseDate`, `runtime`, `voteAverage`
- `genres`, `cast`, `directors` — stored as JSON strings (SQLite limitation)
- `mediaType` — `"movie"` | `"tv"`
- `userRating` — 1–5 (nullable), `isFavorite` — boolean, `userNotes`, `watchedDate`

**TvSeason** — Season tracking per Movie (linked by `movieId`)
- `seasonNumber`, `episodeCount`, `watchedEpisodes`

**WatchlistItem** — Want-to-watch queue
- Same TMDB metadata fields as Movie, plus `streamingInfo` (JSON, for future use)

**ImportLog** — Audit trail of each bulk import

---

## Key Architectural Decisions

### Prisma 7 + SQLite
Prisma 7 removed the `url` from `schema.prisma` — connection string lives in `prisma.config.ts`. The new `prisma-client` generator requires a driver adapter; we use `@prisma/adapter-libsql`. The client is at `src/generated/prisma/client` (not `@prisma/client`).

### JSON fields in SQLite
`genres`, `cast`, `directors`, `streamingInfo`, `results` are stored as JSON strings. All serialization/deserialization is centralized in `src/lib/db/serializers.ts`. When migrating to Postgres, change these fields to `Json` type in schema and remove `JSON.parse/stringify` in serializers — zero component changes needed.

### TMDB proxy
All TMDB calls go through `/api/tmdb/*` so `TMDB_API_KEY` stays server-side. Never import `tmdb.ts` in Client Components.

### shadcn/ui uses @base-ui/react
This version of shadcn does NOT use Radix UI. Triggers (`DialogTrigger`, etc.) do not support `asChild`. Render trigger content directly inside the trigger component.

### Client-side filtering
The library grid fetches all movies once and filters/sorts in React state — instant response. No pagination needed until the library exceeds ~2000 titles.

---

## Google Sheets Import

1. In Google Sheets, select the movie title column → Copy
2. Go to `/import` → paste into the textarea → **Preview Import**
3. Review the list (edit titles, toggle favorites, remove rows)
4. Click **Import** — each title is searched on TMDB, top result is stored
5. Unmatched titles are listed after import for manual review

**Favorite detection**: Titles prefixed/suffixed with `★`, `☆`, or `*` are auto-marked as favorites.

**TV shows**: Titles ending in `Season N` are detected as TV and searched accordingly.

**Rate limiting**: 35 TMDB requests per batch, 10s pause between batches. A 200-title import takes ~60 seconds.

---

## Roadmap / Future Features

- **Auth** — NextAuth.js + Google OAuth to support separate lists (Kyle / wife / together)
- **Watch dates** — Google Sheets API + OAuth to read version history
- **Streaming availability** — TMDB watch providers endpoint (`/movie/{id}/watch/providers`)
- **Episode-level TV** — Expand `TvSeason` with individual episode records
- **Beyond movies** — Books (Open Library), podcasts, video games (IGDB)

### Vercel Deployment (when ready)
1. Change `prisma/schema.prisma` datasource provider to `postgresql`
2. Change `String` JSON fields → `Json` type, update `serializers.ts`
3. Set `DATABASE_URL` to a Neon or Supabase connection string
4. Add `TMDB_API_KEY` to Vercel environment variables
5. `npx prisma migrate deploy`

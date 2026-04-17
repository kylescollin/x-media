-- CreateTable
CREATE TABLE "Movie" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tmdbId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "overview" TEXT,
    "posterPath" TEXT,
    "backdropPath" TEXT,
    "releaseDate" TEXT,
    "runtime" INTEGER,
    "voteAverage" REAL,
    "genres" TEXT NOT NULL,
    "cast" TEXT,
    "directors" TEXT,
    "mediaType" TEXT NOT NULL DEFAULT 'movie',
    "watched" BOOLEAN NOT NULL DEFAULT true,
    "watchedDate" DATETIME,
    "userRating" INTEGER,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "userNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TvSeason" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "movieId" INTEGER NOT NULL,
    "seasonNumber" INTEGER NOT NULL,
    "episodeCount" INTEGER,
    "watchedEpisodes" INTEGER NOT NULL DEFAULT 0,
    "airDate" TEXT,
    "overview" TEXT,
    CONSTRAINT "TvSeason_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WatchlistItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tmdbId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL DEFAULT 'movie',
    "posterPath" TEXT,
    "overview" TEXT,
    "releaseDate" TEXT,
    "runtime" INTEGER,
    "genres" TEXT,
    "streamingInfo" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Movie_tmdbId_key" ON "Movie"("tmdbId");

-- CreateIndex
CREATE UNIQUE INDEX "TvSeason_movieId_seasonNumber_key" ON "TvSeason"("movieId", "seasonNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistItem_tmdbId_key" ON "WatchlistItem"("tmdbId");


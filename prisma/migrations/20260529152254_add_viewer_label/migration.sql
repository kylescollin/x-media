/*
  Warnings:

  - You are about to drop the `ImportLog` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ImportLog";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Movie" (
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
    "validated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Movie" ("backdropPath", "cast", "createdAt", "directors", "genres", "id", "isFavorite", "mediaType", "overview", "posterPath", "releaseDate", "runtime", "title", "tmdbId", "updatedAt", "userNotes", "userRating", "voteAverage", "watched", "watchedDate") SELECT "backdropPath", "cast", "createdAt", "directors", "genres", "id", "isFavorite", "mediaType", "overview", "posterPath", "releaseDate", "runtime", "title", "tmdbId", "updatedAt", "userNotes", "userRating", "voteAverage", "watched", "watchedDate" FROM "Movie";
DROP TABLE "Movie";
ALTER TABLE "new_Movie" RENAME TO "Movie";
CREATE UNIQUE INDEX "Movie_tmdbId_key" ON "Movie"("tmdbId");
CREATE TABLE "new_WatchlistItem" (
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
    "viewerLabel" TEXT NOT NULL DEFAULT 'mine',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_WatchlistItem" ("addedAt", "genres", "id", "mediaType", "overview", "posterPath", "priority", "releaseDate", "runtime", "streamingInfo", "title", "tmdbId", "updatedAt") SELECT "addedAt", "genres", "id", "mediaType", "overview", "posterPath", "priority", "releaseDate", "runtime", "streamingInfo", "title", "tmdbId", "updatedAt" FROM "WatchlistItem";
DROP TABLE "WatchlistItem";
ALTER TABLE "new_WatchlistItem" RENAME TO "WatchlistItem";
CREATE UNIQUE INDEX "WatchlistItem_tmdbId_key" ON "WatchlistItem"("tmdbId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

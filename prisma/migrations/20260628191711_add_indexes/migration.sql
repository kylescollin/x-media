-- CreateIndex
CREATE INDEX "Movie_createdAt_idx" ON "Movie"("createdAt");

-- CreateIndex
CREATE INDEX "Movie_mediaType_idx" ON "Movie"("mediaType");

-- CreateIndex
CREATE INDEX "WatchlistItem_priority_addedAt_idx" ON "WatchlistItem"("priority", "addedAt");

import { QueryClient, type QueryClientConfig } from "@tanstack/react-query";

/**
 * Shared React Query defaults — the single source of truth used by both the
 * client provider and per-request server prefetch, so hydrated data isn't
 * immediately refetched and the two configs can't drift.
 *
 * `gcTime` keeps ephemeral queries (e.g. TMDB searches) from lingering in
 * memory long after they go unused.
 */
export const queryConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
};

/**
 * Creates a fresh QueryClient for server-side prefetching. A new instance is
 * made per request so cached data never leaks between users.
 */
export function makeQueryClient() {
  return new QueryClient(queryConfig);
}

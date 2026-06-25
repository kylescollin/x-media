import { QueryClient } from "@tanstack/react-query";

/**
 * Creates a fresh QueryClient for server-side prefetching. A new instance is
 * made per request so cached data never leaks between users. The `staleTime`
 * matches the client provider so hydrated data isn't immediately refetched.
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });
}

import { useQuery } from "@tanstack/react-query";
import { backendFetch } from "../backend";

/**
 * Hook to perform a global search across projects, files, and comments
 * @param {Object} options - Search options
 * @param {string} options.query - The search query
 * @param {string} options.filter - Filter type: 'all', 'projects', 'files', or 'comments'
 * @returns {Object} Query result with search data
 */
export function useSearch({ query, filter = "all" }) {
  return useQuery({
    queryKey: ["search", query, filter],
    queryFn: () =>
      backendFetch(
        `/search?query=${encodeURIComponent(query)}&filter=${filter}`,
      ),
    enabled: !!query && query.length >= 2, // Only search when query is at least 2 characters
    staleTime: 1000 * 60 * 5, // Cache results for 5 minutes
  });
}

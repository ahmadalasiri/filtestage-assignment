import { useQuery } from "@tanstack/react-query";
import { backendFetch } from "../backend";

export function useUser(userId) {
  return useQuery({
    queryKey: ["users", userId],
    queryFn: () => backendFetch(`/users/${userId}`),
  });
}

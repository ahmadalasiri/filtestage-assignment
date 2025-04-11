import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { backendFetch } from "../backend";

export function useComments({ fileId }) {
  return useQuery({
    queryKey: ["comments", fileId],
    queryFn: () => backendFetch(`/comments?fileId=${fileId}`),
    initialData: [],
  });
}

export function useCreateComment({ fileId }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ body, x, y }) =>
      backendFetch("/comments", {
        method: "POST",
        body: JSON.stringify({ fileId, body, x, y }),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: (comment) => {
      queryClient.setQueryData(["comments", fileId], (data) => [
        ...data,
        comment,
      ]);
    },
  });
}

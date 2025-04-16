import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { backendFetch } from "../backend";
import { getSocket } from "../services/socketService";

// Get all comments for a file with pagination
export function useComments({ fileId, limit = 10 }) {
  return useInfiniteQuery({
    queryKey: ["comments", fileId],
    queryFn: ({ pageParam = 1 }) =>
      backendFetch(
        `/comments?fileId=${fileId}&page=${pageParam}&limit=${limit}`,
      ),
    initialData: {
      pages: [
        {
          comments: [],
          pagination: { total: 0, page: 1, limit, totalPages: 0 },
        },
      ],
      pageParams: [1],
    },
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage;
      return pagination.page < pagination.totalPages
        ? pagination.page + 1
        : undefined;
    },
  });
}

// Get a specific comment thread by its parent ID
export function useCommentThread({ commentId, fileId }) {
  return useQuery({
    queryKey: ["commentThread", commentId],
    queryFn: () =>
      backendFetch(`/comments?fileId=${fileId}&threadId=${commentId}`),
    enabled: !!commentId && !!fileId,
  });
}

// Create a new comment or reply
export function useCreateComment({ fileId }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ body, x, y, parentId, annotation }) =>
      backendFetch("/comments", {
        method: "POST",
        body: JSON.stringify({ fileId, body, x, y, parentId, annotation }),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: (newComment) => {
      // Invalidate all comment queries to refresh the data
      queryClient.invalidateQueries({
        queryKey: ["comments", fileId],
      });

      // Emit the new comment to other users in the file room
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit("new-comment", {
          comment: newComment,
          fileId: fileId,
        });
      }
    },
  });
}

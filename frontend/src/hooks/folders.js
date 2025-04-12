import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { backendFetch } from "../backend";

// Get all folders with hierarchy and projects
export function useFolders({ select } = {}) {
  return useQuery({
    queryKey: ["folders"],
    queryFn: async () => {
      const response = await backendFetch("/folders");
      return response.allFolders || [];
    },
    select,
    initialData: [],
  });
}

// Get folder hierarchy with projects
export function useFolderHierarchy() {
  return useQuery({
    queryKey: ["folderHierarchy"],
    queryFn: async () => {
      const response = await backendFetch("/folders");
      return response.folders || [];
    },
    initialData: [],
  });
}

// Create a folder
export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, parentFolderId = null }) =>
      backendFetch("/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parentFolderId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(["folders"]);
      queryClient.invalidateQueries(["folderHierarchy"]);
    },
  });
}

// Update a folder
export function useUpdateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ folderId, name }) =>
      backendFetch(`/folders/${folderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(["folders"]);
      queryClient.invalidateQueries(["folderHierarchy"]);
    },
  });
}

// Delete a folder
export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ folderId }) =>
      backendFetch(`/folders/${folderId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(["folders"]);
      queryClient.invalidateQueries(["folderHierarchy"]);
    },
  });
}

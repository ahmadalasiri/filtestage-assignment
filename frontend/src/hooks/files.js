import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { backendFetch } from "../backend";

export function useFiles(projectId) {
  return useQuery({
    queryKey: ["files", projectId],
    queryFn: () => backendFetch(`/files?projectId=${projectId}`),
    initialData: [],
  });
}

export function useSelectedFile() {
  const { fileId } = useParams();
  return useQuery({
    queryKey: ["files", fileId],
    queryFn: () => backendFetch(`/files/${fileId}`),
  });
}

export function useUpdateDeadline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ fileId, deadline }) => {
      return backendFetch(`/files/${fileId}/deadline`, {
        method: "PATCH",
        body: JSON.stringify({ deadline: deadline ? deadline.toISOString() : null }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: (file) => {
      queryClient.setQueryData(["files", file._id], file);
      queryClient.invalidateQueries(["files", file.projectId]);
    },
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, file, deadline }) => {
      const formData = new FormData();
      formData.append("projectId", projectId);
      formData.append("file", file);
      if (deadline) {
        formData.append("deadline", deadline.toISOString());
      }
      return backendFetch("/files", {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: (file) => {
      queryClient.invalidateQueries(["files", file.projectId]);
    },
  });
}

// Hook to upload a new version of a file
export function useUploadFileVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ fileId, file }) => {
      const formData = new FormData();
      formData.append("file", file);
      return backendFetch(`/files/${fileId}/versions`, {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: (newVersion) => {
      // Invalidate the project files query to show the updated files
      queryClient.invalidateQueries(["files", newVersion.projectId]);
    },
  });
}

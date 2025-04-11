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

export function useUploadFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, file }) => {
      const formData = new FormData();
      formData.append("projectId", projectId);
      formData.append("file", file);
      return backendFetch("/files", {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: (file) => {
      queryClient.setQueryData(["files", file.projectId], (data) => [
        ...data,
        file,
      ]);
    },
  });
}

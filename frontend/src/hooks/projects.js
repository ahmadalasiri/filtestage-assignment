import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { backendFetch } from "../backend";

export function useProjects({ select } = {}) {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => backendFetch("/projects"),
    select,
    initialData: [],
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: ({ name, folderId }) =>
      backendFetch("/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, folderId }),
      }),
    onSuccess: (project) => {
      queryClient.setQueryData(["projects"], (data) => [...data, project]);
      queryClient.invalidateQueries(["folderHierarchy"]);
      navigate(`/projects/${project._id}`);
    },
  });
}

export function useInviteReviewer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, email }) =>
      backendFetch(`/projects/${projectId}/reviewers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }),
    onSuccess: (updatedProject) => {
      queryClient.setQueryData(["projects"], (data) =>
        data.map((project) =>
          project._id === updatedProject._id ? updatedProject : project,
        ),
      );
    },
  });
}

export function useSelectedProject() {
  const { projectId } = useParams();
  return useProjects({
    select: (projects) => projects.find((project) => project._id === projectId),
  });
}

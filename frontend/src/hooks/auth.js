import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { backendFetch } from "../backend";

export function useSession() {
  return useQuery({
    queryKey: ["auth"],
    queryFn: () => backendFetch("/auth/session"),
  });
}

export function useLogin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  return useMutation({
    mutationFn: ({ email, password }) =>
      backendFetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }),
    onSuccess: (session) => {
      queryClient.setQueryData(["auth"], session);
      const redirect = searchParams.get("redirect");
      navigate(redirect ? decodeURIComponent(redirect) : "/projects", {
        replace: true,
      });
    },
  });
}

export function useSignUp() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  return useMutation({
    mutationFn: ({ email, password }) =>
      backendFetch(`/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }),
    onSuccess: (session) => {
      queryClient.setQueryData(["auth"], session);
      const redirect = searchParams.get("redirect");
      navigate(redirect ? decodeURIComponent(redirect) : "/projects", {
        replace: true,
      });
    },
  });
}

export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => backendFetch("/auth/logout", { method: "POST" }),
    onSuccess: () => {
      queryClient.clear();
      navigate("/login");
    },
  });
}

export function useRemoveAccount() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => backendFetch("/auth/remove-account", { method: "POST" }),
    onSuccess: () => {
      queryClient.clear();
      navigate("/login");
    },
  });
}

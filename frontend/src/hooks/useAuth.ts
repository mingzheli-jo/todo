import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import client from "../api/client";

export function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem("toto_token"));
  const queryClient = useQueryClient();

  const login = useCallback(async (username: string, password: string) => {
    const resp = await client.post("/auth/login", { username, password });
    const t = resp.data.access_token;
    localStorage.setItem("toto_token", t);
    setToken(t);
    return t;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("toto_token");
    setToken(null);
    queryClient.clear();
  }, [queryClient]);

  return { token, isLoggedIn: !!token, login, logout };
}

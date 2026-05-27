import client from "./client";

export async function loginApi(username: string, password: string) {
  const resp = await client.post<{ access_token: string }>("/auth/login", { username, password });
  return resp.data;
}

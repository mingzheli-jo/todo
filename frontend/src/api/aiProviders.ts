import client from "./client";
import type { AIProvider, AIProviderCreate } from "../types";

export async function fetchProviders(): Promise<AIProvider[]> {
  const resp = await client.get<AIProvider[]>("/ai-providers");
  return resp.data;
}

export async function createProvider(data: AIProviderCreate): Promise<AIProvider> {
  const resp = await client.post<AIProvider>("/ai-providers", data);
  return resp.data;
}

export async function updateProvider(
  id: string,
  data: Partial<AIProviderCreate>
): Promise<AIProvider> {
  const resp = await client.patch<AIProvider>(`/ai-providers/${id}`, data);
  return resp.data;
}

export async function deleteProvider(id: string): Promise<void> {
  await client.delete(`/ai-providers/${id}`);
}

export async function setDefaultProvider(id: string): Promise<AIProvider> {
  const resp = await client.post<AIProvider>(`/ai-providers/${id}/set-default`);
  return resp.data;
}

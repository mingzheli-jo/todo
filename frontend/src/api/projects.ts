import client from "./client";
import type { Project, PDCALog } from "../types";

export async function fetchProjects(includeArchived = false) {
  const resp = await client.get<Project[]>("/projects", {
    params: includeArchived ? { include_archived: true } : undefined,
  });
  return resp.data;
}

export async function fetchProject(id: string) {
  const resp = await client.get<Project>(`/projects/${id}`);
  return resp.data;
}

export async function createProject(data: {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}) {
  const resp = await client.post<Project>("/projects", data);
  return resp.data;
}

export async function updateProject(
  id: string,
  data: Partial<{ name: string; description: string; color: string; icon: string; is_archived: boolean }>
) {
  const resp = await client.patch<Project>(`/projects/${id}`, data);
  return resp.data;
}

export async function advancePDCA(id: string, data: { content: string; outcome?: string }) {
  const resp = await client.post<Project>(`/projects/${id}/pdca/advance`, data);
  return resp.data;
}

export async function fetchPDCALogs(id: string) {
  const resp = await client.get<PDCALog[]>(`/projects/${id}/pdca/logs`);
  return resp.data;
}

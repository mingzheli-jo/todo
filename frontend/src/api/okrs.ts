import client from "./client";
import type { OKR, OKRType, OKRStatus } from "../types";

export async function fetchOKRs(params?: { period?: string; status?: OKRStatus }) {
  const resp = await client.get<OKR[]>("/okrs", { params });
  return resp.data;
}

export async function fetchOKR(id: string) {
  const resp = await client.get<OKR>(`/okrs/${id}`);
  return resp.data;
}

export async function createOKR(data: {
  type: OKRType;
  title: string;
  description?: string;
  period: string;
  parent_id?: string;
  progress?: number;
  status?: OKRStatus;
}) {
  const resp = await client.post<OKR>("/okrs", data);
  return resp.data;
}

export async function updateOKR(
  id: string,
  data: Partial<{ title: string; description: string; period: string; progress: number; status: OKRStatus }>
) {
  const resp = await client.patch<OKR>(`/okrs/${id}`, data);
  return resp.data;
}

export async function deleteOKR(id: string) {
  await client.delete(`/okrs/${id}`);
}

export async function linkTaskToOKR(okrId: string, taskId: string) {
  await client.post(`/okrs/${okrId}/link-task/${taskId}`);
}

export async function unlinkTaskFromOKR(okrId: string, taskId: string) {
  await client.delete(`/okrs/${okrId}/link-task/${taskId}`);
}

export async function fetchTaskOKRs(taskId: string) {
  const resp = await client.get<OKR[]>(`/okrs/tasks/${taskId}/okrs`);
  return resp.data;
}

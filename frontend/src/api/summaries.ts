import client from "./client";
import type { AISummary, SummaryType } from "../types";

export async function fetchSummaries(params?: { type?: SummaryType; limit?: number }): Promise<AISummary[]> {
  const resp = await client.get<AISummary[]>("/summaries", { params });
  return resp.data;
}

export async function fetchSummary(id: string): Promise<AISummary> {
  const resp = await client.get<AISummary>(`/summaries/${id}`);
  return resp.data;
}

export async function generateSummary(data: {
  type: SummaryType;
  period_start: string;
  period_end: string;
}): Promise<{ task_id: string }> {
  const resp = await client.post<{ task_id: string }>("/summaries/generate", data);
  return resp.data;
}

export async function pushSummaryToFeishu(id: string): Promise<{ success: boolean }> {
  const resp = await client.post<{ success: boolean }>(`/summaries/${id}/push-feishu`);
  return resp.data;
}

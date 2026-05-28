import client from "./client";
import type { AIStatus, DailyReview } from "../types";

export async function fetchReviews(params?: { start_date?: string; end_date?: string }): Promise<DailyReview[]> {
  const resp = await client.get<DailyReview[]>("/reviews", { params });
  return resp.data;
}

export async function fetchTodayReview(): Promise<DailyReview> {
  const resp = await client.get<DailyReview>("/reviews/today");
  return resp.data;
}

export async function upsertReview(data: {
  date: string;
  raw_content?: string;
  mood?: number | null;
}): Promise<DailyReview> {
  const resp = await client.post<DailyReview>("/reviews", data);
  return resp.data;
}

export async function updateReview(
  id: string,
  data: { raw_content?: string; mood?: number | null }
): Promise<DailyReview> {
  const resp = await client.patch<DailyReview>(`/reviews/${id}`, data);
  return resp.data;
}

export async function triggerAIProcess(id: string): Promise<{ task_id: string }> {
  const resp = await client.post<{ task_id: string }>(`/reviews/${id}/ai-process`);
  return resp.data;
}

export async function fetchAIStatus(id: string): Promise<AIStatus> {
  const resp = await client.get<AIStatus>(`/reviews/${id}/ai-status`);
  return resp.data;
}

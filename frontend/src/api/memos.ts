import client from "./client";
import type { Memo, MemoStatusFilter, Task } from "../types";

export async function fetchMemos(status: MemoStatusFilter = "open"): Promise<Memo[]> {
  const resp = await client.get<Memo[]>("/memos", { params: { status } });
  return resp.data;
}

export async function createMemo(content: string): Promise<Memo> {
  const resp = await client.post<Memo>("/memos", { content });
  return resp.data;
}

export async function updateMemo(
  id: string,
  data: { content?: string; is_done?: boolean }
): Promise<Memo> {
  const resp = await client.patch<Memo>(`/memos/${id}`, data);
  return resp.data;
}

export async function deleteMemo(id: string): Promise<void> {
  await client.delete(`/memos/${id}`);
}

export async function convertMemo(
  id: string,
  data: { quadrant?: string; due_date?: string }
): Promise<{ memo: Memo; task: Task }> {
  const resp = await client.post<{ memo: Memo; task: Task }>(`/memos/${id}/convert`, data);
  return resp.data;
}

import client from "./client";
import type { PomodoroSession, PomodoroTodayStats } from "../types";

export async function startSession(data: { task_id?: string; duration_min?: number }) {
  const resp = await client.post<PomodoroSession>("/pomodoro/start", data);
  return resp.data;
}

export async function completeSession(id: string, data: { interrupted?: boolean }) {
  const resp = await client.post<PomodoroSession>(`/pomodoro/${id}/complete`, data);
  return resp.data;
}

export async function fetchCurrentSession() {
  const resp = await client.get<PomodoroSession | null>("/pomodoro/current");
  return resp.data;
}

export async function fetchTodayStats() {
  const resp = await client.get<PomodoroTodayStats>("/pomodoro/today");
  return resp.data;
}

export async function fetchSessions(params?: { start_date?: string; end_date?: string }) {
  const resp = await client.get<PomodoroSession[]>("/pomodoro/sessions", { params });
  return resp.data;
}

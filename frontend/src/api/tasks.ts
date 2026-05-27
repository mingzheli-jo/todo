import client from "./client";
import type { Task, Quadrant, TaskStatus } from "../types";

export async function fetchTasks(params?: { quadrant?: Quadrant; status?: TaskStatus }) {
  const resp = await client.get<Task[]>("/tasks", { params });
  return resp.data;
}

export async function createTask(data: { title: string; quadrant?: Quadrant; description?: string; due_date?: string }) {
  const resp = await client.post<Task>("/tasks", data);
  return resp.data;
}

export async function updateTask(
  id: string,
  data: Partial<{ title: string; quadrant: Quadrant; status: TaskStatus; description: string; due_date: string; priority: number }>
) {
  const resp = await client.patch<Task>(`/tasks/${id}`, data);
  return resp.data;
}

export async function deleteTask(id: string) {
  await client.delete(`/tasks/${id}`);
}

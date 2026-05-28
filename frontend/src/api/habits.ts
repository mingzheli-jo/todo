import client from "./client";
import type { Habit, HabitRecord, HabitTodayStatus, HabitFrequency } from "../types";

export async function fetchHabits(includeInactive = false) {
  const resp = await client.get<Habit[]>("/habits", {
    params: includeInactive ? { include_inactive: true } : undefined,
  });
  return resp.data;
}

export async function fetchHabit(id: string) {
  const resp = await client.get<Habit>(`/habits/${id}`);
  return resp.data;
}

export async function createHabit(data: {
  name: string;
  icon?: string;
  color?: string;
  frequency?: HabitFrequency;
  target_count?: number;
}) {
  const resp = await client.post<Habit>("/habits", data);
  return resp.data;
}

export async function updateHabit(
  id: string,
  data: Partial<{ name: string; icon: string; color: string; frequency: HabitFrequency; target_count: number; is_active: boolean }>
) {
  const resp = await client.patch<Habit>(`/habits/${id}`, data);
  return resp.data;
}

export async function deleteHabit(id: string) {
  await client.delete(`/habits/${id}`);
}

export async function fetchTodayHabits() {
  const resp = await client.get<HabitTodayStatus[]>("/habits/today");
  return resp.data;
}

export async function checkInHabit(
  id: string,
  data: { date?: string; completed: boolean; note?: string }
) {
  const resp = await client.post<HabitRecord>(`/habits/${id}/check-in`, data);
  return resp.data;
}

export async function fetchHabitRecords(id: string, startDate: string, endDate: string) {
  const resp = await client.get<HabitRecord[]>(`/habits/${id}/records`, {
    params: { start_date: startDate, end_date: endDate },
  });
  return resp.data;
}

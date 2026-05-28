import client from "./client";
import type { TodayStats } from "../types";

export async function fetchTodayStats() {
  const resp = await client.get<TodayStats>("/stats/today");
  return resp.data;
}

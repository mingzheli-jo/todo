import client from "./client";
import type { TodayStats, StatsOverview } from "../types";

export async function fetchTodayStats() {
  const resp = await client.get<TodayStats>("/stats/today");
  return resp.data;
}

export async function fetchOverview() {
  const resp = await client.get<StatsOverview>("/stats/overview");
  return resp.data;
}

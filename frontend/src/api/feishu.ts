import client from "./client";
import type { FeishuConfigOut, FeishuConfigUpdate } from "../types";

export async function fetchFeishuConfig(): Promise<FeishuConfigOut> {
  const resp = await client.get<FeishuConfigOut>("/feishu/config");
  return resp.data;
}

export async function updateFeishuConfig(data: FeishuConfigUpdate): Promise<FeishuConfigOut> {
  const resp = await client.put<FeishuConfigOut>("/feishu/config", data);
  return resp.data;
}

export async function deleteFeishuConfig(): Promise<void> {
  await client.delete("/feishu/config");
}

export async function testFeishuWebhook(): Promise<{ success: boolean }> {
  const resp = await client.post<{ success: boolean }>("/feishu/test");
  return resp.data;
}

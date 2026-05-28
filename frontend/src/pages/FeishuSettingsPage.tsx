import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchFeishuConfig, updateFeishuConfig, deleteFeishuConfig, testFeishuWebhook } from "../api/feishu";
import type { FeishuConfigUpdate } from "../types";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${
          checked ? "bg-brand" : "bg-white/[0.10]"
        }`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </div>
      <span className="text-sm text-white/70">{label}</span>
    </label>
  );
}

export default function FeishuSettingsPage() {
  const qc = useQueryClient();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [pushWeekly, setPushWeekly] = useState(true);
  const [pushMonthly, setPushMonthly] = useState(true);
  const [pushHour, setPushHour] = useState(9);
  const [enabled, setEnabled] = useState(true);
  const [testResult, setTestResult] = useState<string | null>(null);

  const { data: config, isLoading } = useQuery({
    queryKey: ["feishu-config"],
    queryFn: fetchFeishuConfig,
  });

  useEffect(() => {
    if (config) {
      setPushWeekly(config.push_weekly);
      setPushMonthly(config.push_monthly);
      setPushHour(config.push_hour);
      setEnabled(config.enabled);
      // Don't prefill webhook URL — it's sensitive; user must re-enter to change
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: FeishuConfigUpdate = {
        push_weekly: pushWeekly,
        push_monthly: pushMonthly,
        push_hour: pushHour,
        enabled,
      };
      if (webhookUrl.trim()) {
        payload.webhook_url = webhookUrl.trim();
      }
      return updateFeishuConfig(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feishu-config"] });
      setWebhookUrl("");
      setTestResult(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFeishuConfig,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feishu-config"] });
      setWebhookUrl("");
      setTestResult(null);
    },
  });

  const testMutation = useMutation({
    mutationFn: testFeishuWebhook,
    onSuccess: () => setTestResult("success"),
    onError: () => setTestResult("error"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center flex-1 text-white/30">加载中...</div>
    );
  }

  return (
    <>
      <header className="px-7 py-4 border-b border-white/[0.06]">
        <h1 className="text-xl font-bold">飞书推送配置</h1>
      </header>

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-lg space-y-6">
          {/* Webhook URL */}
          <div className="bg-white/[0.03] rounded-xl p-5 border border-white/[0.06] space-y-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-white/25">
              Webhook 配置
            </div>

            <div>
              <label className="block text-xs text-white/40 mb-1.5">
                飞书群机器人 Webhook URL
                {config?.has_webhook && (
                  <span className="ml-2 text-emerald-400/70">（已配置，留空则不修改）</span>
                )}
              </label>
              <input
                type="password"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder={config?.has_webhook ? "已配置，输入新地址覆盖" : "https://open.feishu.cn/open-apis/bot/v2/hook/..."}
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none focus:border-brand/50 transition"
              />
            </div>

            <Toggle checked={enabled} onChange={setEnabled} label="启用飞书推送" />
          </div>

          {/* Push settings */}
          <div className="bg-white/[0.03] rounded-xl p-5 border border-white/[0.06] space-y-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-white/25">
              推送设置
            </div>

            <Toggle checked={pushWeekly} onChange={setPushWeekly} label="推送周汇总（每周一）" />
            <Toggle checked={pushMonthly} onChange={setPushMonthly} label="推送月汇总（每月1日）" />

            <div>
              <label className="block text-xs text-white/40 mb-1.5">推送时间（小时，24h 制）</label>
              <select
                value={pushHour}
                onChange={(e) => setPushHour(Number(e.target.value))}
                className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand/50 transition"
              >
                {HOURS.map((h) => (
                  <option key={h} value={h} className="bg-gray-900">
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Test result */}
          {testResult === "success" && (
            <div className="text-sm text-emerald-400 bg-emerald-400/10 rounded-lg px-4 py-2">
              测试消息发送成功！请检查飞书群是否收到消息。
            </div>
          )}
          {testResult === "error" && (
            <div className="text-sm text-red-400 bg-red-400/10 rounded-lg px-4 py-2">
              测试发送失败，请检查 Webhook URL 是否正确。
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-brand to-brand-light text-white text-sm font-semibold shadow-lg shadow-brand/30 disabled:opacity-50 transition"
            >
              {saveMutation.isPending ? "保存中..." : "保存配置"}
            </button>
            <button
              onClick={() => { setTestResult(null); testMutation.mutate(); }}
              disabled={testMutation.isPending || !config?.has_webhook}
              className="px-4 py-2.5 rounded-lg bg-white/[0.06] text-white/60 text-sm hover:bg-white/[0.10] hover:text-white/80 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {testMutation.isPending ? "发送中..." : "发送测试消息"}
            </button>
          </div>

          {/* Danger zone */}
          {config?.has_webhook && (
            <div className="bg-red-500/[0.05] rounded-xl p-4 border border-red-500/[0.15]">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-red-400/50 mb-3">
                危险操作
              </div>
              <button
                onClick={() => {
                  if (window.confirm("确认删除飞书推送配置？")) {
                    deleteMutation.mutate();
                  }
                }}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition disabled:opacity-50"
              >
                {deleteMutation.isPending ? "删除中..." : "删除配置"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

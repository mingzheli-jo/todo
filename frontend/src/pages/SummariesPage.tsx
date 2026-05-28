import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSummaries, generateSummary, pushSummaryToFeishu } from "../api/summaries";
import type { AISummary, SummaryMetrics, SummaryType } from "../types";

function getWeekRange(): { start: string; end: string } {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: formatDate(monday), end: formatDate(sunday) };
}

function getMonthRange(): { start: string; end: string } {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { start: formatDate(start), end: formatDate(end) };
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function MetricsCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white/[0.04] rounded-xl p-3 border border-white/[0.06]">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-1">{label}</div>
      <div className="text-xl font-bold text-white/90">{value}</div>
      {sub && <div className="text-xs text-white/40 mt-0.5">{sub}</div>}
    </div>
  );
}

function MetricsDashboard({ metrics }: { metrics: SummaryMetrics }) {
  const tasks = metrics.tasks;
  const habits = metrics.habits;
  const pomodoro = metrics.pomodoro;
  const okrs = metrics.okrs;

  return (
    <div className="space-y-3">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-white/25">统计概览</div>
      <div className="grid grid-cols-2 gap-2">
        {tasks && (
          <MetricsCard
            label="完成任务"
            value={tasks.completed_total}
            sub={`重要紧急 ${tasks.completed_by_quadrant?.urgent_important ?? 0} / 重要 ${tasks.completed_by_quadrant?.important ?? 0}`}
          />
        )}
        {habits && (
          <MetricsCard
            label="习惯完成率"
            value={`${Math.round((habits.completion_rate ?? 0) * 100)}%`}
            sub={habits.best_streak_habit ? `最佳: ${habits.best_streak_habit}` : undefined}
          />
        )}
        {pomodoro && (
          <MetricsCard
            label="番茄钟"
            value={pomodoro.completed_sessions}
            sub={`共 ${pomodoro.total_minutes} 分钟`}
          />
        )}
        {okrs && (
          <MetricsCard
            label="OKR 平均进度"
            value={`${okrs.avg_progress}%`}
            sub={`完成 ${okrs.completed_count} 个关键结果`}
          />
        )}
      </div>
    </div>
  );
}

function SummaryDetail({
  summary,
  onPush,
  isPushing,
}: {
  summary: AISummary;
  onPush: () => void;
  isPushing: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-white/80">
            {summary.period_start} ~ {summary.period_end}
          </div>
          <div className="text-xs text-white/40 mt-0.5">
            {summary.type === "weekly" ? "周汇总" : "月汇总"}
          </div>
        </div>
        {!summary.pushed_feishu && (
          <button
            onClick={onPush}
            disabled={isPushing}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand to-brand-light text-white text-xs font-semibold shadow-lg shadow-brand/30 disabled:opacity-50"
          >
            {isPushing ? "推送中..." : "推送到飞书"}
          </button>
        )}
        {summary.pushed_feishu && (
          <span className="text-xs text-emerald-400/80 bg-emerald-400/10 px-2 py-1 rounded-lg">
            已推送飞书
          </span>
        )}
      </div>

      {/* Metrics */}
      {summary.metrics && <MetricsDashboard metrics={summary.metrics} />}

      {/* AI Content */}
      <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-3">AI 汇总</div>
        {summary.content ? (
          <p className="text-white/75 text-sm leading-relaxed whitespace-pre-wrap">{summary.content}</p>
        ) : (
          <p className="text-white/30 text-sm">暂无汇总内容</p>
        )}
      </div>
    </div>
  );
}

export default function SummariesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<SummaryType>("weekly");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: summaries = [], isLoading } = useQuery({
    queryKey: ["summaries", tab],
    queryFn: () => fetchSummaries({ type: tab, limit: 20 }),
  });

  const selectedSummary = summaries.find((s) => s.id === selectedId) ?? summaries[0] ?? null;

  const generateMutation = useMutation({
    mutationFn: () => {
      const range = tab === "weekly" ? getWeekRange() : getMonthRange();
      return generateSummary({ type: tab, period_start: range.start, period_end: range.end });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["summaries", tab] });
    },
  });

  const pushMutation = useMutation({
    mutationFn: (id: string) => pushSummaryToFeishu(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["summaries", tab] });
    },
  });

  return (
    <>
      <header className="px-7 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">周/月汇总</h1>
          {/* Tabs */}
          <div className="flex gap-1 bg-white/[0.04] rounded-lg p-1">
            {(["weekly", "monthly"] as SummaryType[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setSelectedId(null); }}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                  tab === t
                    ? "bg-gradient-to-r from-brand to-brand-light text-white shadow"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                {t === "weekly" ? "周汇总" : "月汇总"}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-brand to-brand-light text-white text-xs font-semibold shadow-lg shadow-brand/30 disabled:opacity-50"
        >
          {generateMutation.isPending ? "生成中..." : "生成本期汇总"}
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: list */}
        <div className="w-64 flex-shrink-0 border-r border-white/[0.06] overflow-y-auto p-3 space-y-2">
          {isLoading ? (
            <div className="text-center text-white/30 py-10 text-sm">加载中...</div>
          ) : summaries.length === 0 ? (
            <div className="text-center text-white/25 py-10 text-sm">
              <div className="text-3xl mb-2">📊</div>
              <div>暂无汇总</div>
              <div className="text-xs mt-1">点击右上角生成</div>
            </div>
          ) : (
            summaries.map((s) => {
              const active = (selectedId ?? summaries[0]?.id) === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full text-left rounded-xl p-3 transition border ${
                    active
                      ? "bg-brand/10 border-brand/30"
                      : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="text-xs font-semibold text-white/80 truncate">
                    {s.period_start} ~ {s.period_end}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-white/30">{s.type === "weekly" ? "周" : "月"}</span>
                    {s.pushed_feishu && (
                      <span className="text-[10px] text-emerald-400/70">已推送</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Right: detail */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedSummary ? (
            <SummaryDetail
              summary={selectedSummary}
              onPush={() => pushMutation.mutate(selectedSummary.id)}
              isPushing={pushMutation.isPending}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-white/25 text-sm">
              选择左侧汇总查看详情
            </div>
          )}
        </div>
      </div>
    </>
  );
}

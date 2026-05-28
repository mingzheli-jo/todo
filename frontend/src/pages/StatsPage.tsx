import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchOverview } from "../api/stats";
import type { StatsOverview } from "../types";

const DAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];
const PHASE_CN: Record<string, string> = { plan: "计划", do: "执行", check: "检查", act: "改进" };
const PHASE_ORDER = ["plan", "do", "check", "act"];

const QUADRANT_COLORS: Record<string, string> = {
  urgent_important: "#ef4444",
  important: "#f59e0b",
  urgent: "#3b82f6",
  neither: "#6b7280",
};

const QUADRANT_LABELS: Record<string, string> = {
  urgent_important: "紧急重要",
  important: "重要不急",
  urgent: "紧急不重要",
  neither: "都不",
};

function KPICard({ value, label, accent }: { value: string | number; label: string; accent: string }) {
  return (
    <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.04]">
      <div className={`text-3xl font-bold ${accent}`}>{value}</div>
      <div className="text-[11px] text-white/40 mt-2 uppercase tracking-wider">{label}</div>
    </div>
  );
}

function DailyBars({ data }: { data: StatsOverview["tasks"]["completed_last_7_days"] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex items-end gap-2 h-40">
      {data.map((d) => {
        const heightPct = (d.count / max) * 100;
        const day = new Date(d.date);
        const dow = DAY_LABELS[day.getDay()];
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5">
            <div className="text-[10px] text-white/60 font-mono">{d.count}</div>
            <div className="w-full flex-1 flex items-end">
              <div
                className="w-full bg-gradient-to-t from-brand to-brand-light rounded-t-md transition-all"
                style={{ height: `${Math.max(2, heightPct)}%`, minHeight: d.count > 0 ? "8px" : "2px" }}
              />
            </div>
            <div className="text-[10px] text-white/40">{dow}</div>
          </div>
        );
      })}
    </div>
  );
}

function QuadrantDonut({ data }: { data: StatsOverview["tasks"]["by_quadrant_active"] }) {
  const entries = Object.entries(data) as [keyof typeof data, number][];
  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  const r = 56;
  const cx = 75;
  const cy = 75;

  let angle = -Math.PI / 2;
  const segments = entries.map(([key, value]) => {
    if (total === 0 || value === 0) return null;
    const sweep = (value / total) * Math.PI * 2;
    const start = angle;
    const end = angle + sweep;
    angle = end;

    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const largeArc = sweep > Math.PI ? 1 : 0;

    return (
      <path
        key={key}
        d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
        fill={QUADRANT_COLORS[key]}
        opacity={0.85}
      />
    );
  });

  return (
    <div className="flex items-center gap-6">
      <div className="relative">
        <svg width="150" height="150" viewBox="0 0 150 150">
          {total === 0 ? (
            <circle cx={cx} cy={cy} r={r} fill="rgba(255,255,255,0.04)" />
          ) : (
            segments
          )}
          <circle cx={cx} cy={cy} r={32} fill="#0f0f18" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-2xl font-bold text-white">{total}</div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider">活跃</div>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 text-xs">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: QUADRANT_COLORS[key] }} />
            <span className="text-white/60 flex-1">{QUADRANT_LABELS[key]}</span>
            <span className="text-white/40 font-mono">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PDCAIndicator({ phase }: { phase: string }) {
  const idx = PHASE_ORDER.indexOf(phase);
  return (
    <div className="flex gap-1">
      {PHASE_ORDER.map((p, i) => (
        <span
          key={p}
          className={`w-1.5 h-1.5 rounded-full ${
            i < idx ? "bg-emerald-500/60" : i === idx ? "bg-brand shadow-[0_0_6px_rgba(99,102,241,0.6)]" : "bg-white/10"
          }`}
        />
      ))}
    </div>
  );
}

export default function StatsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["stats", "overview"],
    queryFn: fetchOverview,
    refetchInterval: 60_000,
  });

  if (isLoading || !data) {
    return (
      <>
        <header className="px-7 py-4 border-b border-white/[0.06]">
          <h1 className="text-xl font-bold">📈 数据统计</h1>
        </header>
        <div className="flex-1 p-6 text-center text-white/30 py-20">加载中...</div>
      </>
    );
  }

  return (
    <>
      <header className="px-7 py-4 border-b border-white/[0.06]">
        <h1 className="text-xl font-bold">📈 数据统计</h1>
      </header>
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard value={data.tasks.total} label="累计任务" accent="text-purple-300" />
          <KPICard value={data.tasks.completed} label="已完成" accent="text-emerald-400" />
          <KPICard value={`${data.tasks.completion_rate}%`} label="完成率" accent="text-sky-400" />
          <KPICard value={data.pomodoro.total_minutes_all_time} label="累计专注分钟" accent="text-amber-400" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white/[0.03] rounded-xl p-5 border border-white/[0.04]">
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-4">
              近 7 天任务完成趋势
            </h3>
            <DailyBars data={data.tasks.completed_last_7_days} />
          </div>
          <div className="bg-white/[0.03] rounded-xl p-5 border border-white/[0.04]">
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-4">
              象限分布（活跃任务）
            </h3>
            <QuadrantDonut data={data.tasks.by_quadrant_active} />
          </div>
        </div>

        {/* Modules Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Projects */}
          <div className="bg-white/[0.03] rounded-xl p-5 border border-white/[0.04]">
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-4">
              项目 PDCA
            </h3>
            {data.projects.length === 0 ? (
              <div className="text-center py-6">
                <div className="text-white/30 text-xs mb-2">暂无项目</div>
                <Link to="/projects" className="text-[11px] text-brand-light/70 hover:text-brand-light">
                  新建项目 →
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {data.projects.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center gap-2.5">
                    <span className="text-base">{p.icon}</span>
                    <span className="flex-1 text-xs text-white/70 truncate">{p.name}</span>
                    <span className="text-[10px] text-white/40">
                      第 {p.pdca_cycle} 轮 · {PHASE_CN[p.pdca_phase] ?? p.pdca_phase}
                    </span>
                    <PDCAIndicator phase={p.pdca_phase} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* OKRs */}
          <div className="bg-white/[0.03] rounded-xl p-5 border border-white/[0.04]">
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-4">
              OKR 进度
            </h3>
            {data.okrs_top.length === 0 ? (
              <div className="text-center py-6">
                <div className="text-white/30 text-xs mb-2">暂无 OKR</div>
                <Link to="/okrs" className="text-[11px] text-brand-light/70 hover:text-brand-light">
                  新建 OKR →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {data.okrs_top.map((o) => (
                  <div key={o.id}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-white/70 truncate">{o.title}</span>
                      <span className="text-brand-light font-mono ml-2">{o.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand to-brand-light"
                        style={{ width: `${o.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Habits */}
          <div className="bg-white/[0.03] rounded-xl p-5 border border-white/[0.04]">
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-4">
              本周习惯打卡
            </h3>
            {data.habits_weekly.length === 0 ? (
              <div className="text-center py-6">
                <div className="text-white/30 text-xs mb-2">暂无习惯</div>
                <Link to="/habits" className="text-[11px] text-brand-light/70 hover:text-brand-light">
                  新建习惯 →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {data.habits_weekly.map((h) => (
                  <div key={h.id}>
                    <div className="flex items-center gap-2 text-xs mb-1.5">
                      <span className="text-base">{h.icon}</span>
                      <span className="text-white/70 flex-1 truncate">{h.name}</span>
                      <span className="text-emerald-400 font-mono">{h.completion_rate}%</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500/60"
                        style={{ width: `${h.completion_rate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

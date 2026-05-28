import { useQuery } from "@tanstack/react-query";
import { fetchTodayStats } from "../../api/stats";

export default function RightPanel() {
  const { data } = useQuery({
    queryKey: ["stats", "today"],
    queryFn: fetchTodayStats,
    refetchInterval: 30_000,
  });

  const completed = data?.completed ?? 0;
  const pending = data?.pending ?? 0;
  const total = data?.total ?? 0;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <aside className="w-[300px] border-l border-white/[0.06] bg-surface-raised/60 flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-white/[0.06]">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-3">
          📊 今日统计
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-white/[0.03] rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-emerald-400">{completed}</div>
            <div className="text-[10px] text-white/30 mt-1">已完成</div>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-amber-400">{pending}</div>
            <div className="text-[10px] text-white/30 mt-1">待处理</div>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-purple-300">{total}</div>
            <div className="text-[10px] text-white/30 mt-1">任务总数</div>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-sky-400">{completionRate}%</div>
            <div className="text-[10px] text-white/30 mt-1">完成率</div>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-white/[0.06]">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-3">
          🍅 番茄钟
        </h3>
        <div className="text-center text-white/20 text-xs py-6">即将上线（Phase 4）</div>
      </div>

      <div className="p-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-3">
          🔥 今日习惯
        </h3>
        <div className="text-center text-white/20 text-xs py-6">即将上线（Phase 4）</div>
      </div>
    </aside>
  );
}

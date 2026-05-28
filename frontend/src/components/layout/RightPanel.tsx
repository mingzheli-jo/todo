import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchTodayStats } from "../../api/stats";
import { fetchTodayStats as fetchPomodoroToday } from "../../api/pomodoro";
import { fetchTodayHabits, checkInHabit } from "../../api/habits";

function formatTimeLeft(session: { started_at: string; duration_min: number }): string {
  const elapsed = Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000);
  const remaining = Math.max(0, session.duration_min * 60 - elapsed);
  const m = Math.floor(remaining / 60).toString().padStart(2, "0");
  const s = (remaining % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function RightPanel() {
  const qc = useQueryClient();

  const { data: taskStats } = useQuery({
    queryKey: ["stats", "today"],
    queryFn: fetchTodayStats,
    refetchInterval: 30_000,
  });

  const { data: pomodoroStats } = useQuery({
    queryKey: ["pomodoro", "today"],
    queryFn: fetchPomodoroToday,
    refetchInterval: 15_000,
  });

  const { data: todayHabits = [] } = useQuery({
    queryKey: ["habits", "today"],
    queryFn: fetchTodayHabits,
    refetchInterval: 30_000,
  });

  const checkInMutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      checkInHabit(id, { completed }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habits", "today"] }),
  });

  const completed = taskStats?.completed ?? 0;
  const pending = taskStats?.pending ?? 0;
  const total = taskStats?.total ?? 0;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const currentSession = pomodoroStats?.current_session ?? null;
  const visibleHabits = todayHabits.slice(0, 5);
  const extraCount = todayHabits.length - 5;

  return (
    <aside className="w-[300px] border-l border-white/[0.06] bg-surface-raised/60 flex flex-col flex-shrink-0 overflow-y-auto">
      {/* Today task stats */}
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

      {/* Pomodoro section */}
      <div className="p-4 border-b border-white/[0.06]">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-3">
          🍅 番茄钟
        </h3>
        {currentSession ? (
          <div className="bg-white/[0.03] rounded-xl p-3 border border-brand/20">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-white/50">专注中</span>
              <span className="text-sm font-bold font-mono text-brand-light">
                {formatTimeLeft(currentSession)}
              </span>
            </div>
            {currentSession.task_id && (
              <div className="text-[11px] text-white/35 truncate">任务进行中...</div>
            )}
            <Link
              to="/pomodoro"
              className="mt-2 block text-center text-[11px] text-brand-light/70 hover:text-brand-light transition"
            >
              进入专注页 →
            </Link>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-xs text-white/40 mb-1">
              今日 <span className="text-brand-light font-semibold">{pomodoroStats?.total_sessions ?? 0}</span> 个番茄
              · 专注 <span className="text-amber-400 font-semibold">{pomodoroStats?.total_minutes ?? 0}</span> 分钟
            </div>
            <Link
              to="/pomodoro"
              className="mt-2 inline-block text-[11px] text-brand-light/70 hover:text-brand-light transition"
            >
              开始一个番茄 →
            </Link>
          </div>
        )}
      </div>

      {/* Habits section */}
      <div className="p-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-3">
          🔥 今日习惯
        </h3>
        {todayHabits.length === 0 ? (
          <div className="text-center">
            <div className="text-xs text-white/30 py-3">暂无习惯</div>
            <Link to="/habits" className="text-[11px] text-brand-light/70 hover:text-brand-light transition">
              新建习惯 →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleHabits.map(({ habit, completed_today }) => (
              <button
                key={habit.id}
                onClick={() => checkInMutation.mutate({ id: habit.id, completed: !completed_today })}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.04] transition group"
              >
                <span className="text-base w-5 text-center flex-shrink-0">{habit.icon}</span>
                <span className="flex-1 text-xs text-white/60 text-left truncate">{habit.name}</span>
                <span className={`text-sm flex-shrink-0 ${completed_today ? "text-emerald-400" : "text-white/20 group-hover:text-white/40"}`}>
                  {completed_today ? "✓" : "○"}
                </span>
              </button>
            ))}
            {extraCount > 0 && (
              <Link
                to="/habits"
                className="block text-center text-[11px] text-white/30 hover:text-white/60 transition pt-1"
              >
                +{extraCount} 更多
              </Link>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

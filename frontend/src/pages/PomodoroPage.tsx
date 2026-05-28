import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { startSession, completeSession, fetchCurrentSession, fetchTodayStats } from "../api/pomodoro";
import { fetchTasks } from "../api/tasks";

const RADIUS = 90;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function PomodoroPage() {
  const qc = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [durationMin, setDurationMin] = useState(25);
  const [timeLeft, setTimeLeft] = useState(durationMin * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [donePrompt, setDonePrompt] = useState(false);

  const { data: currentSession } = useQuery({
    queryKey: ["pomodoro", "current"],
    queryFn: fetchCurrentSession,
    refetchInterval: 10_000,
  });

  const { data: todayStats } = useQuery({
    queryKey: ["pomodoro", "today"],
    queryFn: fetchTodayStats,
    refetchInterval: 30_000,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => fetchTasks(),
  });

  // Restore in-progress session
  useEffect(() => {
    if (currentSession && !running) {
      const elapsed = Math.floor(
        (Date.now() - new Date(currentSession.started_at).getTime()) / 1000
      );
      const total = currentSession.duration_min * 60;
      const remaining = Math.max(0, total - elapsed);
      setTimeLeft(remaining);
      setDurationMin(currentSession.duration_min);
      if (currentSession.task_id) setSelectedTaskId(currentSession.task_id);
      if (remaining > 0) {
        setRunning(true);
      } else {
        setDonePrompt(true);
      }
    }
  }, [currentSession]); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            setDonePrompt(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const startMutation = useMutation({
    mutationFn: () =>
      startSession({ task_id: selectedTaskId || undefined, duration_min: durationMin }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pomodoro"] });
      setTimeLeft(durationMin * 60);
      setRunning(true);
      setDonePrompt(false);
    },
  });

  const completeMutation = useMutation({
    mutationFn: (interrupted: boolean) => {
      if (!currentSession) throw new Error("No session");
      return completeSession(currentSession.id, { interrupted });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pomodoro"] });
      setRunning(false);
      setDonePrompt(false);
      setTimeLeft(durationMin * 60);
    },
  });

  const handleStart = () => {
    if (currentSession) {
      setRunning(true);
    } else {
      startMutation.mutate();
    }
  };

  const handlePause = () => setRunning(false);

  const handleComplete = () => completeMutation.mutate(false);
  const handleCancel = () => completeMutation.mutate(true);

  const total = durationMin * 60;
  const progress = total > 0 ? timeLeft / total : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const linkedTask = tasks.find((t) => t.id === (currentSession?.task_id ?? selectedTaskId));
  const completionRate = (todayStats?.total_sessions ?? 0) > 0
    ? Math.round(((todayStats?.completed_sessions ?? 0) / (todayStats?.total_sessions ?? 1)) * 100)
    : 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="px-7 py-4 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
        <h1 className="text-xl font-bold">🍅 番茄钟</h1>
      </header>

      <div className="flex-1 flex items-start gap-8 p-8 overflow-y-auto">
        {/* Left: Timer */}
        <div className="flex flex-col items-center gap-6 flex-1">
          {/* SVG circular timer */}
          <div className="relative">
            <svg width="220" height="220" className="drop-shadow-[0_0_24px_rgba(99,102,241,0.3)]">
              {/* Background circle */}
              <circle
                cx="110" cy="110" r={RADIUS}
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="10"
              />
              {/* Progress arc */}
              <circle
                cx="110" cy="110" r={RADIUS}
                fill="none"
                stroke="url(#timerGrad)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 110 110)"
                className="transition-all duration-1000"
              />
              <defs>
                <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-4xl font-bold font-mono tracking-wider">{formatTime(timeLeft)}</div>
              {linkedTask && (
                <div className="text-[11px] text-white/40 mt-1 max-w-[140px] text-center truncate">
                  {linkedTask.title}
                </div>
              )}
              <div className="text-[10px] text-white/25 mt-1">
                {running ? "专注中..." : currentSession ? "已暂停" : "准备开始"}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {!currentSession && !running ? (
              <button
                onClick={handleStart}
                disabled={startMutation.isPending}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-brand to-brand-light text-white font-semibold shadow-lg shadow-brand/30 hover:shadow-brand/50 transition"
              >
                {startMutation.isPending ? "启动中..." : "▶ 开始"}
              </button>
            ) : (
              <>
                {running ? (
                  <button
                    onClick={handlePause}
                    className="px-6 py-3 rounded-xl bg-white/[0.08] text-white/80 font-semibold hover:bg-white/[0.12] transition"
                  >
                    ⏸ 暂停
                  </button>
                ) : (
                  <button
                    onClick={() => setRunning(true)}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand to-brand-light text-white font-semibold shadow-lg shadow-brand/30 transition"
                  >
                    ▶ 继续
                  </button>
                )}
                <button
                  onClick={handleComplete}
                  disabled={completeMutation.isPending}
                  className="px-6 py-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold hover:bg-emerald-500/30 transition"
                >
                  ✓ 完成
                </button>
                <button
                  onClick={handleCancel}
                  disabled={completeMutation.isPending}
                  className="px-4 py-3 rounded-xl bg-white/[0.04] text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition"
                >
                  ✕ 取消
                </button>
              </>
            )}
          </div>

          {/* Duration selector (only when not active) */}
          {!currentSession && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">时长：</span>
              {[15, 25, 30, 45, 60].map((m) => (
                <button
                  key={m}
                  onClick={() => { setDurationMin(m); setTimeLeft(m * 60); }}
                  className={`px-3 py-1.5 rounded-lg text-xs transition ${
                    durationMin === m
                      ? "bg-brand/20 text-brand-light border border-brand/30"
                      : "bg-white/[0.04] text-white/40 hover:bg-white/[0.08]"
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          )}

          {/* Task selector (only when not active) */}
          {!currentSession && (
            <div className="w-full max-w-xs">
              <label className="text-xs text-white/40 mb-1.5 block">关联任务（可选）</label>
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-brand/50 text-white/80"
              >
                <option value="">（无）</option>
                {tasks.filter((t) => t.status !== "done" && t.status !== "cancelled").map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right: Stats */}
        <div className="w-60 flex flex-col gap-4 flex-shrink-0">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-1">
            今日统计
          </div>

          <div className="bg-white/[0.03] rounded-xl p-4 text-center border border-white/[0.06]">
            <div className="text-3xl font-bold text-brand-light">{todayStats?.total_sessions ?? 0}</div>
            <div className="text-[11px] text-white/40 mt-1">番茄总数</div>
          </div>

          <div className="bg-white/[0.03] rounded-xl p-4 text-center border border-white/[0.06]">
            <div className="text-3xl font-bold text-emerald-400">{todayStats?.completed_sessions ?? 0}</div>
            <div className="text-[11px] text-white/40 mt-1">已完成</div>
          </div>

          <div className="bg-white/[0.03] rounded-xl p-4 text-center border border-white/[0.06]">
            <div className="text-3xl font-bold text-amber-400">{todayStats?.total_minutes ?? 0}</div>
            <div className="text-[11px] text-white/40 mt-1">专注分钟</div>
          </div>

          <div className="bg-white/[0.03] rounded-xl p-4 text-center border border-white/[0.06]">
            <div className="text-3xl font-bold text-sky-400">{completionRate}%</div>
            <div className="text-[11px] text-white/40 mt-1">完成率</div>
          </div>
        </div>
      </div>

      {/* Done prompt overlay */}
      {donePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-surface-raised border border-white/[0.08] rounded-2xl p-8 shadow-2xl text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-bold mb-2">番茄钟结束！</h2>
            <p className="text-white/50 text-sm mb-6">你已专注了 {durationMin} 分钟</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleComplete}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand to-brand-light text-white font-semibold shadow-lg shadow-brand/30"
              >
                标记完成
              </button>
              <button
                onClick={handleCancel}
                className="px-6 py-2.5 rounded-xl bg-white/[0.08] text-white/60 hover:bg-white/[0.12] transition"
              >
                已中断
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchHabits, createHabit, deleteHabit, fetchTodayHabits, checkInHabit, fetchHabitRecords } from "../api/habits";
import Dialog from "../components/ui/Dialog";
import type { Habit } from "../types";

const FREQUENCY_LABEL = { daily: "每天", weekday: "工作日", weekly: "每周" };

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(formatDate(d));
  }
  return days;
}

interface CreateForm {
  name: string;
  icon: string;
  color: string;
}

const EMPTY_FORM: CreateForm = { name: "", icon: "✅", color: "#10b981" };

export default function HabitsPage() {
  const qc = useQueryClient();
  const [includeInactive, setIncludeInactive] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);

  const { data: todayStatuses = [], isLoading } = useQuery({
    queryKey: ["habits", "today"],
    queryFn: fetchTodayHabits,
    refetchInterval: 30_000,
  });

  const { data: allHabits = [] } = useQuery({
    queryKey: ["habits", "list", includeInactive],
    queryFn: () => fetchHabits(includeInactive),
  });

  const createMutation = useMutation({
    mutationFn: () => createHabit({ name: form.name.trim(), icon: form.icon, color: form.color }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      setCreateOpen(false);
      setForm(EMPTY_FORM);
    },
  });

  const checkInMutation = useMutation({
    mutationFn: ({ id, date, completed }: { id: string; date: string; completed: boolean }) =>
      checkInHabit(id, { date, completed }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habits"] }),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => deleteHabit(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habits"] }),
  });

  const today = formatDate(new Date());

  return (
    <>
      <header className="px-7 py-4 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">🔥 习惯打卡</h1>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-brand"
            />
            <span className="text-xs text-white/40">包含已停用</span>
          </label>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-brand to-brand-light text-white text-xs font-semibold shadow-lg shadow-brand/30"
        >
          ✚ 新建习惯
        </button>
      </header>

      <div className="flex-1 p-6 overflow-y-auto">
        {isLoading ? (
          <div className="text-center text-white/30 py-20">加载中...</div>
        ) : allHabits.length === 0 ? (
          <div className="text-center text-white/30 py-20">
            <div className="text-5xl mb-4">🔥</div>
            <div className="text-sm">暂无习惯，点击右上角新建</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {allHabits.map((habit) => {
              const todayStatus = todayStatuses.find((s) => s.habit.id === habit.id);
              const completedToday = todayStatus?.completed_today ?? false;
              return (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  completedToday={completedToday}
                  onToggleToday={() =>
                    checkInMutation.mutate({ id: habit.id, date: today, completed: !completedToday })
                  }
                  onToggleDay={(date, completed) =>
                    checkInMutation.mutate({ id: habit.id, date, completed })
                  }
                  onArchive={() => archiveMutation.mutate(habit.id)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => { setCreateOpen(false); setForm(EMPTY_FORM); }} title="新建习惯">
        <form onSubmit={(e) => { e.preventDefault(); if (!form.name.trim()) return; createMutation.mutate(); }} className="space-y-4">
          <div>
            <label className="block text-xs text-white/40 mb-1.5">习惯名称 <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="例如：早起、运动、阅读"
              required
              autoFocus
              className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-brand/50"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs text-white/40 mb-1.5">图标（Emoji）</label>
              <input
                type="text"
                value={form.icon}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-brand/50"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">颜色</label>
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                className="w-12 h-10 rounded-lg bg-white/[0.04] border border-white/[0.08] cursor-pointer"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setCreateOpen(false); setForm(EMPTY_FORM); }}
              className="flex-1 py-2 rounded-lg bg-white/[0.06] text-white/60 text-sm hover:bg-white/[0.10] transition"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || !form.name.trim()}
              className="flex-1 py-2 rounded-lg bg-gradient-to-r from-brand to-brand-light text-white text-sm font-semibold shadow-lg shadow-brand/30 disabled:opacity-50 transition"
            >
              {createMutation.isPending ? "创建中..." : "创建"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

interface HabitCardProps {
  habit: Habit;
  completedToday: boolean;
  onToggleToday: () => void;
  onToggleDay: (date: string, completed: boolean) => void;
  onArchive: () => void;
}

function HabitCard({ habit, completedToday, onToggleToday, onToggleDay, onArchive }: HabitCardProps) {
  const last7 = getLast7Days();
  const { data: records = [] } = useQuery({
    queryKey: ["habit-records", habit.id, last7[0], last7[6]],
    queryFn: () => fetchHabitRecords(habit.id, last7[0], last7[6]),
  });

  const recordMap = new Map(records.map((r) => [r.date, r]));
  const today = formatDate(new Date());

  return (
    <div className={`bg-white/[0.03] border rounded-xl p-4 flex flex-col gap-3 transition ${
      habit.is_active ? "border-white/[0.06] hover:bg-white/[0.05]" : "border-white/[0.03] opacity-50"
    }`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-2xl">{habit.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{habit.name}</div>
          <div className="text-[10px] text-white/30">{FREQUENCY_LABEL[habit.frequency]}</div>
        </div>
        {!habit.is_active && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/30">已停用</span>
        )}
        <button
          onClick={onArchive}
          title="归档"
          className="w-6 h-6 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-white/25 hover:text-white/60 transition flex items-center justify-center text-xs"
        >
          ×
        </button>
      </div>

      {/* Today big toggle */}
      {habit.is_active && (
        <button
          onClick={onToggleToday}
          className={`w-full py-2.5 rounded-lg text-sm font-semibold transition ${
            completedToday
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
              : "bg-white/[0.04] text-white/50 border border-white/[0.08] hover:bg-white/[0.08]"
          }`}
        >
          {completedToday ? "✓ 今日已完成" : "○ 标记今日完成"}
        </button>
      )}

      {/* 7-day streak grid */}
      <div>
        <div className="text-[10px] text-white/25 mb-1.5">近 7 天</div>
        <div className="flex gap-1">
          {last7.map((day) => {
            const record = recordMap.get(day);
            const done = record?.completed ?? false;
            const isToday = day === today;
            return (
              <button
                key={day}
                onClick={() => onToggleDay(day, !done)}
                title={day}
                className={`flex-1 h-6 rounded transition ${
                  done
                    ? "bg-emerald-500/60 hover:bg-emerald-500/80"
                    : isToday
                    ? "bg-white/[0.08] border border-white/[0.15] hover:bg-white/[0.12]"
                    : "bg-white/[0.04] hover:bg-white/[0.08]"
                }`}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-white/20">{last7[0].slice(5)}</span>
          <span className="text-[9px] text-white/20">{last7[6].slice(5)}</span>
        </div>
      </div>
    </div>
  );
}

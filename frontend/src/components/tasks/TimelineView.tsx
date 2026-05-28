import { useState } from "react";
import TaskDialog from "./TaskDialog";
import type { Task } from "../../types";

interface Props {
  tasks: Task[];
}

const DAY_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

const QUADRANT_BAR: Record<string, string> = {
  urgent_important: "bg-q1/70 border-q1/40",
  important: "bg-q2/70 border-q2/40",
  urgent: "bg-q3/70 border-q3/40",
  neither: "bg-q4/70 border-q4/40",
};

/** Returns the Monday of the week containing `date` as a YYYY-MM-DD string */
function getMondayOf(date: Date): string {
  const d = new Date(date);
  // getDay(): 0=Sun,1=Mon,...,6=Sat
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toDateStr(d);
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function TimelineView({ tasks }: Props) {
  const today = toDateStr(new Date());
  const [weekStart, setWeekStart] = useState(() => getMondayOf(new Date()));

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = weekDays[6];

  const tasksWithDate = tasks.filter((t) => t.due_date);
  const tasksWithoutDate = tasks.filter((t) => !t.due_date);

  // Tasks due within this week
  const inWeek = tasksWithDate.filter(
    (t) => t.due_date! >= weekStart && t.due_date! <= weekEnd
  );

  // Tasks with dates outside this week
  const outOfWeek = tasksWithDate.filter(
    (t) => t.due_date! < weekStart || t.due_date! > weekEnd
  );

  // Group in-week tasks by day index 0-6
  const byDay: Task[][] = weekDays.map((day) =>
    inWeek.filter((t) => t.due_date === day)
  );

  const handleEdit = (task: Task) => {
    setEditTask(task);
    setDialogOpen(true);
  };

  const prevWeek = () => setWeekStart((s) => addDays(s, -7));
  const nextWeek = () => setWeekStart((s) => addDays(s, 7));
  const resetWeek = () => setWeekStart(getMondayOf(new Date()));

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Week navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={prevWeek}
            className="px-3 py-1.5 rounded-lg text-xs bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition"
          >
            ← 上周
          </button>
          <button
            onClick={resetWeek}
            className="px-3 py-1.5 rounded-lg text-xs bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition"
          >
            本周
          </button>
          <button
            onClick={nextWeek}
            className="px-3 py-1.5 rounded-lg text-xs bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition"
          >
            下周 →
          </button>
          <span className="text-xs text-white/30 ml-1">
            {weekStart} — {weekEnd}
          </span>
        </div>

        {/* Timeline grid */}
        <div className="rounded-[14px] border border-white/[0.06] overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-white/[0.06]">
            {weekDays.map((day, i) => {
              const isToday = day === today;
              return (
                <div
                  key={day}
                  className={`px-2 py-2.5 text-center border-r last:border-r-0 border-white/[0.04] ${
                    isToday ? "bg-brand/5" : ""
                  }`}
                >
                  <div className={`text-[11px] font-semibold ${isToday ? "text-brand-light" : "text-white/50"}`}>
                    {DAY_LABELS[i]}
                  </div>
                  <div className={`text-[10px] mt-0.5 ${isToday ? "text-brand-light/70" : "text-white/25"}`}>
                    {formatDayLabel(day)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Task rows */}
          <div className="grid grid-cols-7 min-h-[160px]">
            {weekDays.map((day, i) => {
              const isToday = day === today;
              return (
                <div
                  key={day}
                  className={`border-r last:border-r-0 border-white/[0.04] p-1.5 space-y-1 ${
                    isToday ? "bg-brand/5" : ""
                  }`}
                >
                  {byDay[i].map((task) => (
                    <button
                      key={task.id}
                      onClick={() => handleEdit(task)}
                      className={`w-full text-left px-2 py-1 rounded border text-[10px] truncate font-medium transition hover:opacity-80 ${
                        QUADRANT_BAR[task.quadrant] ?? "bg-q4/70 border-q4/40"
                      } ${task.status === "done" ? "opacity-40 line-through" : ""}`}
                    >
                      {task.title}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tasks without date */}
        {tasksWithoutDate.length > 0 && (
          <div className="rounded-[14px] border border-white/[0.06] p-4">
            <div className="text-xs text-white/40 mb-2 font-semibold">未排期（{tasksWithoutDate.length}）</div>
            <div className="flex flex-wrap gap-2">
              {tasksWithoutDate.map((task) => (
                <button
                  key={task.id}
                  onClick={() => handleEdit(task)}
                  className={`px-2.5 py-1 rounded border text-[11px] font-medium transition hover:opacity-80 ${
                    QUADRANT_BAR[task.quadrant] ?? "bg-q4/70 border-q4/40"
                  } ${task.status === "done" ? "opacity-40 line-through" : ""}`}
                >
                  {task.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Out-of-week indicator */}
        {outOfWeek.length > 0 && (
          <div className="text-xs text-white/25 text-center">
            其他 {outOfWeek.length} 个任务在本周范围外
          </div>
        )}
      </div>

      <TaskDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editTask={editTask}
      />
    </>
  );
}

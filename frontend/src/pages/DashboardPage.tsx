import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchTasks } from "../api/tasks";
import QuadrantGrid from "../components/tasks/QuadrantGrid";
import KanbanBoard from "../components/tasks/KanbanBoard";
import TimelineView from "../components/tasks/TimelineView";
import ListView from "../components/tasks/ListView";
import TaskDialog from "../components/tasks/TaskDialog";
import type { Task } from "../types";

type ViewKey = "quadrant" | "kanban" | "timeline" | "list";

const VIEW_TABS: { key: ViewKey; label: string }[] = [
  { key: "quadrant", label: "四象限" },
  { key: "kanban", label: "看板" },
  { key: "timeline", label: "时间线" },
  { key: "list", label: "列表" },
];

const LS_KEY = "toto_view";

function readStoredView(): ViewKey {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v === "quadrant" || v === "kanban" || v === "timeline" || v === "list") return v;
  } catch {
    // ignore
  }
  return "quadrant";
}

export default function DashboardPage() {
  const [view, setView] = useState<ViewKey>(readStoredView);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => fetchTasks(),
  });

  const handleEdit = (task: Task) => {
    setEditTask(task);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditTask(null);
    setDialogOpen(true);
  };

  const switchView = (v: ViewKey) => {
    setView(v);
    try { localStorage.setItem(LS_KEY, v); } catch { /* ignore */ }
  };

  return (
    <>
      <header className="px-7 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-5">
          <h1 className="text-xl font-bold">📋 任务看板</h1>
          <div className="flex gap-0.5 bg-white/[0.04] rounded-lg p-0.5">
            {VIEW_TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => switchView(key)}
                className={`px-3.5 py-1.5 rounded-md text-xs transition ${
                  view === key
                    ? "bg-white/[0.08] text-white font-medium"
                    : "text-white/30 hover:text-white/60"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleNew}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-brand to-brand-light text-white text-xs font-semibold shadow-lg shadow-brand/30"
        >
          ✚ 新任务
        </button>
      </header>
      <div className="flex-1 p-6 overflow-y-auto">
        {isLoading ? (
          <div className="text-center text-white/30 py-20">加载中...</div>
        ) : (
          <>
            {view === "quadrant" && <QuadrantGrid tasks={tasks} onEdit={handleEdit} />}
            {view === "kanban" && <KanbanBoard tasks={tasks} />}
            {view === "timeline" && <TimelineView tasks={tasks} />}
            {view === "list" && <ListView tasks={tasks} />}
          </>
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

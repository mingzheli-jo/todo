import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchTasks } from "../api/tasks";
import QuadrantGrid from "../components/tasks/QuadrantGrid";
import TaskDialog from "../components/tasks/TaskDialog";
import type { Task } from "../types";

export default function DashboardPage() {
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

  return (
    <>
      <header className="px-7 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-5">
          <h1 className="text-xl font-bold">📋 任务看板</h1>
          <div className="flex gap-0.5 bg-white/[0.04] rounded-lg p-0.5">
            {["四象限", "看板", "时间线", "列表"].map((v, i) => (
              <button
                key={v}
                className={`px-3.5 py-1.5 rounded-md text-xs transition ${
                  i === 0 ? "bg-white/[0.08] text-white font-medium" : "text-white/30"
                }`}
              >
                {v}
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
          <QuadrantGrid tasks={tasks} onEdit={handleEdit} />
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

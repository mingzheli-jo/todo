import type { Task } from "../../types";
import { updateTask } from "../../api/tasks";
import { useQueryClient } from "@tanstack/react-query";

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
}

export default function TaskCard({ task, onEdit }: TaskCardProps) {
  const qc = useQueryClient();
  const isDone = task.status === "done";

  const toggleDone = async () => {
    await updateTask(task.id, { status: isDone ? "todo" : "done" });
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  return (
    <div
      className="bg-white/[0.03] border border-white/[0.06] rounded-[10px] px-3.5 py-3 cursor-pointer hover:bg-white/[0.06] hover:border-white/[0.1] hover:-translate-y-px transition-all"
      onClick={() => onEdit(task)}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleDone();
          }}
          className={`w-4 h-4 rounded flex-shrink-0 border-[1.5px] transition ${
            isDone ? "bg-emerald-500 border-emerald-500" : "border-white/20 hover:border-white/40"
          }`}
        />
        <span className={`text-[13px] font-medium ${isDone ? "line-through opacity-40" : ""}`}>
          {task.title}
        </span>
      </div>
      {task.due_date && (
        <div className="ml-6 mt-1">
          <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-300">
            ⏰ {task.due_date}
          </span>
        </div>
      )}
    </div>
  );
}

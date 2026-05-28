import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { fetchProjects } from "../../api/projects";
import { updateTask } from "../../api/tasks";
import TaskDialog from "./TaskDialog";
import type { Task, TaskStatus } from "../../types";
import { safeIcon } from "../../lib/icon";

interface Props {
  tasks: Task[];
}

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "待办" },
  { status: "in_progress", label: "进行中" },
  { status: "done", label: "已完成" },
];

const QUADRANT_DOT: Record<string, string> = {
  urgent_important: "bg-q1",
  important: "bg-q2",
  urgent: "bg-q3",
  neither: "bg-q4",
};

interface KanbanCardProps {
  task: Task;
  projects: import("../../types").Project[];
  onEdit: (task: Task) => void;
}

function KanbanCard({ task, projects, onEdit }: KanbanCardProps) {
  const [dragging, setDragging] = useState(false);
  const project = task.project_id ? projects.find((p) => p.id === task.project_id) : null;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      onClick={() => onEdit(task)}
      className={`bg-white/[0.03] border border-white/[0.06] rounded-[10px] px-3.5 py-3 cursor-pointer hover:bg-white/[0.06] hover:border-white/[0.1] transition-all select-none ${
        dragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <span
          className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${QUADRANT_DOT[task.quadrant] ?? "bg-q4"}`}
        />
        <span className={`text-[13px] font-medium flex-1 leading-snug ${task.status === "done" ? "line-through opacity-40" : ""}`}>
          {task.title}
        </span>
        {project && (
          <span className="text-sm leading-none flex-shrink-0" title={project.name}>
            {safeIcon(project.icon)}
          </span>
        )}
      </div>
      {task.due_date && (
        <div className="mt-1.5 ml-4">
          <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-300">
            ⏰ {task.due_date}
          </span>
        </div>
      )}
    </div>
  );
}

interface ColumnProps {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  projects: import("../../types").Project[];
  onEdit: (task: Task) => void;
  onDrop: (taskId: string, status: TaskStatus) => void;
}

function KanbanColumn({ status, label, tasks, projects, onEdit, onDrop }: ColumnProps) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className={`flex flex-col rounded-[14px] border transition-colors ${
        dragOver
          ? "bg-white/[0.06] border-brand/30"
          : "bg-white/[0.02] border-white/[0.06]"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDragOver(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const taskId = e.dataTransfer.getData("text/plain");
        if (taskId) onDrop(taskId, status);
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <span className="text-[13px] font-semibold">{label}</span>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.06] text-white/30">
          {tasks.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[120px]">
        {tasks.map((t) => (
          <KanbanCard key={t.id} task={t} projects={projects} onEdit={onEdit} />
        ))}
        {tasks.length === 0 && (
          <div className="text-center text-white/15 text-xs py-8">暂无任务</div>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({ tasks }: Props) {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", false],
    queryFn: () => fetchProjects(false),
    staleTime: 30_000,
  });

  const visible = tasks.filter((t) => t.status !== "cancelled");

  const grouped = COLUMNS.reduce(
    (acc, col) => {
      acc[col.status] = visible.filter((t) => t.status === col.status);
      return acc;
    },
    {} as Record<TaskStatus, Task[]>
  );

  const handleDrop = async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;
    await updateTask(taskId, { status: newStatus });
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["stats", "today"] });
  };

  const handleEdit = (task: Task) => {
    setEditTask(task);
    setDialogOpen(true);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.status}
            status={col.status}
            label={col.label}
            tasks={grouped[col.status] ?? []}
            projects={projects}
            onEdit={handleEdit}
            onDrop={handleDrop}
          />
        ))}
      </div>
      <TaskDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editTask={editTask}
      />
    </>
  );
}

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchProjects } from "../../api/projects";
import { updateTask, deleteTask } from "../../api/tasks";
import TaskDialog from "./TaskDialog";
import type { Task, TaskStatus, Quadrant } from "../../types";
import { safeIcon } from "../../lib/icon";

interface Props {
  tasks: Task[];
}

type SortKey = "priority" | "due_date" | "created_at";
type SortDir = "asc" | "desc";

const QUADRANT_LABEL: Record<Quadrant, string> = {
  urgent_important: "紧急重要",
  important: "重要不急",
  urgent: "紧急不重要",
  neither: "不急不重要",
};

const QUADRANT_BADGE: Record<Quadrant, string> = {
  urgent_important: "bg-q1/15 text-q1",
  important: "bg-q2/15 text-q2",
  urgent: "bg-q3/15 text-q3",
  neither: "bg-q4/15 text-q4",
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "待办",
  in_progress: "进行中",
  done: "已完成",
  cancelled: "已取消",
};

const STATUS_BADGE: Record<TaskStatus, string> = {
  todo: "bg-white/[0.06] text-white/60",
  in_progress: "bg-amber-500/15 text-amber-300",
  done: "bg-emerald-500/15 text-emerald-300",
  cancelled: "bg-white/[0.03] text-white/30",
};

const QUADRANT_VALUES: Quadrant[] = ["urgent_important", "important", "urgent", "neither"];
const STATUS_VALUES: TaskStatus[] = ["todo", "in_progress", "done", "cancelled"];

export default function ListView({ tasks }: Props) {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const [search, setSearch] = useState("");
  const [quadrantFilter, setQuadrantFilter] = useState<Set<Quadrant>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<TaskStatus>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", false],
    queryFn: () => fetchProjects(false),
    staleTime: 30_000,
  });

  const handleEdit = (task: Task) => {
    setEditTask(task);
    setDialogOpen(true);
  };

  const handleToggleDone = async (task: Task) => {
    const newStatus: TaskStatus = task.status === "done" ? "todo" : "done";
    await updateTask(task.id, { status: newStatus });
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["stats", "today"] });
  };

  const handleDelete = async (task: Task) => {
    await deleteTask(task.id);
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  const toggleQuadrant = (q: Quadrant) => {
    setQuadrantFilter((prev) => {
      const next = new Set(prev);
      if (next.has(q)) next.delete(q); else next.add(q);
      return next;
    });
  };

  const toggleStatus = (s: TaskStatus) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };

  const resetFilters = () => {
    setSearch("");
    setQuadrantFilter(new Set());
    setStatusFilter(new Set());
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "created_at" ? "desc" : "asc");
    }
  };

  // Filter
  let filtered = tasks;
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter((t) => t.title.toLowerCase().includes(q));
  }
  if (quadrantFilter.size > 0) {
    filtered = filtered.filter((t) => quadrantFilter.has(t.quadrant));
  }
  if (statusFilter.size > 0) {
    filtered = filtered.filter((t) => statusFilter.has(t.status));
  }

  // Sort
  filtered = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "priority") {
      cmp = a.priority - b.priority;
    } else if (sortKey === "due_date") {
      const da = a.due_date ?? "9999-99-99";
      const db = b.due_date ?? "9999-99-99";
      cmp = da < db ? -1 : da > db ? 1 : 0;
    } else {
      cmp = a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const SortArrow = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span className="text-white/20 ml-1">↕</span>;
    return <span className="text-brand-light ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  const hasFilters = search.trim() || quadrantFilter.size > 0 || statusFilter.size > 0;

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="搜索任务..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs focus:outline-none focus:border-brand/50 w-48"
          />
          <div className="flex gap-1">
            {QUADRANT_VALUES.map((q) => (
              <button
                key={q}
                onClick={() => toggleQuadrant(q)}
                className={`px-2.5 py-1 rounded-md text-[11px] border transition ${
                  quadrantFilter.has(q)
                    ? `${QUADRANT_BADGE[q]} border-current`
                    : "text-white/30 border-white/[0.08] hover:border-white/20"
                }`}
              >
                {QUADRANT_LABEL[q].slice(0, 4)}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {STATUS_VALUES.map((s) => (
              <button
                key={s}
                onClick={() => toggleStatus(s)}
                className={`px-2.5 py-1 rounded-md text-[11px] border transition ${
                  statusFilter.has(s)
                    ? `${STATUS_BADGE[s]} border-current`
                    : "text-white/30 border-white/[0.08] hover:border-white/20"
                }`}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-white/30 hover:text-white/60 underline transition"
            >
              重置筛选
            </button>
          )}
          <span className="ml-auto text-xs text-white/25">{filtered.length} 条</span>
        </div>

        {/* Table */}
        <div className="rounded-[14px] border border-white/[0.06] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02] sticky top-0">
                  <th className="w-8 px-3 py-2.5 text-left" />
                  <th className="px-3 py-2.5 text-left text-white/40 font-medium">标题</th>
                  <th className="px-3 py-2.5 text-left text-white/40 font-medium">象限</th>
                  <th className="px-3 py-2.5 text-left text-white/40 font-medium">状态</th>
                  <th
                    className="px-3 py-2.5 text-left text-white/40 font-medium cursor-pointer hover:text-white/70 transition whitespace-nowrap"
                    onClick={() => handleSort("priority")}
                  >
                    优先级<SortArrow col="priority" />
                  </th>
                  <th
                    className="px-3 py-2.5 text-left text-white/40 font-medium cursor-pointer hover:text-white/70 transition whitespace-nowrap"
                    onClick={() => handleSort("due_date")}
                  >
                    截止日期<SortArrow col="due_date" />
                  </th>
                  <th className="px-3 py-2.5 text-left text-white/40 font-medium">项目</th>
                  <th
                    className="px-3 py-2.5 text-left text-white/40 font-medium cursor-pointer hover:text-white/70 transition whitespace-nowrap"
                    onClick={() => handleSort("created_at")}
                  >
                    创建时间<SortArrow col="created_at" />
                  </th>
                  <th className="w-10 px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center text-white/20 py-12">
                      暂无任务
                    </td>
                  </tr>
                )}
                {filtered.map((task) => {
                  const project = task.project_id
                    ? projects.find((p) => p.id === task.project_id)
                    : null;
                  const isDone = task.status === "done";
                  return (
                    <tr
                      key={task.id}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition group"
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => handleToggleDone(task)}
                          className={`w-4 h-4 rounded border-[1.5px] flex items-center justify-center transition ${
                            isDone
                              ? "bg-emerald-500 border-emerald-500"
                              : "border-white/20 hover:border-white/40"
                          }`}
                        >
                          {isDone && <span className="text-[9px] text-white">✓</span>}
                        </button>
                      </td>
                      {/* Title */}
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => handleEdit(task)}
                          className={`text-left hover:text-brand-light transition ${
                            isDone ? "line-through opacity-40" : ""
                          }`}
                        >
                          {task.title}
                        </button>
                      </td>
                      {/* Quadrant */}
                      <td className="px-3 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-medium ${QUADRANT_BADGE[task.quadrant]}`}
                        >
                          {QUADRANT_LABEL[task.quadrant]}
                        </span>
                      </td>
                      {/* Status */}
                      <td className="px-3 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-medium ${STATUS_BADGE[task.status]} ${
                            task.status === "cancelled" ? "line-through" : ""
                          }`}
                        >
                          {STATUS_LABEL[task.status]}
                        </span>
                      </td>
                      {/* Priority */}
                      <td className="px-3 py-2.5 text-white/50">{task.priority}</td>
                      {/* Due date */}
                      <td className="px-3 py-2.5 text-white/50 whitespace-nowrap">
                        {task.due_date ?? "—"}
                      </td>
                      {/* Project */}
                      <td className="px-3 py-2.5 text-white/50 whitespace-nowrap">
                        {project ? (
                          <span title={project.name}>
                            {safeIcon(project.icon)} {project.name}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      {/* Created at */}
                      <td className="px-3 py-2.5 text-white/30 whitespace-nowrap">
                        {task.created_at.slice(0, 10)}
                      </td>
                      {/* Actions */}
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => handleDelete(task)}
                          className="opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 transition text-xs"
                          title="删除"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <TaskDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editTask={editTask}
      />
    </>
  );
}

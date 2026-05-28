import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Dialog from "../ui/Dialog";
import { createTask, updateTask, deleteTask } from "../../api/tasks";
import { fetchProjects } from "../../api/projects";
import type { Task, Quadrant } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  editTask?: Task | null;
  defaultQuadrant?: Quadrant;
}

export default function TaskDialog({ open, onClose, editTask, defaultQuadrant }: Props) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [quadrant, setQuadrant] = useState<Quadrant>(defaultQuadrant ?? "neither");
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", false],
    queryFn: () => fetchProjects(false),
    enabled: open,
  });

  useEffect(() => {
    if (editTask) {
      setTitle(editTask.title);
      setDescription(editTask.description ?? "");
      setQuadrant(editTask.quadrant);
      setDueDate(editTask.due_date ?? "");
      setProjectId(editTask.project_id ?? null);
    } else {
      setTitle("");
      setDescription("");
      setQuadrant(defaultQuadrant ?? "neither");
      setDueDate("");
      setProjectId(null);
    }
  }, [editTask, defaultQuadrant, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (editTask) {
        await updateTask(editTask.id, {
          title,
          description: description || undefined,
          quadrant,
          due_date: dueDate || undefined,
          project_id: projectId,
        });
      } else {
        await createTask({
          title,
          description: description || undefined,
          quadrant,
          due_date: dueDate || undefined,
          project_id: projectId,
        });
      }
      qc.invalidateQueries({ queryKey: ["tasks"] });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editTask) return;
    await deleteTask(editTask.id);
    qc.invalidateQueries({ queryKey: ["tasks"] });
    onClose();
  };

  const quadrants: { value: Quadrant; label: string; color: string }[] = [
    { value: "urgent_important", label: "🔴 紧急重要", color: "border-q1/30 bg-q1/10" },
    { value: "important", label: "🟡 重要不急", color: "border-q2/30 bg-q2/10" },
    { value: "urgent", label: "🔵 紧急不重要", color: "border-q3/30 bg-q3/10" },
    { value: "neither", label: "⚪ 不急不重要", color: "border-q4/30 bg-q4/10" },
  ];

  return (
    <Dialog open={open} onClose={onClose} title={editTask ? "编辑任务" : "新建任务"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="任务标题"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-brand/50"
        />
        <textarea
          placeholder="描述（可选）"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-brand/50 resize-none"
        />
        <div>
          <label className="text-xs text-white/40 mb-2 block">象限</label>
          <div className="grid grid-cols-2 gap-2">
            {quadrants.map((q) => (
              <button
                key={q.value}
                type="button"
                onClick={() => setQuadrant(q.value)}
                className={`px-3 py-2 rounded-lg text-xs border transition ${
                  quadrant === q.value ? q.color : "border-white/[0.06] bg-white/[0.02]"
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-white/40 mb-2 block">所属项目</label>
          <select
            value={projectId ?? ""}
            onChange={(e) => setProjectId(e.target.value || null)}
            className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-brand/50 text-white/80"
          >
            <option value="">（无）</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.icon} {p.name}
              </option>
            ))}
          </select>
        </div>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-brand/50"
        />
        <div className="flex gap-3 pt-2">
          {editTask && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 rounded-lg text-xs text-red-400 border border-red-500/20 hover:bg-red-500/10 transition"
            >
              删除
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs text-white/50 border border-white/[0.08] hover:bg-white/[0.04] transition"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="px-4 py-2 rounded-lg text-xs bg-gradient-to-r from-brand to-brand-light text-white font-semibold shadow-lg shadow-brand/30 disabled:opacity-50"
          >
            {saving ? "保存中..." : editTask ? "更新" : "创建"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

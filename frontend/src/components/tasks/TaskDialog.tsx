import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Dialog from "../ui/Dialog";
import { createTask, updateTask, deleteTask } from "../../api/tasks";
import { fetchProjects } from "../../api/projects";
import { fetchOKRs, linkTaskToOKR, unlinkTaskFromOKR, fetchTaskOKRs } from "../../api/okrs";
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
  const [selectedOKRIds, setSelectedOKRIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", false],
    queryFn: () => fetchProjects(false),
    enabled: open,
  });

  const { data: allOKRs = [] } = useQuery({
    queryKey: ["okrs"],
    queryFn: () => fetchOKRs(),
    enabled: open,
  });

  const { data: existingOKRLinks = [] } = useQuery({
    queryKey: ["task-okrs", editTask?.id],
    queryFn: () => fetchTaskOKRs(editTask!.id),
    enabled: open && !!editTask?.id,
  });

  useEffect(() => {
    if (!open) return;
    if (editTask === null || editTask === undefined) {
      // New task: clear everything immediately, including OKR selection
      setTitle("");
      setDescription("");
      setQuadrant(defaultQuadrant ?? "neither");
      setDueDate("");
      setProjectId(null);
      setSelectedOKRIds([]);
      return;
    }
    // Edit: populate basic fields; OKR ids will be set by the separate effect below
    setTitle(editTask.title);
    setDescription(editTask.description ?? "");
    setQuadrant(editTask.quadrant);
    setDueDate(editTask.due_date ?? "");
    setProjectId(editTask.project_id ?? null);
  }, [open, editTask, defaultQuadrant]);

  // Separate effect for OKR sync — only fires when editing an existing task
  useEffect(() => {
    if (editTask?.id && existingOKRLinks.length > 0) {
      setSelectedOKRIds(existingOKRLinks.map((o) => o.id));
    }
  }, [editTask?.id, existingOKRLinks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      let taskId: string;
      if (editTask) {
        await updateTask(editTask.id, {
          title,
          description: description || undefined,
          quadrant,
          due_date: dueDate || undefined,
          project_id: projectId,
        });
        taskId = editTask.id;
        // Sync OKR links: diff existing vs selected
        const existingIds = existingOKRLinks.map((o) => o.id);
        const toAdd = selectedOKRIds.filter((id) => !existingIds.includes(id));
        const toRemove = existingIds.filter((id) => !selectedOKRIds.includes(id));
        await Promise.all([
          ...toAdd.map((okrId) => linkTaskToOKR(okrId, taskId)),
          ...toRemove.map((okrId) => unlinkTaskFromOKR(okrId, taskId)),
        ]);
      } else {
        const task = await createTask({
          title,
          description: description || undefined,
          quadrant,
          due_date: dueDate || undefined,
          project_id: projectId,
        });
        taskId = task.id;
        await Promise.all(selectedOKRIds.map((okrId) => linkTaskToOKR(okrId, taskId)));
      }
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["okrs"] });
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

  const toggleOKR = (okrId: string) => {
    setSelectedOKRIds((prev) =>
      prev.includes(okrId) ? prev.filter((id) => id !== okrId) : [...prev, okrId]
    );
  };

  // Group KRs under their objectives for display
  const objectives = allOKRs.filter((o) => o.type === "objective");
  const standaloneKRs = allOKRs.filter(
    (o) => o.type === "key_result" && !objectives.some((obj) => obj.id === o.parent_id)
  );

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

        {/* OKR linking */}
        {allOKRs.length > 0 && (
          <div>
            <label className="text-xs text-white/40 mb-2 block">关联 OKR</label>
            <div className="max-h-36 overflow-y-auto space-y-1 rounded-lg border border-white/[0.06] p-2 bg-white/[0.02]">
              {objectives.map((obj) => {
                const krs = allOKRs.filter(
                  (o) => o.type === "key_result" && o.parent_id === obj.id
                );
                return (
                  <div key={obj.id}>
                    <div className="text-[10px] text-white/30 px-1 py-0.5 font-semibold uppercase tracking-wide">
                      🎯 {obj.title}
                    </div>
                    {krs.map((kr) => (
                      <button
                        key={kr.id}
                        type="button"
                        onClick={() => toggleOKR(kr.id)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition ${
                          selectedOKRIds.includes(kr.id)
                            ? "bg-brand/15 text-brand-light border border-brand/25"
                            : "text-white/50 hover:bg-white/[0.04]"
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center text-[9px] ${
                          selectedOKRIds.includes(kr.id)
                            ? "bg-brand border-brand text-white"
                            : "border-white/20"
                        }`}>
                          {selectedOKRIds.includes(kr.id) ? "✓" : ""}
                        </span>
                        🔑 {kr.title}
                      </button>
                    ))}
                  </div>
                );
              })}
              {standaloneKRs.map((kr) => (
                <button
                  key={kr.id}
                  type="button"
                  onClick={() => toggleOKR(kr.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition ${
                    selectedOKRIds.includes(kr.id)
                      ? "bg-brand/15 text-brand-light border border-brand/25"
                      : "text-white/50 hover:bg-white/[0.04]"
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center text-[9px] ${
                    selectedOKRIds.includes(kr.id)
                      ? "bg-brand border-brand text-white"
                      : "border-white/20"
                  }`}>
                    {selectedOKRIds.includes(kr.id) ? "✓" : ""}
                  </span>
                  🔑 {kr.title}
                </button>
              ))}
            </div>
          </div>
        )}

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

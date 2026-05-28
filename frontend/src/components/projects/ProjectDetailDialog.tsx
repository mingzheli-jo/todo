import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPDCALogs, updateProject } from "../../api/projects";
import { fetchTasks } from "../../api/tasks";
import type { Project, PDCAPhase, PDCALog } from "../../types";
import { safeIcon } from "../../lib/icon";

const PHASE_LABEL: Record<PDCAPhase, string> = {
  plan: "计划",
  do: "执行",
  check: "检查",
  act: "改进",
};

const QUADRANT_LABEL: Record<string, string> = {
  urgent_important: "紧急重要",
  important: "重要不急",
  urgent: "紧急不重要",
  neither: "不急不重要",
};

const QUADRANT_COLOR: Record<string, string> = {
  urgent_important: "bg-q1/20 text-red-300",
  important: "bg-q2/20 text-yellow-300",
  urgent: "bg-q3/20 text-blue-300",
  neither: "bg-q4/20 text-white/50",
};

const STATUS_LABEL: Record<string, string> = {
  todo: "待办",
  in_progress: "进行中",
  done: "已完成",
  cancelled: "已取消",
};

const STATUS_COLOR: Record<string, string> = {
  todo: "bg-white/10 text-white/50",
  in_progress: "bg-brand/20 text-purple-300",
  done: "bg-emerald-500/20 text-emerald-300",
  cancelled: "bg-white/5 text-white/25 line-through",
};

type Tab = "overview" | "history" | "tasks";

interface Props {
  open: boolean;
  onClose: () => void;
  project: Project;
}

export default function ProjectDetailDialog({ open, onClose, project }: Props) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");

  // Overview form state
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [color, setColor] = useState(project.color);
  const [icon, setIcon] = useState(project.icon);

  useEffect(() => {
    if (open) {
      setName(project.name);
      setDescription(project.description ?? "");
      setColor(project.color);
      setIcon(project.icon);
      setTab("overview");
    }
  }, [open, project]);

  // PDCA logs query
  const { data: logs = [] } = useQuery<PDCALog[]>({
    queryKey: ["pdca-logs", project.id],
    queryFn: () => fetchPDCALogs(project.id),
    enabled: open && tab === "history",
  });

  // Tasks query
  const { data: allTasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => fetchTasks(),
    enabled: open && tab === "tasks",
  });

  const projectTasks = allTasks.filter((t) => t.project_id === project.id);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateProject(project.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        icon: icon.trim(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => updateProject(project.id, { is_archived: !project.is_archived }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      onClose();
    },
  });

  if (!open) return null;

  const sortedLogs = [...logs].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-surface-raised border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-white/[0.06] flex-shrink-0">
          <span className="text-2xl">{safeIcon(project.icon)}</span>
          <h2 className="text-lg font-bold flex-1 truncate">{project.name}</h2>
          {project.is_archived && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/40">已归档</span>
          )}
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-white/[0.10] text-white/40 hover:text-white/80 transition flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 pb-0 flex-shrink-0">
          {(["overview", "history", "tasks"] as Tab[]).map((t) => {
            const labels: Record<Tab, string> = { overview: "概览", history: "PDCA 历史", tasks: "关联任务" };
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-t-lg text-xs font-medium transition border-b-2 ${
                  tab === t
                    ? "text-white border-brand"
                    : "text-white/40 border-transparent hover:text-white/60"
                }`}
              >
                {labels[t]}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {tab === "overview" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-white/40 mb-1.5">项目名称</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-brand/50"
                />
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1.5">描述</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="项目描述（可选）"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-brand/50 resize-none placeholder:text-white/20"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs text-white/40 mb-1.5">图标（Emoji）</label>
                  <input
                    type="text"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    maxLength={2}
                    className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-brand/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1.5">颜色</label>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-12 h-10 rounded-lg bg-white/[0.04] border border-white/[0.08] cursor-pointer"
                  />
                </div>
              </div>
              <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-2">当前进度</div>
                <div className="text-sm text-white/70">
                  第 {project.pdca_cycle} 轮 ·{" "}
                  <span className="text-brand-light font-medium">{PHASE_LABEL[project.pdca_phase]}</span> 阶段
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => archiveMutation.mutate()}
                  disabled={archiveMutation.isPending}
                  className="px-4 py-2 rounded-lg text-xs border border-white/[0.08] text-white/50 hover:bg-white/[0.04] transition disabled:opacity-50"
                >
                  {project.is_archived ? "取消归档" : "归档项目"}
                </button>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || !name.trim()}
                  className="px-4 py-2 rounded-lg text-xs bg-gradient-to-r from-brand to-brand-light text-white font-semibold shadow-lg shadow-brand/30 disabled:opacity-50"
                >
                  {saveMutation.isPending ? "保存中..." : "保存"}
                </button>
              </div>
            </div>
          )}

          {tab === "history" && (
            <div className="space-y-3">
              {sortedLogs.length === 0 ? (
                <div className="text-center text-white/30 py-12">
                  <div className="text-3xl mb-2">📋</div>
                  <div className="text-sm">暂无 PDCA 推进记录</div>
                </div>
              ) : (
                sortedLogs.map((log, i) => (
                  <div key={log.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-brand mt-1.5 flex-shrink-0" />
                      {i < sortedLogs.length - 1 && (
                        <div className="w-px flex-1 bg-white/[0.06] mt-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-semibold text-white/40">
                          第 {log.cycle} 轮
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand/20 text-purple-300 font-medium">
                          {PHASE_LABEL[log.phase]}
                        </span>
                        <span className="text-[10px] text-white/25 ml-auto">
                          {log.created_at.slice(0, 10)}
                        </span>
                      </div>
                      <p className="text-sm text-white/70 leading-relaxed">{log.content}</p>
                      {log.outcome && (
                        <div className="mt-1.5 pl-3 border-l-2 border-emerald-500/30">
                          <span className="text-[10px] text-white/30">成果：</span>
                          <span className="text-xs text-emerald-300/70">{log.outcome}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "tasks" && (
            <div className="space-y-2">
              {projectTasks.length === 0 ? (
                <div className="text-center text-white/30 py-12">
                  <div className="text-3xl mb-2">📌</div>
                  <div className="text-sm">暂无关联任务</div>
                </div>
              ) : (
                projectTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]"
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      task.status === "done" ? "bg-emerald-500" :
                      task.status === "in_progress" ? "bg-brand" : "bg-white/20"
                    }`} />
                    <span className={`flex-1 text-sm ${task.status === "done" ? "line-through text-white/30" : "text-white/80"}`}>
                      {task.title}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${QUADRANT_COLOR[task.quadrant]}`}>
                      {QUADRANT_LABEL[task.quadrant]}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLOR[task.status]}`}>
                      {STATUS_LABEL[task.status]}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

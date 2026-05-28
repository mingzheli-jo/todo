import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createProject, fetchProjects } from "../api/projects";
import Dialog from "../components/ui/Dialog";
import ProjectDetailDialog from "../components/projects/ProjectDetailDialog";
import PDCAAdvanceDialog from "../components/projects/PDCAAdvanceDialog";
import type { Project, PDCAPhase } from "../types";

const PHASE_LABEL: Record<PDCAPhase, string> = {
  plan: "计划",
  do: "执行",
  check: "检查",
  act: "改进",
};

const PHASES: PDCAPhase[] = ["plan", "do", "check", "act"];

interface CreateForm {
  name: string;
  description: string;
  color: string;
  icon: string;
}

const EMPTY_FORM: CreateForm = { name: "", description: "", color: "#7c3aed", icon: "📁" };

export default function ProjectsPage() {
  const qc = useQueryClient();
  const [includeArchived, setIncludeArchived] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [advanceProject, setAdvanceProject] = useState<Project | null>(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects", includeArchived],
    queryFn: () => fetchProjects(includeArchived),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createProject({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        color: form.color,
        icon: form.icon.trim() || "📁",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      setCreateOpen(false);
      setForm(EMPTY_FORM);
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    createMutation.mutate();
  };

  return (
    <>
      <header className="px-7 py-4 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">📁 项目</h1>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-brand"
            />
            <span className="text-xs text-white/40">包含已归档</span>
          </label>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-brand to-brand-light text-white text-xs font-semibold shadow-lg shadow-brand/30"
        >
          ✚ 新建项目
        </button>
      </header>

      <div className="flex-1 p-6 overflow-y-auto">
        {isLoading ? (
          <div className="text-center text-white/30 py-20">加载中...</div>
        ) : projects.length === 0 ? (
          <div className="text-center text-white/30 py-20">
            <div className="text-5xl mb-4">📁</div>
            <div className="text-sm">暂无项目，点击右上角新建</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={() => setDetailProject(project)}
                onAdvance={(e) => {
                  e.stopPropagation();
                  setAdvanceProject(project);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Project Dialog */}
      <Dialog open={createOpen} onClose={() => { setCreateOpen(false); setForm(EMPTY_FORM); }} title="新建项目">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-white/40 mb-1.5">项目名称 <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="例如：个人网站重构"
              required
              autoFocus
              className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-brand/50"
            />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1.5">描述 <span className="text-white/25">（可选）</span></label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="项目简介..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-brand/50 resize-none placeholder:text-white/20"
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

      {/* Detail Dialog */}
      {detailProject && (
        <ProjectDetailDialog
          open={detailProject !== null}
          onClose={() => setDetailProject(null)}
          project={detailProject}
        />
      )}

      {/* PDCA Advance Dialog */}
      {advanceProject && (
        <PDCAAdvanceDialog
          open={advanceProject !== null}
          onClose={() => setAdvanceProject(null)}
          project={advanceProject}
        />
      )}
    </>
  );
}

interface CardProps {
  project: Project;
  onOpen: () => void;
  onAdvance: (e: React.MouseEvent) => void;
}

function ProjectCard({ project, onOpen, onAdvance }: CardProps) {
  const currentPhaseIndex = PHASES.indexOf(project.pdca_phase);

  return (
    <div
      className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 cursor-pointer hover:bg-white/[0.05] transition flex flex-col gap-3"
      onClick={onOpen}
    >
      {/* Top row */}
      <div className="flex items-start gap-2">
        <span className="text-2xl leading-none mt-0.5">{project.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm truncate">{project.name}</span>
            {project.is_archived && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/30 flex-shrink-0">
                已归档
              </span>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className="w-6 h-6 rounded-md bg-white/[0.05] hover:bg-white/[0.10] text-white/30 hover:text-white/70 transition flex items-center justify-center text-xs flex-shrink-0"
          title="编辑"
        >
          ✎
        </button>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-xs text-white/40 leading-relaxed line-clamp-2">{project.description}</p>
      )}

      {/* PDCA progress bar */}
      <div>
        <div className="flex gap-1 mb-1.5">
          {PHASES.map((phase, i) => {
            const isDone = i < currentPhaseIndex;
            const isCurrent = i === currentPhaseIndex;
            return (
              <div
                key={phase}
                className={`flex-1 h-1.5 rounded-full transition ${
                  isDone
                    ? "bg-emerald-500/40"
                    : isCurrent
                    ? "bg-brand shadow-sm shadow-brand/50"
                    : "bg-white/[0.05]"
                }`}
              />
            );
          })}
        </div>
        <div className="text-[10px] text-white/30">
          第 {project.pdca_cycle} 轮 · <span className="text-white/50">{PHASE_LABEL[project.pdca_phase]}</span>
        </div>
      </div>

      {/* Advance button */}
      <button
        onClick={onAdvance}
        disabled={project.is_archived}
        className="w-full py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-white/50 hover:text-white/80 text-xs transition disabled:opacity-30 disabled:cursor-not-allowed"
      >
        推进 PDCA →
      </button>
    </div>
  );
}

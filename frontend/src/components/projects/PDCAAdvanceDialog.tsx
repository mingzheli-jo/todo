import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Dialog from "../ui/Dialog";
import { advancePDCA } from "../../api/projects";
import type { Project, PDCAPhase } from "../../types";

const PHASE_LABEL: Record<PDCAPhase, string> = {
  plan: "计划",
  do: "执行",
  check: "检查",
  act: "改进",
};

const NEXT_PHASE: Record<PDCAPhase, PDCAPhase> = {
  plan: "do",
  do: "check",
  check: "act",
  act: "plan",
};

interface Props {
  open: boolean;
  onClose: () => void;
  project: Project;
}

export default function PDCAAdvanceDialog({ open, onClose, project }: Props) {
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [outcome, setOutcome] = useState("");

  const currentPhase = project.pdca_phase;
  const nextPhase = NEXT_PHASE[currentPhase];
  const nextCycle = currentPhase === "act" ? project.pdca_cycle + 1 : project.pdca_cycle;

  const mutation = useMutation({
    mutationFn: () =>
      advancePDCA(project.id, {
        content,
        outcome: outcome.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["pdca-logs", project.id] });
      setContent("");
      setOutcome("");
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    mutation.mutate();
  };

  const handleClose = () => {
    setContent("");
    setOutcome("");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={`推进 PDCA — 第 ${project.pdca_cycle} 轮 ${PHASE_LABEL[currentPhase]}`}
    >
      <p className="text-xs text-white/40 -mt-2 mb-4">
        完成当前阶段后进入下一阶段：
        <span className="text-white/60">{PHASE_LABEL[currentPhase]}</span>
        {" → "}
        <span className="text-brand-light">{PHASE_LABEL[nextPhase]}</span>
        {currentPhase === "act" && (
          <span className="text-white/40"> （开启第 {nextCycle} 轮）</span>
        )}
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-white/40 mb-1.5">
            本阶段工作内容 <span className="text-red-400">*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="描述本阶段完成的工作..."
            rows={4}
            required
            className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-brand/50 resize-none placeholder:text-white/20"
          />
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1.5">
            成果 / 结论 <span className="text-white/25">（可选）</span>
          </label>
          <textarea
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            placeholder="本阶段的关键成果或结论..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-brand/50 resize-none placeholder:text-white/20"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 py-2 rounded-lg bg-white/[0.06] text-white/60 text-sm hover:bg-white/[0.10] transition"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={mutation.isPending || !content.trim()}
            className="flex-1 py-2 rounded-lg bg-gradient-to-r from-brand to-brand-light text-white text-sm font-semibold shadow-lg shadow-brand/30 disabled:opacity-50 transition"
          >
            {mutation.isPending ? "推进中..." : "确认推进"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

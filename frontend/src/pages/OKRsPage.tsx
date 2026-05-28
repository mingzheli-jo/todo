import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchOKRs, createOKR, updateOKR, deleteOKR } from "../api/okrs";
import Dialog from "../components/ui/Dialog";
import type { OKR, OKRStatus } from "../types";

const PERIODS = ["2026-Q1", "2026-Q2", "2026-Q3", "2026-Q4", "2026"];
const STATUS_LABEL: Record<OKRStatus, string> = {
  active: "进行中",
  completed: "已完成",
  cancelled: "已取消",
};
const STATUS_COLOR: Record<OKRStatus, string> = {
  active: "text-brand-light",
  completed: "text-emerald-400",
  cancelled: "text-white/30",
};

interface OKRFormData {
  title: string;
  description: string;
  period: string;
  parent_id: string;
}

const EMPTY_FORM: OKRFormData = { title: "", description: "", period: "2026-Q2", parent_id: "" };

export default function OKRsPage() {
  const qc = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState("2026-Q2");
  const [createType, setCreateType] = useState<"objective" | "key_result" | null>(null);
  const [editOKR, setEditOKR] = useState<OKR | null>(null);
  const [form, setForm] = useState<OKRFormData>(EMPTY_FORM);

  const { data: okrs = [], isLoading } = useQuery({
    queryKey: ["okrs", selectedPeriod],
    queryFn: () => fetchOKRs({ period: selectedPeriod }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createOKR({
        type: createType!,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        period: form.period,
        parent_id: form.parent_id || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["okrs"] });
      setCreateType(null);
      setForm(EMPTY_FORM);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; progress?: number; status?: OKRStatus; title?: string }) =>
      updateOKR(data.id, { progress: data.progress, status: data.status, title: data.title }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["okrs"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteOKR(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["okrs"] });
      setEditOKR(null);
    },
  });

  const objectives = okrs.filter((o) => o.type === "objective");

  return (
    <>
      <header className="px-7 py-4 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">🎯 OKR 目标</h1>
          <div className="flex gap-1 bg-white/[0.04] rounded-lg p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs transition ${
                  selectedPeriod === p
                    ? "bg-white/[0.08] text-white font-medium"
                    : "text-white/30 hover:text-white/60"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => { setCreateType("objective"); setForm({ ...EMPTY_FORM, period: selectedPeriod }); }}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-brand to-brand-light text-white text-xs font-semibold shadow-lg shadow-brand/30"
        >
          ✚ 新建 Objective
        </button>
      </header>

      <div className="flex-1 p-6 overflow-y-auto">
        {isLoading ? (
          <div className="text-center text-white/30 py-20">加载中...</div>
        ) : objectives.length === 0 ? (
          <div className="text-center text-white/30 py-20">
            <div className="text-5xl mb-4">🎯</div>
            <div className="text-sm">暂无 OKR，点击右上角新建目标</div>
          </div>
        ) : (
          <div className="space-y-4">
            {objectives.map((obj) => (
              <ObjectiveCard
                key={obj.id}
                objective={obj}
                allOKRs={okrs}
                onAddKR={() => {
                  setCreateType("key_result");
                  setForm({ ...EMPTY_FORM, period: selectedPeriod, parent_id: obj.id });
                }}
                onUpdateProgress={(id, progress) => updateMutation.mutate({ id, progress })}
                onEdit={(o) => setEditOKR(o)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog
        open={createType !== null}
        onClose={() => { setCreateType(null); setForm(EMPTY_FORM); }}
        title={createType === "objective" ? "新建 Objective" : "添加 Key Result"}
      >
        <form
          onSubmit={(e) => { e.preventDefault(); if (!form.title.trim()) return; createMutation.mutate(); }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs text-white/40 mb-1.5">标题 <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder={createType === "objective" ? "例如：提升产品质量" : "例如：用户满意度达到 90%"}
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
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-brand/50 resize-none placeholder:text-white/20"
            />
          </div>
          {createType === "objective" && (
            <div>
              <label className="block text-xs text-white/40 mb-1.5">周期</label>
              <select
                value={form.period}
                onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-brand/50 text-white/80"
              >
                {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setCreateType(null); setForm(EMPTY_FORM); }}
              className="flex-1 py-2 rounded-lg bg-white/[0.06] text-white/60 text-sm hover:bg-white/[0.10] transition"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || !form.title.trim()}
              className="flex-1 py-2 rounded-lg bg-gradient-to-r from-brand to-brand-light text-white text-sm font-semibold shadow-lg shadow-brand/30 disabled:opacity-50 transition"
            >
              {createMutation.isPending ? "创建中..." : "创建"}
            </button>
          </div>
        </form>
      </Dialog>

      {/* Edit Dialog */}
      {editOKR && (
        <Dialog open={editOKR !== null} onClose={() => setEditOKR(null)} title="编辑 OKR">
          <div className="space-y-4">
            <div className="text-sm text-white/60">{editOKR.type === "objective" ? "🎯 Objective" : "🔑 Key Result"}: {editOKR.title}</div>
            <div className="flex gap-3">
              {(["active", "completed", "cancelled"] as OKRStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => updateMutation.mutate({ id: editOKR.id, status: s })}
                  className={`flex-1 py-1.5 rounded-lg text-xs border transition ${
                    editOKR.status === s
                      ? "border-brand/40 bg-brand/10 text-brand-light"
                      : "border-white/[0.06] text-white/40 hover:bg-white/[0.04]"
                  }`}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => deleteMutation.mutate(editOKR.id)}
                className="px-4 py-2 rounded-lg text-xs text-red-400 border border-red-500/20 hover:bg-red-500/10 transition"
              >
                删除
              </button>
              <div className="flex-1" />
              <button
                onClick={() => setEditOKR(null)}
                className="px-4 py-2 rounded-lg text-xs text-white/50 border border-white/[0.08] hover:bg-white/[0.04] transition"
              >
                关闭
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}

interface ObjectiveCardProps {
  objective: OKR;
  allOKRs: OKR[];
  onAddKR: () => void;
  onUpdateProgress: (id: string, progress: number) => void;
  onEdit: (okr: OKR) => void;
}

function ObjectiveCard({ objective, allOKRs, onAddKR, onUpdateProgress, onEdit }: ObjectiveCardProps) {
  const krs = (objective.children ?? allOKRs.filter((o) => o.parent_id === objective.id));

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold">{objective.title}</span>
            <span className={`text-[10px] font-semibold ${STATUS_COLOR[objective.status]}`}>
              {STATUS_LABEL[objective.status]}
            </span>
            <span className="text-[10px] text-white/25 ml-auto">{objective.period}</span>
          </div>
          {objective.description && (
            <p className="text-xs text-white/40">{objective.description}</p>
          )}
        </div>
        <button
          onClick={() => onEdit(objective)}
          className="w-6 h-6 rounded-md bg-white/[0.05] hover:bg-white/[0.10] text-white/30 hover:text-white/70 transition flex items-center justify-center text-xs flex-shrink-0"
        >
          ✎
        </button>
      </div>

      {/* Objective progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-white/30">整体进度</span>
          <span className="text-xs font-bold text-brand-light">{objective.progress}%</span>
        </div>
        <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand to-brand-light rounded-full transition-all duration-500"
            style={{ width: `${objective.progress}%` }}
          />
        </div>
      </div>

      {/* Key Results */}
      {krs.length > 0 && (
        <div className="space-y-3 mb-3">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-white/25">
            Key Results ({krs.length})
          </div>
          {krs.map((kr) => (
            <KRCard key={kr.id} kr={kr} onUpdateProgress={onUpdateProgress} onEdit={onEdit} />
          ))}
        </div>
      )}

      <button
        onClick={onAddKR}
        className="w-full py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-dashed border-white/[0.08] text-white/30 hover:text-white/60 text-xs transition"
      >
        ＋ 添加 Key Result
      </button>
    </div>
  );
}

interface KRCardProps {
  kr: OKR;
  onUpdateProgress: (id: string, progress: number) => void;
  onEdit: (okr: OKR) => void;
}

function KRCard({ kr, onUpdateProgress, onEdit }: KRCardProps) {
  const [localProgress, setLocalProgress] = useState(kr.progress);

  return (
    <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-white/70 flex-1">{kr.title}</span>
        <span className={`text-[10px] ${STATUS_COLOR[kr.status]}`}>{STATUS_LABEL[kr.status]}</span>
        <button
          onClick={() => onEdit(kr)}
          className="w-5 h-5 rounded text-white/20 hover:text-white/60 transition flex items-center justify-center text-xs flex-shrink-0"
        >
          ✎
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={100}
          value={localProgress}
          onChange={(e) => setLocalProgress(Number(e.target.value))}
          onMouseUp={() => onUpdateProgress(kr.id, localProgress)}
          onTouchEnd={() => onUpdateProgress(kr.id, localProgress)}
          className="flex-1 h-1.5 accent-brand cursor-pointer"
        />
        <span className="text-xs font-bold text-white/60 w-9 text-right">{localProgress}%</span>
      </div>
    </div>
  );
}

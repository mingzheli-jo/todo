import type { Task, Quadrant } from "../../types";
import TaskCard from "./TaskCard";

const QUADRANT_CONFIG: Record<Quadrant, { label: string; dot: string; border: string; bg: string }> = {
  urgent_important: { label: "紧急且重要", dot: "🔴", border: "border-q1/10", bg: "from-q1/[0.06] to-q1/[0.02]" },
  important: { label: "重要不紧急", dot: "🟡", border: "border-q2/10", bg: "from-q2/[0.06] to-q2/[0.02]" },
  urgent: { label: "紧急不重要", dot: "🔵", border: "border-q3/10", bg: "from-q3/[0.06] to-q3/[0.02]" },
  neither: { label: "不紧急不重要", dot: "⚪", border: "border-q4/10", bg: "from-q4/[0.06] to-q4/[0.02]" },
};

interface Props {
  quadrant: Quadrant;
  tasks: Task[];
  onEdit: (task: Task) => void;
}

export default function QuadrantColumn({ quadrant, tasks, onEdit }: Props) {
  const cfg = QUADRANT_CONFIG[quadrant];
  return (
    <div
      className={`rounded-[14px] p-4 bg-gradient-to-br ${cfg.bg} border ${cfg.border} relative overflow-hidden`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-[13px] font-semibold">
          <span>{cfg.dot}</span> {cfg.label}
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.06] text-white/30">
          {tasks.length} 项
        </span>
      </div>
      <div className="space-y-2 overflow-y-auto max-h-[calc(100%-40px)]">
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} onEdit={onEdit} />
        ))}
        {tasks.length === 0 && (
          <div className="text-center text-white/15 text-xs py-8">暂无任务</div>
        )}
      </div>
    </div>
  );
}

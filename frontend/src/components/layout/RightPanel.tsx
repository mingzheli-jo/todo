export default function RightPanel() {
  return (
    <aside className="w-[300px] border-l border-white/[0.06] bg-surface-raised/60 flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-white/[0.06]">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-3">
          📊 今日统计
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { value: "—", label: "已完成", color: "text-emerald-400" },
            { value: "—", label: "待处理", color: "text-amber-400" },
          ].map((s) => (
            <div key={s.label} className="bg-white/[0.03] rounded-xl p-3 text-center">
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-white/30 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center text-white/20 text-xs">
        番茄钟 &amp; 习惯 — Phase 4
      </div>
    </aside>
  );
}

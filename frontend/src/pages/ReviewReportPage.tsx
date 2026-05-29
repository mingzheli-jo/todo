import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchReviews } from "../api/reviews";
import type { DailyReview } from "../types";

const MOOD_EMOJIS = ["😢", "😕", "😐", "🙂", "😄"];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function MoodTrend({ reviews }: { reviews: DailyReview[] }) {
  const points = reviews
    .filter((r) => r.mood != null)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
  if (points.length < 2) {
    return <div className="text-white/30 text-sm py-8 text-center">数据不足以绘制趋势</div>;
  }
  const W = 600, H = 120, pad = 10;
  const dx = (W - pad * 2) / (points.length - 1);
  const coords = points.map((r, i) => {
    const x = pad + dx * i;
    const y = H - pad - ((r.mood! - 1) / 4) * (H - pad * 2);
    return `${x},${y}`;
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-32">
      <polyline points={coords.join(" ")} fill="none" stroke="#8B5CF6" strokeWidth="2" />
      {coords.map((c, i) => {
        const [x, y] = c.split(",");
        return <circle key={i} cx={x} cy={y} r="3" fill="#A78BFA" />;
      })}
    </svg>
  );
}

export default function ReviewReportPage() {
  const [range, setRange] = useState(30);
  const [selected, setSelected] = useState<DailyReview | null>(null);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["review-report", range],
    queryFn: () => fetchReviews({ start_date: daysAgo(range), end_date: daysAgo(0) }),
  });

  const sorted = [...reviews].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <header className="px-7 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <h1 className="text-xl font-bold">📊 复盘报表</h1>
        <div className="flex gap-1.5">
          {[7, 30, 90].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs transition ${
                range === r ? "bg-brand/20 text-purple-300" : "bg-white/[0.05] text-white/50 hover:text-white/80"
              }`}
            >
              近 {r} 天
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 p-6 overflow-y-auto space-y-5">
        <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-3">心情趋势</div>
          {isLoading ? <div className="text-white/30 text-sm py-8 text-center">加载中...</div> : <MoodTrend reviews={reviews} />}
        </div>

        <div className="space-y-2">
          {sorted.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelected(r)}
              className="w-full text-left bg-white/[0.03] rounded-xl p-3.5 border border-white/[0.06] hover:bg-white/[0.05] flex items-center gap-3"
            >
              <span className="text-2xl">{r.mood == null ? "·" : MOOD_EMOJIS[r.mood - 1]}</span>
              <span className="font-mono text-xs text-white/50 w-24">{r.date}</span>
              <span className="flex-1 text-sm text-white/70 truncate">{r.raw_content || "（空）"}</span>
            </button>
          ))}
          {!isLoading && sorted.length === 0 && (
            <div className="text-center text-white/30 py-20">该区间暂无复盘</div>
          )}
        </div>
      </div>

      {selected && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-surface-raised rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto border border-white/[0.08]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">{selected.date} {selected.mood != null && MOOD_EMOJIS[selected.mood - 1]}</h2>
              <button onClick={() => setSelected(null)} className="text-white/40 hover:text-white">✕</button>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-white/25 mb-1">原始复盘</div>
            <p className="text-sm text-white/75 whitespace-pre-wrap mb-4">{selected.raw_content || "（空）"}</p>
            {selected.ai_polished && (
              <>
                <div className="text-[10px] uppercase tracking-widest text-white/25 mb-1">AI 润色</div>
                <p className="text-sm text-white/75 whitespace-pre-wrap">{selected.ai_polished}</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

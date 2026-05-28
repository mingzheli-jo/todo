import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTodayReview, triggerAIProcess, fetchAIStatus, upsertReview, updateReview } from "../api/reviews";
import type { AIStatus, DailyReview } from "../types";

const MOOD_EMOJIS = ["😢", "😕", "😐", "🙂", "😄"];

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(dateStr: string, delta: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + delta);
  return formatDate(d);
}

export default function ReviewsPage() {
  const qc = useQueryClient();
  const today = formatDate(new Date());
  const [currentDate, setCurrentDate] = useState(today);
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [aiStatus, setAIStatus] = useState<AIStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [structuredOpen, setStructuredOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reviewRef = useRef<DailyReview | null>(null);

  const isToday = currentDate === today;

  const { data: review, isLoading } = useQuery({
    queryKey: ["review", currentDate],
    queryFn: async () => {
      if (isToday) return fetchTodayReview();
      // For past dates, use upsert with empty content to get/create
      const { data } = await import("../api/reviews").then(m =>
        m.fetchReviews({ start_date: currentDate, end_date: currentDate }).then(arr => ({ data: arr[0] ?? null }))
      );
      return data;
    },
  });

  useEffect(() => {
    if (review) {
      reviewRef.current = review;
      setContent(review.raw_content ?? "");
      setMood(review.mood ?? null);
      if (review.ai_structured || review.ai_polished) {
        setAIStatus({ status: "ready", ai_structured: review.ai_structured, ai_polished: review.ai_polished });
      } else if (review.ai_task_id) {
        setAIStatus({ status: "processing" });
        startPolling(review.id);
      } else {
        setAIStatus({ status: "idle" });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [review?.id]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const startPolling = useCallback((reviewId: string) => {
    setIsPolling(true);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const status = await fetchAIStatus(reviewId);
      setAIStatus(status);
      if (status.status === "ready") {
        stopPolling();
        qc.invalidateQueries({ queryKey: ["review", currentDate] });
      }
    }, 2000);
  }, [currentDate, qc, stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const saveMutation = useMutation({
    mutationFn: async (payload: { raw_content: string; mood: number | null }) => {
      if (review) {
        return updateReview(review.id, payload);
      }
      return upsertReview({ date: currentDate, ...payload });
    },
    onSuccess: (updated) => {
      reviewRef.current = updated;
      qc.setQueryData(["review", currentDate], updated);
    },
  });

  const handleBlur = () => {
    if (saveMutation.isPending) return;
    saveMutation.mutate({ raw_content: content, mood });
  };

  const handleMoodSelect = (m: number) => {
    if (saveMutation.isPending) return;
    const newMood = mood === m ? null : m;
    setMood(newMood);
    if (review) {
      saveMutation.mutate({ raw_content: content, mood: newMood });
    }
  };

  const aiMutation = useMutation({
    mutationFn: async () => {
      let reviewId = review?.id;
      if (!reviewId) {
        const created = await upsertReview({ date: currentDate, raw_content: content, mood: mood ?? undefined });
        reviewId = created.id;
        qc.setQueryData(["review", currentDate], created);
      } else if (content !== (reviewRef.current?.raw_content ?? "")) {
        await updateReview(reviewId, { raw_content: content, mood: mood ?? undefined });
      }
      return triggerAIProcess(reviewId!);
    },
    onSuccess: (_data, _v, _ctx) => {
      const rev = reviewRef.current;
      if (rev) {
        startPolling(rev.id);
        setAIStatus({ status: "processing" });
      }
    },
  });

  const navDate = (delta: number) => {
    stopPolling();
    setAIStatus(null);
    setContent("");
    setMood(null);
    setCurrentDate(d => addDays(d, delta));
  };

  return (
    <>
      <header className="px-7 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">📝 每日复盘</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navDate(-1)}
              className="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-white/[0.10] text-white/60 hover:text-white transition flex items-center justify-center text-sm"
            >
              ‹
            </button>
            <span className="text-sm font-mono text-white/70 w-28 text-center">{currentDate}</span>
            <button
              onClick={() => navDate(1)}
              disabled={currentDate >= today}
              className="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-white/[0.10] text-white/60 hover:text-white transition flex items-center justify-center text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ›
            </button>
          </div>
        </div>
        <button
          onClick={() => aiMutation.mutate()}
          disabled={aiMutation.isPending || isPolling}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-brand to-brand-light text-white text-xs font-semibold shadow-lg shadow-brand/30 disabled:opacity-50 flex items-center gap-2"
        >
          {(aiMutation.isPending || isPolling) ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              AI 处理中...
            </>
          ) : "🤖 AI 智能转换"}
        </button>
      </header>

      <div className="flex-1 p-6 overflow-y-auto space-y-5">
        {isLoading ? (
          <div className="text-center text-white/30 py-20">加载中...</div>
        ) : (
          <>
            {/* Mood selector */}
            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-3">今日心情</div>
              <div className="flex gap-3">
                {MOOD_EMOJIS.map((emoji, i) => {
                  const val = i + 1;
                  return (
                    <button
                      key={val}
                      onClick={() => handleMoodSelect(val)}
                      disabled={saveMutation.isPending}
                      className={`text-2xl transition-all rounded-lg p-1.5 disabled:cursor-not-allowed ${
                        mood === val
                          ? "bg-brand/20 ring-1 ring-brand scale-110"
                          : "hover:bg-white/[0.05] opacity-50 hover:opacity-100"
                      }`}
                      title={`${val} 分`}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content textarea */}
            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-white/25">今日复盘</div>
                <div className="flex items-center gap-2">
                  {saveMutation.isPending ? (
                    <span className="flex items-center gap-1 text-xs text-white/30">
                      <span className="inline-block w-3 h-3 border-2 border-white/20 border-t-white/50 rounded-full animate-spin" />
                      保存中...
                    </span>
                  ) : saveMutation.isError ? (
                    <span className="text-xs text-red-400">✕ 保存失败</span>
                  ) : saveMutation.isSuccess ? (
                    <span className="text-xs text-white/30">✓ 已保存</span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => { if (!saveMutation.isPending) saveMutation.mutate({ raw_content: content, mood }); }}
                    disabled={saveMutation.isPending}
                    className="px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.10] text-white/50 hover:text-white/80 text-xs transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    保存
                  </button>
                </div>
              </div>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                onBlur={handleBlur}
                placeholder="记录今天的收获、挑战、感悟……"
                rows={10}
                className="w-full bg-transparent text-white/80 text-sm leading-relaxed resize-none outline-none placeholder:text-white/20"
              />
            </div>

            {/* AI results */}
            {aiStatus?.status === "processing" && (
              <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06] flex items-center gap-3 text-white/50 text-sm">
                <span className="inline-block w-4 h-4 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
                AI 正在处理，请稍候...
              </div>
            )}

            {aiStatus?.status === "ready" && (
              <div className="space-y-4">
                {/* Structured JSON collapsible */}
                {aiStatus.ai_structured && (
                  <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] overflow-hidden">
                    <button
                      onClick={() => setStructuredOpen(o => !o)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left"
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-white/25">
                        结构化摘要
                      </span>
                      <span className="text-white/30 text-xs">{structuredOpen ? "▲ 收起" : "▼ 展开"}</span>
                    </button>
                    {structuredOpen && (
                      <div className="px-4 pb-4">
                        <StructuredView data={aiStatus.ai_structured as Record<string, unknown>} />
                      </div>
                    )}
                  </div>
                )}

                {/* Polished article */}
                {aiStatus.ai_polished && (
                  <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-3">
                      AI 润色版本
                    </div>
                    <p className="text-white/75 text-sm leading-relaxed whitespace-pre-wrap">{aiStatus.ai_polished}</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function StructuredView({ data }: { data: Record<string, unknown> }) {
  const labelMap: Record<string, string> = {
    achievements: "成就",
    challenges: "挑战",
    learnings: "收获",
    tomorrow_plans: "明日计划",
    keywords: "关键词",
  };

  return (
    <div className="space-y-3">
      {Object.entries(data).map(([key, value]) => (
        <div key={key}>
          <div className="text-xs text-white/40 mb-1">{labelMap[key] ?? key}</div>
          {Array.isArray(value) ? (
            <ul className="space-y-0.5">
              {(value as string[]).map((item, i) => (
                <li key={i} className="text-sm text-white/70 flex gap-2">
                  <span className="text-brand-light">·</span>
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-sm text-white/70">{String(value)}</span>
          )}
        </div>
      ))}
    </div>
  );
}

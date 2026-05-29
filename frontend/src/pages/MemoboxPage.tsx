import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMemos, createMemo, updateMemo, deleteMemo, convertMemo } from "../api/memos";
import type { Memo, MemoStatusFilter } from "../types";

export default function MemoboxPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<MemoStatusFilter>("open");
  const [draft, setDraft] = useState("");

  const { data: memos = [], isLoading } = useQuery({
    queryKey: ["memos", filter],
    queryFn: () => fetchMemos(filter),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["memos"] });

  const createMut = useMutation({
    mutationFn: (content: string) => createMemo(content),
    onSuccess: () => { setDraft(""); invalidate(); },
  });
  const toggleMut = useMutation({
    mutationFn: (m: Memo) => updateMemo(m.id, { is_done: !m.is_done }),
    onSuccess: invalidate,
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteMemo(id),
    onSuccess: invalidate,
  });
  const convertMut = useMutation({
    mutationFn: (id: string) => convertMemo(id, { quadrant: "neither" }),
    onSuccess: () => { invalidate(); qc.invalidateQueries({ queryKey: ["tasks"] }); },
  });

  const submit = () => {
    const text = draft.trim();
    if (text && !createMut.isPending) createMut.mutate(text);
  };

  return (
    <>
      <header className="px-7 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <h1 className="text-xl font-bold">🗒️ 速记收集箱</h1>
        <div className="flex gap-1.5">
          {(["open", "all"] as MemoStatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs transition ${
                filter === f ? "bg-brand/20 text-purple-300" : "bg-white/[0.05] text-white/50 hover:text-white/80"
              }`}
            >
              {f === "open" ? "未处理" : "全部"}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 p-6 overflow-y-auto space-y-4">
        <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit(); }}
            placeholder="随手记点什么…… (Ctrl/Cmd + Enter 保存)"
            rows={3}
            className="w-full bg-transparent text-white/80 text-sm resize-none outline-none placeholder:text-white/20"
          />
          <div className="flex justify-end">
            <button
              onClick={submit}
              disabled={createMut.isPending || !draft.trim()}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-brand to-brand-light text-white text-xs font-semibold disabled:opacity-40"
            >
              记一条
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center text-white/30 py-20">加载中...</div>
        ) : memos.length === 0 ? (
          <div className="text-center text-white/30 py-20">暂无备忘</div>
        ) : (
          <ul className="space-y-2">
            {memos.map((m) => (
              <li
                key={m.id}
                className="bg-white/[0.03] rounded-xl p-3.5 border border-white/[0.06] flex items-start gap-3"
              >
                <input
                  type="checkbox"
                  checked={m.is_done}
                  onChange={() => toggleMut.mutate(m)}
                  className="mt-1 accent-brand"
                />
                <span className={`flex-1 text-sm whitespace-pre-wrap ${m.is_done ? "text-white/30 line-through" : "text-white/80"}`}>
                  {m.content}
                </span>
                <div className="flex gap-1.5 flex-shrink-0">
                  {!m.is_done && (
                    <button
                      onClick={() => convertMut.mutate(m.id)}
                      disabled={convertMut.isPending}
                      className="px-2 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.10] text-white/60 text-xs"
                      title="转为任务"
                    >
                      转任务
                    </button>
                  )}
                  <button
                    onClick={() => deleteMut.mutate(m.id)}
                    className="px-2 py-1 rounded-md bg-white/[0.06] hover:bg-red-500/20 text-white/60 hover:text-red-300 text-xs"
                  >
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

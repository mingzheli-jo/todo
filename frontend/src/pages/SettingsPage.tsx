import { useEffect, useState } from "react";
import { useTheme } from "../hooks/useTheme";
import { fetchTasks } from "../api/tasks";
import { fetchReviews } from "../api/reviews";

type ViewKey = "quadrant" | "kanban" | "timeline" | "list";

const VIEW_OPTIONS: { value: ViewKey; label: string }[] = [
  { value: "quadrant", label: "四象限" },
  { value: "kanban", label: "看板" },
  { value: "timeline", label: "时间线" },
  { value: "list", label: "列表" },
];

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/[0.03] rounded-xl p-5 border border-white/[0.04]">
      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-4">{title}</h3>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [defaultView, setDefaultView] = useState<ViewKey>("quadrant");
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem("toto_view");
      if (v === "quadrant" || v === "kanban" || v === "timeline" || v === "list") {
        setDefaultView(v);
      }
    } catch {
      // ignore
    }
  }, []);

  const changeDefaultView = (v: ViewKey) => {
    setDefaultView(v);
    try { localStorage.setItem("toto_view", v); } catch { /* ignore */ }
  };

  const exportTasksCSV = async () => {
    setExporting("tasks");
    try {
      const tasks = await fetchTasks();
      const header = [
        "id", "title", "description", "quadrant", "status", "priority",
        "due_date", "project_id", "created_at", "completed_at",
      ];
      const rows = tasks.map((t) => header.map((h) => csvEscape((t as unknown as Record<string, unknown>)[h])).join(","));
      const csv = [header.join(","), ...rows].join("\n");
      downloadBlob(csv, `toto-tasks-${todayStr()}.csv`, "text/csv;charset=utf-8;");
    } finally {
      setExporting(null);
    }
  };

  const exportReviewsMD = async () => {
    setExporting("reviews");
    try {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const reviews = await fetchReviews({
        start_date: oneYearAgo.toISOString().slice(0, 10),
        end_date: todayStr(),
      });
      const sorted = [...reviews].sort((a, b) => (a.date > b.date ? -1 : 1));
      const parts = sorted.map((r) => {
        const moodLine = r.mood ? `**心情:** ${"⭐".repeat(r.mood)}\n\n` : "";
        const polishedSection = r.ai_polished ? `### AI 润色\n\n${r.ai_polished}\n\n` : "";
        return `## ${r.date}\n\n${moodLine}### 原始记录\n\n${r.raw_content || "（无内容）"}\n\n${polishedSection}---\n\n`;
      });
      const md = `# Toto 复盘导出\n\n导出时间: ${todayStr()}\n共 ${sorted.length} 条记录\n\n---\n\n` + parts.join("");
      downloadBlob(md, `toto-reviews-${todayStr()}.md`, "text/markdown;charset=utf-8;");
    } finally {
      setExporting(null);
    }
  };

  return (
    <>
      <header className="px-7 py-4 border-b border-white/[0.06]">
        <h1 className="text-xl font-bold">⚙️ 设置</h1>
      </header>
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-5">
          {/* Appearance */}
          <Section title="外观">
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-white/60 mb-2">主题</label>
                <div className="inline-flex bg-white/[0.04] rounded-lg p-0.5">
                  {(["dark", "light"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`px-4 py-1.5 rounded-md text-xs transition ${
                        theme === t
                          ? "bg-white/[0.08] text-white font-medium"
                          : "text-white/40 hover:text-white/70"
                      }`}
                    >
                      {t === "dark" ? "🌙 深色" : "☀️ 浅色"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-2">默认任务视图</label>
                <select
                  value={defaultView}
                  onChange={(e) => changeDefaultView(e.target.value as ViewKey)}
                  className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white/80 focus:outline-none focus:border-brand/50"
                >
                  {VIEW_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-surface-raised">
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Section>

          {/* Notifications */}
          <Section title="通知">
            <div className="space-y-3 opacity-50">
              <div className="flex items-center justify-between text-xs text-white/40">
                <span>浏览器通知</span>
                <span className="px-2 py-1 rounded bg-white/[0.04]">即将上线</span>
              </div>
              <div className="flex items-center justify-between text-xs text-white/40">
                <span>任务到期提醒</span>
                <span className="px-2 py-1 rounded bg-white/[0.04]">即将上线</span>
              </div>
            </div>
          </Section>

          {/* Data Export */}
          <Section title="数据导出">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={exportTasksCSV}
                disabled={exporting !== null}
                className="px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-white/70 text-xs disabled:opacity-50"
              >
                {exporting === "tasks" ? "导出中..." : "📋 导出任务 (CSV)"}
              </button>
              <button
                onClick={exportReviewsMD}
                disabled={exporting !== null}
                className="px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-white/70 text-xs disabled:opacity-50"
              >
                {exporting === "reviews" ? "导出中..." : "📝 导出复盘 (Markdown)"}
              </button>
            </div>
          </Section>

          {/* About */}
          <Section title="关于">
            <div className="text-xs text-white/60 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand to-brand-light flex items-center justify-center text-white font-bold text-sm">
                  T
                </div>
                <div>
                  <div className="font-semibold text-white/80">Toto</div>
                  <div className="text-[11px] text-white/40">v0.1.0</div>
                </div>
              </div>
              <p className="text-white/50">个人智能 To-Do 与复盘系统</p>
              <a href="#" className="inline-block text-brand-light/70 hover:text-brand-light text-[11px]">
                GitHub →
              </a>
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}

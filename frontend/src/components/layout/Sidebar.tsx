import { useAuth } from "../../hooks/useAuth";

const NAV_GROUPS = [
  {
    label: "工作台",
    items: [
      { icon: "📋", name: "任务看板", path: "/" },
      { icon: "📅", name: "时间线", path: "/timeline", disabled: true },
      { icon: "📁", name: "项目", path: "/projects", disabled: true },
      { icon: "🎯", name: "OKR 目标", path: "/okrs", disabled: true },
    ],
  },
  {
    label: "个人成长",
    items: [
      { icon: "📝", name: "每日复盘", path: "/reviews", disabled: true },
      { icon: "📊", name: "周/月汇总", path: "/summaries", disabled: true },
      { icon: "🔥", name: "习惯打卡", path: "/habits", disabled: true },
      { icon: "🍅", name: "番茄钟", path: "/pomodoro", disabled: true },
    ],
  },
  {
    label: "系统",
    items: [
      { icon: "🤖", name: "AI 配置", path: "/settings/ai", disabled: true },
      { icon: "📢", name: "飞书推送", path: "/settings/feishu", disabled: true },
      { icon: "⚙️", name: "设置", path: "/settings", disabled: true },
    ],
  },
];

export default function Sidebar() {
  const { logout } = useAuth();

  return (
    <aside className="w-60 bg-gradient-to-b from-surface-raised to-surface border-r border-white/[0.06] flex flex-col flex-shrink-0">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-brand to-brand-light flex items-center justify-center text-white font-bold shadow-lg shadow-brand/30">
          T
        </div>
        <span className="text-xl font-bold">
          To<span className="text-brand-light">to</span>
        </span>
      </div>

      <nav className="flex-1 px-3 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="px-2 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/25">
              {group.label}
            </div>
            {group.items.map((item) => (
              <a
                key={item.path}
                href={item.disabled ? undefined : item.path}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition ${
                  item.path === "/"
                    ? "bg-gradient-to-r from-brand/15 to-brand-light/10 text-purple-300 font-medium"
                    : "text-white/40 hover:bg-white/[0.04] hover:text-white/70"
                } ${item.disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                {item.name}
              </a>
            ))}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-white/[0.06]">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-white/40 hover:bg-white/[0.04] hover:text-white/70 transition"
        >
          <span className="text-base w-5 text-center">🚪</span>
          退出登录
        </button>
      </div>
    </aside>
  );
}

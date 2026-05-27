import Sidebar from "./Sidebar";
import RightPanel from "./RightPanel";

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
      <RightPanel />
    </div>
  );
}

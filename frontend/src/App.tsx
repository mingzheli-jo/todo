import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ReviewsPage from "./pages/ReviewsPage";
import AISettingsPage from "./pages/AISettingsPage";
import ProjectsPage from "./pages/ProjectsPage";
import OKRsPage from "./pages/OKRsPage";
import HabitsPage from "./pages/HabitsPage";
import PomodoroPage from "./pages/PomodoroPage";
import SummariesPage from "./pages/SummariesPage";
import FeishuSettingsPage from "./pages/FeishuSettingsPage";
import StatsPage from "./pages/StatsPage";
import SettingsPage from "./pages/SettingsPage";
import MemoboxPage from "./pages/MemoboxPage";
import ReviewReportPage from "./pages/ReviewReportPage";
import Shell from "./components/layout/Shell";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <Shell>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/reviews" element={<ReviewsPage />} />
                <Route path="/settings/ai" element={<AISettingsPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/okrs" element={<OKRsPage />} />
                <Route path="/habits" element={<HabitsPage />} />
                <Route path="/pomodoro" element={<PomodoroPage />} />
                <Route path="/summaries" element={<SummariesPage />} />
                <Route path="/settings/feishu" element={<FeishuSettingsPage />} />
                <Route path="/stats" element={<StatsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/memos" element={<MemoboxPage />} />
                <Route path="/review-report" element={<ReviewReportPage />} />
              </Routes>
            </Shell>
          </RequireAuth>
        }
      />
    </Routes>
  );
}

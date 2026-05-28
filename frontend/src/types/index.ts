export type Quadrant = "urgent_important" | "important" | "urgent" | "neither";
export type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";
export type PDCAPhase = "plan" | "do" | "check" | "act";

export interface Task {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  quadrant: Quadrant;
  status: TaskStatus;
  priority: number;
  due_date: string | null;
  tags: string[] | null;
  sort_order: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  pdca_phase: PDCAPhase;
  pdca_cycle: number;
  is_archived: boolean;
  created_at: string;
}

export interface PDCALog {
  id: string;
  project_id: string;
  cycle: number;
  phase: PDCAPhase;
  content: string;
  outcome: string | null;
  created_at: string;
}

export interface TodayStats {
  completed: number;
  pending: number;
  total: number;
}

export interface AIProvider {
  id: string;
  name: string;
  base_url: string;
  model_name: string;
  is_default: boolean;
  created_at: string;
}

export interface AIProviderCreate {
  name: string;
  base_url: string;
  api_key?: string;
  model_name: string;
  is_default?: boolean;
}

export interface DailyReview {
  id: string;
  user_id: string;
  date: string;
  raw_content: string;
  ai_structured?: Record<string, unknown> | null;
  ai_polished?: string | null;
  mood?: number | null;
  ai_task_id?: string | null;
  created_at: string;
  updated_at: string;
}

export type AIStatusState = "processing" | "ready" | "idle";

export interface AIStatus {
  status: AIStatusState;
  ai_structured?: Record<string, unknown> | null;
  ai_polished?: string | null;
}

// OKR types
export type OKRType = "objective" | "key_result";
export type OKRStatus = "active" | "completed" | "cancelled";

export interface OKR {
  id: string;
  user_id: string;
  parent_id: string | null;
  type: OKRType;
  title: string;
  description: string | null;
  period: string;
  progress: number;
  status: OKRStatus;
  created_at: string;
  updated_at: string;
  children?: OKR[];
}

// Habit types
export type HabitFrequency = "daily" | "weekday" | "weekly";

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  frequency: HabitFrequency;
  target_count: number;
  is_active: boolean;
  created_at: string;
}

export interface HabitRecord {
  id: string;
  habit_id: string;
  date: string;
  completed: boolean;
  note: string | null;
}

export interface HabitTodayStatus {
  habit: Habit;
  completed_today: boolean;
  record: HabitRecord | null;
}

// Pomodoro types
export interface PomodoroSession {
  id: string;
  user_id: string;
  task_id: string | null;
  duration_min: number;
  started_at: string;
  completed_at: string | null;
  interrupted: boolean;
}

export interface PomodoroTodayStats {
  total_sessions: number;
  completed_sessions: number;
  total_minutes: number;
  current_session: PomodoroSession | null;
}

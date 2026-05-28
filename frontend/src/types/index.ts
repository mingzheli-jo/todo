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

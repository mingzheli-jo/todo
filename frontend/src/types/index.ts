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

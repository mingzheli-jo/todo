import type { Task, Quadrant } from "../../types";
import QuadrantColumn from "./QuadrantColumn";

const QUADRANTS: Quadrant[] = ["urgent_important", "important", "urgent", "neither"];

interface Props {
  tasks: Task[];
  onEdit: (task: Task) => void;
}

export default function QuadrantGrid({ tasks, onEdit }: Props) {
  const grouped = QUADRANTS.reduce(
    (acc, q) => {
      acc[q] = tasks.filter((t) => t.quadrant === q && t.status !== "cancelled");
      return acc;
    },
    {} as Record<Quadrant, Task[]>
  );

  return (
    <div className="grid grid-cols-2 grid-rows-2 gap-4 h-full">
      {QUADRANTS.map((q) => (
        <QuadrantColumn key={q} quadrant={q} tasks={grouped[q]} onEdit={onEdit} />
      ))}
    </div>
  );
}

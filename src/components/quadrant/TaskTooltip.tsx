import type { OrgUser, TaskListItem } from "@/lib/api";
import { calculateTaskWeight } from "@/lib/quadrant";

type TaskTooltipProps = {
  task: TaskListItem;
  users: OrgUser[];
  x: number;
  y: number;
};

export function TaskTooltip({ task, users, x, y }: TaskTooltipProps) {
  return (
    <div
      className="mq-bubble-tooltip fixed z-40 w-[290px] p-3 text-xs text-[#060a32]"
      style={{ left: Math.min(x + 16, window.innerWidth - 300), top: Math.max(12, y - 12) }}
    >
      <p className="font-semibold">{task.name}</p>
      <p className="mt-1 text-black/65">{task.description ?? "No description"}</p>
      <div className="mt-2 grid grid-cols-2 gap-1 text-[11px]">
        <span>Q{task.priorityQuadrant}</span>
        <span>Time: {task.timeEstimate}</span>
        <span>Complex: {task.complexity}</span>
        <span>Diff: {task.difficulty}</span>
        <span className="col-span-2">Due: {task.dueDateTime ? new Date(task.dueDateTime).toLocaleString() : "Not set"}</span>
        <span className="col-span-2">Phase: {task.phase}</span>
        <span className="col-span-2">Lead: {task.leadUser?.name ?? "Unassigned"}</span>
        <span className="col-span-2">
          Associated: {task.associatedUserIds.map((id) => users.find((u) => u.id === id)?.name ?? id).join(", ") || "None"}
        </span>
        <span className="col-span-2">Weight: {calculateTaskWeight(task).toFixed(1)}</span>
      </div>
    </div>
  );
}

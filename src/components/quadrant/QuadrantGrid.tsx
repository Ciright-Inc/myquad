import type { OrgUser, TaskListItem } from "@/lib/api";
import { calculateBubbleSize, calculateXPosition, calculateYPosition } from "@/lib/quadrant";
import { QuadrantBubble } from "@/components/quadrant/QuadrantBubble";
import { TaskTooltip } from "@/components/quadrant/TaskTooltip";

type QuadrantGridProps = {
  tasks: TaskListItem[];
  users: OrgUser[];
  hoverTask: TaskListItem | null;
  hoverPos: { x: number; y: number };
  setHoverTask: (task: TaskListItem | null) => void;
  setHoverPos: (pos: { x: number; y: number }) => void;
  onOpenTask: (id: string) => void;
};

export function QuadrantGrid(props: QuadrantGridProps) {
  return (
    <>
      <div className="mq-quadrant">
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          <line x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(6,10,50,0.18)" />
          <line x1="0" y1="50%" x2="100%" y2="50%" stroke="rgba(6,10,50,0.18)" />
        </svg>
        <div className="mq-quadrant-overlay pointer-events-none absolute inset-0">
          <div className="mq-axis-label-x">Priority / Importance</div>
          <div className="mq-axis-label-y">Timeliness / Urgency</div>
          <div className="mq-q-label mq-q1">Q1 Critical Now</div>
          <div className="mq-q-label mq-q2">Q2 Important, Can Wait</div>
          <div className="mq-q-label mq-q4">Q4 Noise</div>
          <div className="mq-q-label mq-q3">Q3 Low Importance</div>
        </div>
        {props.tasks.map((task) => (
          <QuadrantBubble
            key={task.id}
            x={calculateXPosition(task)}
            y={calculateYPosition(task)}
            size={calculateBubbleSize(task.timeEstimate)}
            quadrant={task.priorityQuadrant}
            label={String(task.timeEstimate)}
            onClick={() => props.onOpenTask(task.id)}
            onMouseEnter={(e) => {
              props.setHoverTask(task);
              props.setHoverPos({ x: e.clientX, y: e.clientY });
            }}
            onMouseMove={(e) => props.setHoverPos({ x: e.clientX, y: e.clientY })}
            onMouseLeave={() => props.setHoverTask(null)}
          />
        ))}
      </div>
      {props.hoverTask ? (
        <TaskTooltip task={props.hoverTask} users={props.users} x={props.hoverPos.x} y={props.hoverPos.y} />
      ) : null}
    </>
  );
}

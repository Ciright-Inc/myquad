import type { TaskListItem } from "@/lib/api";

export function calculateQuadrant(task: Pick<TaskListItem, "priorityQuadrant">): 1 | 2 | 3 | 4 {
  return task.priorityQuadrant;
}

export function calculateBubbleSize(timeEstimate: number): number {
  const safe = Math.max(1, Math.min(10, Math.round(timeEstimate)));
  return 14 + safe * 3.4;
}

export function calculateUrgencyScore(dueDateTime: string | null): number {
  if (!dueDateTime) return 2;
  const dueTs = new Date(dueDateTime).getTime();
  if (Number.isNaN(dueTs)) return 2;
  const hoursLeft = (dueTs - Date.now()) / 36e5;
  if (hoursLeft <= 0) return 10;
  if (hoursLeft <= 6) return 9;
  if (hoursLeft <= 24) return 8;
  if (hoursLeft <= 72) return 6;
  if (hoursLeft <= 24 * 7) return 4;
  return 2;
}

export function calculateTaskWeight(task: TaskListItem): number {
  const urgencyScore = calculateUrgencyScore(task.dueDateTime);
  return (
    task.timeEstimate * 0.35 +
    task.complexity * 0.3 +
    task.difficulty * 0.25 +
    urgencyScore * 0.1
  );
}

function normalized(input: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (input - min) / (max - min)));
}

/** X/Y are percent within the quadrant cell (important ↑, urgent →): Q1 top-right … Q4 bottom-left. */
export function calculateXPosition(task: TaskListItem): number {
  const importance = normalized(task.complexity * 0.55 + task.difficulty * 0.45, 1, 10);
  const urgency = normalized(calculateUrgencyScore(task.dueDateTime), 1, 10);
  const workload = normalized(calculateTaskWeight(task), 1, 10);
  const intra = Math.max(0.12, Math.min(0.88, importance * 0.62 + workload * 0.23 + urgency * 0.15));
  const q = calculateQuadrant(task);
  const rightHalf = q === 1 || q === 3;
  return rightHalf ? 50 + intra * 50 : intra * 50;
}

export function calculateYPosition(task: TaskListItem): number {
  const urgency = normalized(calculateUrgencyScore(task.dueDateTime), 1, 10);
  const complexity = normalized(task.complexity, 1, 10);
  const workload = normalized(calculateTaskWeight(task), 1, 10);
  const intra = Math.max(0.12, Math.min(0.88, urgency * 0.64 + workload * 0.22 + complexity * 0.14));
  const q = calculateQuadrant(task);
  const topHalf = q === 1 || q === 2;
  return topHalf ? intra * 50 : 50 + intra * 50;
}

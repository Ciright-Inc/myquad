import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

type TaskDetailDrawerProps = {
  open: boolean;
  children: ReactNode;
};

export function TaskDetailDrawer({ open, children }: TaskDetailDrawerProps) {
  if (!open) return null;
  return <Card className="mt-4 p-5">{children}</Card>;
}

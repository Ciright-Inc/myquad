import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function TaskCreateModal({ children }: { children: ReactNode }) {
  return <Card className="mq-toolbar mb-4 p-5">{children}</Card>;
}

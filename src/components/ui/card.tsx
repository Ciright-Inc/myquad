import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-black/10 bg-white shadow-[0_16px_40px_-32px_rgba(6,10,50,0.6)]",
        className,
      )}
      {...props}
    />
  );
}

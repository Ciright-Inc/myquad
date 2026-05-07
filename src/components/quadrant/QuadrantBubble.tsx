import { motion } from "framer-motion";
import type { MouseEvent } from "react";

type QuadrantBubbleProps = {
  x: number;
  y: number;
  size: number;
  quadrant: 1 | 2 | 3 | 4;
  label: string;
  onClick: () => void;
  onMouseEnter: (e: MouseEvent<HTMLButtonElement>) => void;
  onMouseMove: (e: MouseEvent<HTMLButtonElement>) => void;
  onMouseLeave: () => void;
};

export function QuadrantBubble(props: QuadrantBubbleProps) {
  const color =
    props.quadrant === 1
      ? "bg-[#fe0f26]"
      : props.quadrant === 2
        ? "bg-[#0c34da]"
        : props.quadrant === 3
          ? "bg-[#2c4f66]"
          : "bg-black/45";

  return (
    <motion.button
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.12 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className={`mq-bubble ${color}`}
      style={{ left: `${props.x}%`, top: `${props.y}%`, width: props.size, height: props.size }}
      onClick={props.onClick}
      onMouseEnter={props.onMouseEnter}
      onMouseMove={props.onMouseMove}
      onMouseLeave={props.onMouseLeave}
    >
      {props.label}
    </motion.button>
  );
}

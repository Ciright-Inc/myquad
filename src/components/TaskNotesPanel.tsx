import type { TaskDetail } from "@/lib/api";

export function TaskNotesPanel({ task }: { task: TaskDetail }) {
  return (
    <div className="mt-3 space-y-2">
      {task.notes.map((n) => (
        <div key={n.id} className="rounded-lg border border-black/10 bg-[#f7f9fb] px-3 py-2">
          <p className="text-xs text-black/55">
            {n.author.name} · {new Date(n.createdAt).toLocaleString()}
          </p>
          <p className="text-sm text-[#060a32]">{n.body}</p>
        </div>
      ))}
    </div>
  );
}

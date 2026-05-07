import type { TaskDetail } from "@/lib/api";
import { resolveApiUrl } from "@/lib/api";
import { ExternalLink, FileText } from "lucide-react";

export function TaskDocumentsPanel({ task }: { task: TaskDetail }) {
  return (
    <div className="mt-2 space-y-2">
      {task.documents.length ? (
        task.documents.map((d) => (
          <a
            key={d.id}
            href={resolveApiUrl(d.url)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-lg border border-black/10 bg-[#f7f9fb] px-3 py-2 text-sm text-[#060a32] transition hover:border-[#0c34da]/25 hover:bg-white"
          >
            <span className="flex items-center gap-2">
              <FileText size={14} className="text-[#2c4f66]" />
              <span className="font-medium">{d.fileName}</span>
            </span>
            <span className="flex items-center gap-2 text-xs text-[#0c34da]">
              Open
              <ExternalLink size={12} />
            </span>
          </a>
        ))
      ) : (
        <p className="text-xs text-black/55">No documents attached.</p>
      )}
    </div>
  );
}

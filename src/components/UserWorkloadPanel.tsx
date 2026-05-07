import type { AdminSummary, OrgUser } from "@/lib/api";

type UserWorkloadPanelProps = {
  summary: AdminSummary;
  users: OrgUser[];
};

export function UserWorkloadPanel({ summary, users }: UserWorkloadPanelProps) {
  return (
    <article className="mq-panel p-4 md:col-span-3">
      <p className="text-xs uppercase tracking-wide text-black/55">User workload</p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {users.map((u) => (
          <div key={u.id} className="rounded-lg border border-black/10 bg-[#f7f9fb] px-3 py-2 text-sm text-[#060a32]">
            <div className="flex items-center justify-between">
              <span>{u.name}</span>
              <span className="text-xs text-black/60">{summary.byLead[u.id] ?? 0} open</span>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

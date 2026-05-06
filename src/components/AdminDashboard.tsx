import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest, type AdminSummary } from "@/lib/api";

export function AdminDashboard() {
  const { token } = useAuth();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (!token) return;
      try {
        const data = await apiRequest<AdminSummary>("/api/admin/summary", { token });
        setSummary(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load admin summary");
      }
    }
    void load();
  }, [token]);

  return (
    <main className="mq-shell">
      <header className="mq-hero border-b border-white/10 text-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4ea7f4]">Admin Panel</p>
            <h1 className="text-2xl font-semibold">Operations overview</h1>
          </div>
          <Link to="/dashboard" className="rounded-lg border border-white/25 px-3 py-2 text-sm hover:bg-white/10">
            Back to dashboard
          </Link>
        </div>
      </header>
      <section className="mx-auto w-full max-w-5xl px-4 py-8">
        {error ? <p className="rounded-lg bg-[#fe0f26]/10 px-3 py-2 text-sm text-[#fe0f26]">{error}</p> : null}
        {summary ? (
          <div className="grid gap-4 md:grid-cols-3">
            <article className="mq-panel p-4">
              <p className="text-xs uppercase tracking-wide text-black/55">Open tasks</p>
              <p className="mt-2 text-2xl font-semibold text-[#060a32]">{summary.openTaskCount}</p>
            </article>
            <article className="mq-panel p-4">
              <p className="text-xs uppercase tracking-wide text-black/55">Unassigned</p>
              <p className="mt-2 text-2xl font-semibold text-[#060a32]">{summary.unassignedCount}</p>
            </article>
            <article className="mq-panel p-4">
              <p className="text-xs uppercase tracking-wide text-black/55">Overloaded users</p>
              <p className="mt-2 text-2xl font-semibold text-[#060a32]">{summary.overloadedUsers.length}</p>
            </article>
            <article className="mq-panel p-4 md:col-span-3">
              <p className="text-xs uppercase tracking-wide text-black/55">Upcoming due (7 days)</p>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {summary.upcomingDue.length ? (
                  summary.upcomingDue.map((task) => (
                    <div key={task.id} className="rounded-lg border border-black/10 bg-[#f7f9fb] px-3 py-2 text-sm text-[#060a32]">
                      {task.name}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-black/60">No due tasks in next 7 days.</p>
                )}
              </div>
            </article>
          </div>
        ) : (
          <div className="mq-panel p-6 text-sm text-black/65">Loading admin summary...</div>
        )}
      </section>
    </main>
  );
}

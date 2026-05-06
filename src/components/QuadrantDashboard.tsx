import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  apiRequest,
  type OrgUser,
  type Subscription,
  type TaskDetail,
  type TaskListItem,
} from "@/lib/api";

export function QuadrantDashboard() {
  const { logout, isOrgAdmin, token, user } = useAuth();
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const [createName, setCreateName] = useState("");
  const [createQuadrant, setCreateQuadrant] = useState<1 | 2 | 3 | 4>(2);
  const [createDue, setCreateDue] = useState("");
  const [search, setSearch] = useState("");
  const [phase, setPhase] = useState("");
  const [subscriptionId, setSubscriptionId] = useState("");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");
  const [leadOnly, setLeadOnly] = useState(false);
  const [associatedWithMe, setAssociatedWithMe] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [docName, setDocName] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [associateUserId, setAssociateUserId] = useState("");

  const phases = useMemo(() => {
    const base = ["Backlog", "Planned", "Active", "Review", "Blocked", "Done"];
    const extras = tasks.map((t) => t.phase).filter((p) => !base.includes(p));
    return [...base, ...Array.from(new Set(extras))];
  }, [tasks]);

  async function loadMeta() {
    if (!token) return;
    const [u, s] = await Promise.all([
      apiRequest<OrgUser[]>("/api/users", { token }),
      apiRequest<Subscription[]>("/api/subscriptions", { token }),
    ]);
    setUsers(u);
    setSubs(s);
  }

  async function loadTasks() {
    if (!token) return;
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (phase) params.set("phase", phase);
    if (subscriptionId) params.set("subscriptionId", subscriptionId);
    if (dueFrom) params.set("dueFrom", new Date(dueFrom).toISOString());
    if (dueTo) params.set("dueTo", new Date(`${dueTo}T23:59:59.999`).toISOString());
    if (leadOnly) params.set("leadOnly", "true");
    if (associatedWithMe) params.set("associatedWithMe", "true");
    const suffix = params.toString() ? `?${params.toString()}` : "";
    const data = await apiRequest<TaskListItem[]>(`/api/tasks${suffix}`, { token });
    setTasks(data);
  }

  async function bootstrap() {
    setLoading(true);
    setError("");
    try {
      await Promise.all([loadMeta(), loadTasks()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  async function openTask(id: string) {
    if (!token) return;
    try {
      const detail = await apiRequest<TaskDetail>(`/api/tasks/${id}`, { token });
      setSelectedTask(detail);
      setAssociateUserId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open task");
    }
  }

  async function createTask() {
    if (!token || !createName.trim()) return;
    try {
      await apiRequest<TaskListItem>("/api/tasks", {
        method: "POST",
        token,
        body: {
          name: createName.trim(),
          priorityQuadrant: createQuadrant,
          phase: "Backlog",
          dueDateTime: createDue ? new Date(createDue).toISOString() : null,
        },
      });
      setCreateName("");
      setCreateDue("");
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create task");
    }
  }

  async function syncMock() {
    if (!token) return;
    try {
      const ids = subscriptionId ? [subscriptionId] : subs.map((s) => s.id);
      await apiRequest("/api/tasks/sync-mock", {
        method: "POST",
        token,
        body: { subscriptionIds: ids },
      });
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sync mock tasks");
    }
  }

  async function saveTaskPatch(patch: Record<string, unknown>) {
    if (!token || !selectedTask) return;
    try {
      await apiRequest<TaskListItem>(`/api/tasks/${selectedTask.id}`, {
        method: "PATCH",
        token,
        body: patch,
      });
      await Promise.all([openTask(selectedTask.id), loadTasks()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update task");
    }
  }

  async function addNote() {
    if (!token || !selectedTask || !noteDraft.trim()) return;
    try {
      await apiRequest(`/api/tasks/${selectedTask.id}/notes`, {
        method: "POST",
        token,
        body: { body: noteDraft.trim() },
      });
      setNoteDraft("");
      await openTask(selectedTask.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add note");
    }
  }

  async function addDocument() {
    if (!token || !selectedTask || !docName.trim() || !docUrl.trim()) return;
    try {
      await apiRequest(`/api/tasks/${selectedTask.id}/documents`, {
        method: "POST",
        token,
        body: { fileName: docName.trim(), url: docUrl.trim() },
      });
      setDocName("");
      setDocUrl("");
      await openTask(selectedTask.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add document");
    }
  }

  async function requestLead() {
    if (!token || !selectedTask) return;
    try {
      await apiRequest(`/api/tasks/${selectedTask.id}/request-lead`, { method: "POST", token, body: {} });
      await Promise.all([openTask(selectedTask.id), loadTasks()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to request lead");
    }
  }

  async function associateUser() {
    if (!token || !selectedTask || !associateUserId) return;
    try {
      await apiRequest(`/api/tasks/${selectedTask.id}/associate-user`, {
        method: "POST",
        token,
        body: { userId: associateUserId },
      });
      setAssociateUserId("");
      await Promise.all([openTask(selectedTask.id), loadTasks()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to associate user");
    }
  }

  useEffect(() => {
    if (!token) return;
    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <main className="mq-shell">
      <header className="mq-hero border-b border-white/10 text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4ea7f4]">MyQuad Dashboard</p>
            <h1 className="text-2xl font-semibold">Priority board</h1>
          </div>
          <div className="flex gap-2">
            {isOrgAdmin ? (
              <Link to="/admin" className="rounded-lg border border-white/25 px-3 py-2 text-sm hover:bg-white/10">
                Admin
              </Link>
            ) : null}
            <button onClick={logout} className="mq-btn-primary px-3 py-2 text-sm">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[#060a32]">Active Work</h2>
          <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-black/60">
            {loading ? "Loading..." : `${tasks.length} task(s)`}
          </span>
        </div>
        <div className="mq-panel mb-4 grid gap-3 p-4 md:grid-cols-7">
          <input className="mq-input md:col-span-2" placeholder="Search tasks" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="mq-input" value={phase} onChange={(e) => setPhase(e.target.value)}>
            <option value="">All phases</option>
            {phases.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select className="mq-input" value={subscriptionId} onChange={(e) => setSubscriptionId(e.target.value)}>
            <option value="">All subscriptions</option>
            {subs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input className="mq-input" type="date" value={dueFrom} onChange={(e) => setDueFrom(e.target.value)} />
          <input className="mq-input" type="date" value={dueTo} onChange={(e) => setDueTo(e.target.value)} />
          <button className="mq-btn-primary" onClick={() => void bootstrap()}>
            Apply
          </button>
          <label className="flex items-center gap-2 text-xs text-black/70">
            <input type="checkbox" checked={leadOnly} onChange={(e) => setLeadOnly(e.target.checked)} />
            Lead is me
          </label>
          <label className="flex items-center gap-2 text-xs text-black/70">
            <input type="checkbox" checked={associatedWithMe} onChange={(e) => setAssociatedWithMe(e.target.checked)} />
            Associated with me
          </label>
          <button className="rounded-lg border border-black/10 px-3 py-2 text-xs font-semibold text-[#060a32]" onClick={() => void syncMock()}>
            Sync mock
          </button>
        </div>

        <div className="mq-panel mb-4 grid gap-3 p-4 md:grid-cols-5">
          <input className="mq-input md:col-span-2" placeholder="New task title" value={createName} onChange={(e) => setCreateName(e.target.value)} />
          <select className="mq-input" value={createQuadrant} onChange={(e) => setCreateQuadrant(Number(e.target.value) as 1 | 2 | 3 | 4)}>
            <option value={1}>Q1</option>
            <option value={2}>Q2</option>
            <option value={3}>Q3</option>
            <option value={4}>Q4</option>
          </select>
          <input className="mq-input" type="datetime-local" value={createDue} onChange={(e) => setCreateDue(e.target.value)} />
          <button className="mq-btn-primary" onClick={() => void createTask()}>
            Create task
          </button>
        </div>

        <div className="mq-panel p-6">
          {loading ? <p className="text-sm text-black/65">Fetching tasks...</p> : null}
          {!loading && error ? <p className="rounded-lg bg-[#fe0f26]/10 px-3 py-2 text-sm text-[#fe0f26]">{error}</p> : null}
          {!loading && !error && tasks.length === 0 ? (
            <p className="text-sm text-black/65">No active tasks found. Create a task to see data here.</p>
          ) : null}
          {!loading && !error && tasks.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-3">
              {tasks.map((task) => (
                <article key={task.id} className="rounded-xl border border-black/10 bg-[#f7f9fb] p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-[#060a32]">{task.name}</h3>
                    <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-[#2c4f66]">
                      Q{task.priorityQuadrant}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-black/60">Phase: {task.phase}</p>
                  <p className="mt-1 text-xs text-black/60">Lead: {task.leadUser?.name ?? "Unassigned"}</p>
                  <p className="mt-1 text-xs text-black/60">
                    Due: {task.dueDateTime ? new Date(task.dueDateTime).toLocaleString() : "Not set"}
                  </p>
                  <button className="mt-3 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-[#060a32]" onClick={() => void openTask(task.id)}>
                    Open details
                  </button>
                </article>
              ))}
            </div>
          ) : null}
        </div>

        {selectedTask ? (
          <div className="mq-panel mt-4 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-[#060a32]">{selectedTask.name}</h3>
                <p className="text-xs text-black/60">Owner: {selectedTask.leadUser?.name ?? "Unassigned"}</p>
              </div>
              <button className="rounded-lg border border-black/10 px-3 py-1 text-xs" onClick={() => setSelectedTask(null)}>
                Close
              </button>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <select className="mq-input" value={selectedTask.phase} onChange={(e) => void saveTaskPatch({ phase: e.target.value })}>
                {phases.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <select
                className="mq-input"
                value={selectedTask.priorityQuadrant}
                onChange={(e) => void saveTaskPatch({ priorityQuadrant: Number(e.target.value) })}
              >
                <option value={1}>Q1</option>
                <option value={2}>Q2</option>
                <option value={3}>Q3</option>
                <option value={4}>Q4</option>
              </select>
              <select className="mq-input" value={selectedTask.leadUserId ?? ""} onChange={(e) => void saveTaskPatch({ leadUserId: e.target.value || null })}>
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <button className="rounded-lg border border-black/10 px-3 py-2 text-xs font-semibold text-[#060a32]" onClick={() => void requestLead()}>
                Request / Take lead
              </button>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
              <select className="mq-input" value={associateUserId} onChange={(e) => setAssociateUserId(e.target.value)}>
                <option value="">Associate user...</option>
                {users
                  .filter((u) => u.id !== selectedTask.leadUserId && !selectedTask.associatedUserIds.includes(u.id))
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>
              <button className="rounded-lg border border-black/10 px-3 py-2 text-xs font-semibold text-[#060a32]" onClick={() => void associateUser()}>
                Add associate
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedTask.associatedUserIds.length ? (
                selectedTask.associatedUserIds.map((id) => {
                  const matched = users.find((u) => u.id === id);
                  return (
                    <span key={id} className="rounded-full border border-black/10 bg-white px-2 py-1 text-[11px] text-black/65">
                      {matched?.name ?? id}
                    </span>
                  );
                })
              ) : (
                <span className="text-xs text-black/55">No associated users.</span>
              )}
            </div>

            <div className="mt-3 grid gap-2">
              <textarea className="mq-input min-h-20" placeholder="Add note" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} />
              <button className="mq-btn-primary w-fit px-4" onClick={() => void addNote()}>
                Add note
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {selectedTask.notes.map((n) => (
                <div key={n.id} className="rounded-lg border border-black/10 bg-[#f7f9fb] px-3 py-2">
                  <p className="text-xs text-black/55">
                    {n.author.name} · {new Date(n.createdAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-[#060a32]">{n.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <input className="mq-input" placeholder="Document label" value={docName} onChange={(e) => setDocName(e.target.value)} />
              <input className="mq-input" placeholder="https://..." value={docUrl} onChange={(e) => setDocUrl(e.target.value)} />
              <button className="mq-btn-primary px-4" onClick={() => void addDocument()}>
                Add doc
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {selectedTask.documents.length ? (
                selectedTask.documents.map((d) => (
                  <a
                    key={d.id}
                    href={d.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-lg border border-black/10 bg-[#f7f9fb] px-3 py-2 text-sm text-[#0c34da]"
                  >
                    {d.fileName}
                  </a>
                ))
              ) : (
                <p className="text-xs text-black/55">No documents attached.</p>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-xs text-black/70">
                <input type="checkbox" checked={selectedTask.isCCRComplete} onChange={(e) => void saveTaskPatch({ isCCRComplete: e.target.checked })} />
                CCR complete
              </label>
              <label className="flex items-center gap-2 text-xs text-black/70">
                <input type="checkbox" checked={selectedTask.isInactive} onChange={(e) => void saveTaskPatch({ isInactive: e.target.checked })} />
                Inactive
              </label>
              <span className="text-xs text-black/50">Current user: {user?.name ?? "N/A"}</span>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}

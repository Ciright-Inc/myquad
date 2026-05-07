import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AtSign,
  CalendarDays,
  FileText,
  Filter,
  Link2,
  MessageSquareText,
  PlusCircle,
  Search,
  ShieldCheck,
  Signature,
  Trash2,
  UserRound,
  Users,
  Workflow,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  apiRequest,
  type OrgUser,
  type Subscription,
  type TaskDetail,
  type TaskListItem,
} from "@/lib/api";
import { QuadrantGrid } from "@/components/quadrant/QuadrantGrid";
import { PhaseFilter } from "@/components/PhaseFilter";
import { SubscriptionFilter } from "@/components/SubscriptionFilter";
import { LeadSelector } from "@/components/LeadSelector";
import { AssociatedUsersSelector } from "@/components/AssociatedUsersSelector";
import { TaskNotesPanel } from "@/components/TaskNotesPanel";
import { TaskDocumentsPanel } from "@/components/TaskDocumentsPanel";
import { TaskCreateModal } from "@/components/TaskCreateModal";
import { TaskDetailDrawer } from "@/components/TaskDetailDrawer";
import { TaskEditForm } from "@/components/TaskEditForm";
import {
  addNoteSchema,
  createTaskSchema,
  editTaskNameSchema,
  inputClass,
  toFieldErrors,
  type FieldErrors,
} from "@/lib/validation";

export function QuadrantDashboard() {
  const { logout, isOrgAdmin, token, user } = useAuth();
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createQuadrant, setCreateQuadrant] = useState<1 | 2 | 3 | 4>(2);
  const [createTimeEstimate, setCreateTimeEstimate] = useState(5);
  const [createComplexity, setCreateComplexity] = useState(5);
  const [createDifficulty, setCreateDifficulty] = useState(5);
  const [createPhase, setCreatePhase] = useState("Backlog");
  const [createLeadUserId, setCreateLeadUserId] = useState("");
  const [createDue, setCreateDue] = useState("");
  const [createErrors, setCreateErrors] = useState<FieldErrors<"name" | "priorityQuadrant" | "dueDateTime">>({});
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
  const [noteError, setNoteError] = useState<string>("");
  const [docName, setDocName] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docErrors, setDocErrors] = useState<FieldErrors<"fileName" | "url">>({});
  const [associateUserId, setAssociateUserId] = useState("");
  const [associationType, setAssociationType] = useState("related");
  const [associationTaskId, setAssociationTaskId] = useState("");
  const [associationExternalId, setAssociationExternalId] = useState("");
  const [taskNameDraft, setTaskNameDraft] = useState("");
  const [taskNameError, setTaskNameError] = useState("");
  const [savingTaskName, setSavingTaskName] = useState(false);
  const [hoverTask, setHoverTask] = useState<TaskListItem | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const avatarInitial = user?.name?.trim()?.charAt(0)?.toUpperCase() ?? "U";

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
      setTaskNameDraft(detail.name ?? "");
      setTaskNameError("");
      setAssociateUserId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open task");
    }
  }

  async function saveTaskName() {
    if (!selectedTask || !token) return;
    const parsed = editTaskNameSchema.safeParse({ name: taskNameDraft });
    if (!parsed.success) {
      setTaskNameError(parsed.error.issues[0]?.message ?? "Invalid task title");
      return;
    }
    setTaskNameError("");
    setSavingTaskName(true);
    try {
      await apiRequest<TaskListItem>(`/api/tasks/${selectedTask.id}`, {
        method: "PATCH",
        token,
        body: { name: parsed.data.name },
      });
      await Promise.all([openTask(selectedTask.id), loadTasks()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update task title");
    } finally {
      setSavingTaskName(false);
    }
  }

  async function createTask() {
    if (!token) return;
    const parsed = createTaskSchema.safeParse({
      name: createName,
      description: createDescription,
      priorityQuadrant: createQuadrant,
      timeEstimate: createTimeEstimate,
      complexity: createComplexity,
      difficulty: createDifficulty,
      phase: createPhase,
      leadUserId: createLeadUserId || null,
      dueDateTime: createDue || undefined,
    });
    if (!parsed.success) {
      setCreateErrors(toFieldErrors(parsed.error.issues));
      return;
    }
    setCreateErrors({});
    try {
      await apiRequest<TaskListItem>("/api/tasks", {
        method: "POST",
        token,
        body: {
          name: parsed.data.name,
          description: parsed.data.description,
          priorityQuadrant: parsed.data.priorityQuadrant,
          timeEstimate: parsed.data.timeEstimate,
          complexity: parsed.data.complexity,
          difficulty: parsed.data.difficulty,
          phase: parsed.data.phase,
          leadUserId: parsed.data.leadUserId ?? undefined,
          dueDateTime: parsed.data.dueDateTime ? new Date(parsed.data.dueDateTime).toISOString() : null,
        },
      });
      setCreateName("");
      setCreateDescription("");
      setCreateDue("");
      setCreateTimeEstimate(5);
      setCreateComplexity(5);
      setCreateDifficulty(5);
      setCreatePhase("Backlog");
      setCreateLeadUserId("");
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
    if (!token || !selectedTask) return;
    const parsed = addNoteSchema.safeParse({ body: noteDraft });
    if (!parsed.success) {
      setNoteError(parsed.error.issues[0]?.message ?? "Invalid note");
      return;
    }
    setNoteError("");
    try {
      await apiRequest(`/api/tasks/${selectedTask.id}/notes`, {
        method: "POST",
        token,
        body: { body: parsed.data.body },
      });
      setNoteDraft("");
      await openTask(selectedTask.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add note");
    }
  }

  async function addDocument() {
    if (!token || !selectedTask) return;
    if (!docName.trim()) {
      setDocErrors({ fileName: "Document label is required" });
      return;
    }
    if (!docUrl.trim() && !docFile) {
      setDocErrors({ url: "Provide URL or choose file upload" });
      return;
    }
    setDocErrors({});
    try {
      const contentBase64 = docFile ? await toBase64(docFile) : undefined;
      await apiRequest(`/api/tasks/${selectedTask.id}/documents`, {
        method: "POST",
        token,
        body: {
          fileName: docName.trim(),
          url: docUrl.trim() || undefined,
          contentBase64,
          mimeType: docFile?.type || undefined,
        },
      });
      setDocName("");
      setDocUrl("");
      setDocFile(null);
      await openTask(selectedTask.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add document");
    }
  }

  async function addAssociation() {
    if (!token || !selectedTask) return;
    if (!associationTaskId && !associationExternalId.trim()) {
      setError("Select related task or enter external system id");
      return;
    }
    try {
      await apiRequest(`/api/tasks/${selectedTask.id}/associations`, {
        method: "POST",
        token,
        body: {
          associationType,
          relatedTaskId: associationTaskId || undefined,
          externalSystemId: associationExternalId.trim() || undefined,
        },
      });
      setAssociationTaskId("");
      setAssociationExternalId("");
      await openTask(selectedTask.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add association");
    }
  }

  async function deleteAssociation(associationId: string) {
    if (!token || !selectedTask) return;
    try {
      await apiRequest(`/api/tasks/${selectedTask.id}/associations/${associationId}`, {
        method: "DELETE",
        token,
      });
      await openTask(selectedTask.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove association");
    }
  }

  function toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  async function requestLead(requestOnly = false) {
    if (!token || !selectedTask) return;
    try {
      await apiRequest(`/api/tasks/${selectedTask.id}/request-lead`, {
        method: "POST",
        token,
        body: requestOnly ? { requestOnly: true } : {},
      });
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

  async function deleteTask(id: string) {
    if (!token) return;
    const ok = window.confirm("Are you sure you want to delete this task?");
    if (!ok) return;
    try {
      await apiRequest(`/api/tasks/${id}`, { method: "DELETE", token });
      if (selectedTask?.id === id) setSelectedTask(null);
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete task");
    }
  }

  useEffect(() => {
    if (!token) return;
    const timer = window.setTimeout(() => {
      void bootstrap();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <main className="mq-shell">
      <header className="mq-hero border-b border-white/10 text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/95 text-sm font-extrabold tracking-wide text-[#0c34da] shadow-[0_8px_18px_-12px_rgba(255,255,255,0.9)]">
              MQ
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#77beff]">MyQuad Dashboard</p>
              <h1 className="text-[1.7rem] font-semibold leading-none tracking-tight text-white">Priority board</h1>
            </div>
          </div>
          <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
            <div className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-2.5 py-1.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-xs font-bold text-[#060a32]">
                {avatarInitial}
              </span>
              <p className="pr-1 text-sm font-semibold text-white">
                {/* <span className="mr-1 text-[10px] uppercase tracking-[0.08em] text-white/70">Signed in as</span> */}
                <span className="max-w-[140px] truncate align-middle text-sm font-semibold text-white">{user?.name ?? "User"}</span>
              </p>
            </div>
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
          <h2 className="text-xl font-semibold tracking-tight text-[#060a32]">Active Work</h2>
          <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-black/60">
            {loading ? "Loading..." : `${tasks.length} task(s)`}
          </span>
        </div>
        <div className="mq-panel mq-toolbar mq-filter-shell mb-4 p-5">
          <div className="mq-filter-top">
            <div className="mq-toolbar-title mb-0">
              <Filter size={14} />
              Filters
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="mq-filter-chip">
                <input
                  className="mq-checkbox"
                  type="checkbox"
                  checked={leadOnly}
                  onChange={(e) => setLeadOnly(e.target.checked)}
                />
                <span className="whitespace-nowrap">Lead is me</span>
              </label>
              <label className="mq-filter-chip">
                <input
                  className="mq-checkbox"
                  type="checkbox"
                  checked={associatedWithMe}
                  onChange={(e) => setAssociatedWithMe(e.target.checked)}
                />
                <span className="whitespace-nowrap">Associated with me</span>
              </label>
              <button className="mq-btn-secondary min-h-[2.4rem] px-4" onClick={() => void syncMock()}>
                Sync mock
              </button>
            </div>
          </div>

          <div className="mq-filter-grid mt-4">
            <div className="mq-input-wrap mq-filter-search">
              <Search size={15} className="mq-input-icon" />
              <input
                className="mq-input mq-input-with-icon"
                placeholder="Search tasks"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <PhaseFilter phases={phases} value={phase} onChange={setPhase} />
            <SubscriptionFilter subs={subs} value={subscriptionId} onChange={setSubscriptionId} />
            <input className="mq-input" type="date" value={dueFrom} onChange={(e) => setDueFrom(e.target.value)} />
            <input className="mq-input" type="date" value={dueTo} onChange={(e) => setDueTo(e.target.value)} />
            <button className="mq-btn-primary mq-filter-apply" onClick={() => void bootstrap()}>
              Apply filters
            </button>
          </div>
        </div>

        <TaskCreateModal>
          <div className="mq-toolbar-title">
            <PlusCircle size={14} />
            Create new task
          </div>
          <div className="grid gap-3 md:grid-cols-6">
            <div className="md:col-span-2">
              <div className="mq-input-wrap">
                <Signature size={15} className="mq-input-icon" />
                <input
                  className={inputClass("mq-input mq-input-with-icon", !!createErrors.name)}
                  placeholder="New task title"
                  value={createName}
                  onChange={(e) => {
                    setCreateName(e.target.value);
                    if (createErrors.name) setCreateErrors((p) => ({ ...p, name: undefined }));
                  }}
                  aria-invalid={!!createErrors.name}
                />
              </div>
              {createErrors.name ? <p className="mt-1 text-xs text-[#fe0f26]">{createErrors.name}</p> : null}
            </div>
            <div className="mq-input-wrap md:col-span-2">
              <MessageSquareText size={15} className="mq-input-icon" />
              <input
                className="mq-input mq-input-with-icon"
                placeholder="Short description"
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
              />
            </div>
            <select className="mq-input" value={createQuadrant} onChange={(e) => setCreateQuadrant(Number(e.target.value) as 1 | 2 | 3 | 4)}>
              <option value={1}>Q1</option>
              <option value={2}>Q2</option>
              <option value={3}>Q3</option>
              <option value={4}>Q4</option>
            </select>
            <select className="mq-input" value={createPhase} onChange={(e) => setCreatePhase(e.target.value)}>
              {phases.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select className="mq-input" value={createTimeEstimate} onChange={(e) => setCreateTimeEstimate(Number(e.target.value))}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  Time {n}
                </option>
              ))}
            </select>
            <select className="mq-input" value={createComplexity} onChange={(e) => setCreateComplexity(Number(e.target.value))}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  Complexity {n}
                </option>
              ))}
            </select>
            <select className="mq-input" value={createDifficulty} onChange={(e) => setCreateDifficulty(Number(e.target.value))}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  Difficulty {n}
                </option>
              ))}
            </select>
            <select className="mq-input" value={createLeadUserId} onChange={(e) => setCreateLeadUserId(e.target.value)}>
              <option value="">Auto assign me</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  Lead: {u.name}
                </option>
              ))}
            </select>
            <div>
              <div className="mq-input-wrap">
                <CalendarDays size={15} className="mq-input-icon" />
                <input
                  className={inputClass("mq-input mq-input-with-icon", !!createErrors.dueDateTime)}
                  type="datetime-local"
                  value={createDue}
                  onChange={(e) => {
                    setCreateDue(e.target.value);
                    if (createErrors.dueDateTime) setCreateErrors((p) => ({ ...p, dueDateTime: undefined }));
                  }}
                  aria-invalid={!!createErrors.dueDateTime}
                />
              </div>
              {createErrors.dueDateTime ? <p className="mt-1 text-xs text-[#fe0f26]">{createErrors.dueDateTime}</p> : null}
            </div>
            <button className="mq-btn-primary" onClick={() => void createTask()}>
              Create task
            </button>
          </div>
        </TaskCreateModal>

        <div className="mq-panel p-6">
          {loading ? <p className="text-sm text-black/65">Fetching tasks...</p> : null}
          {!loading && error ? <p className="rounded-lg bg-[#fe0f26]/10 px-3 py-2 text-sm text-[#fe0f26]">{error}</p> : null}
          {!loading && !error && tasks.length === 0 ? (
            <p className="text-sm text-black/65">No active tasks found. Create a task to see data here.</p>
          ) : null}
          {!loading && !error && tasks.length > 0 ? (
            <div className="space-y-4">
              <QuadrantGrid
                tasks={tasks}
                users={users}
                hoverTask={hoverTask}
                hoverPos={hoverPos}
                setHoverTask={setHoverTask}
                setHoverPos={setHoverPos}
                onOpenTask={(id) => void openTask(id)}
              />
              <div className="grid gap-3 lg:grid-cols-3">
                {tasks.map((task) => (
                  <article key={task.id} className="mq-task-card">
                    <div className="flex items-start justify-between gap-2 border-b border-black/10 pb-3">
                      <h3 className="line-clamp-2 text-[0.95rem] font-semibold tracking-tight text-[#060a32]">{task.name}</h3>
                      <span className="mq-subtle-badge">
                        Q{task.priorityQuadrant}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1.5">
                      <p className="mq-meta-row">
                        <Workflow size={14} className="text-[#355a73]" />
                        <span>Phase: {task.phase}</span>
                      </p>
                      <p className="mq-meta-row">
                        <UserRound size={14} className="text-[#355a73]" />
                        <span>Lead: {task.leadUser?.name ?? "Unassigned"}</span>
                      </p>
                      <p className="mq-meta-row">
                        <CalendarDays size={14} className="text-[#355a73]" />
                        <span>
                          Due: {task.dueDateTime ? new Date(task.dueDateTime).toLocaleString() : "Not set"}
                        </span>
                      </p>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button className="mq-btn-secondary min-h-[2.3rem] px-3 py-1.5" onClick={() => void openTask(task.id)}>
                        Open details
                      </button>
                      <button className="mq-btn-danger min-h-[2.3rem] px-3 py-1.5" onClick={() => void deleteTask(task.id)}>
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <TaskDetailDrawer open={!!selectedTask}>
          {selectedTask ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-[#060a32]">Task details</h3>
                  <p className="text-xs text-black/60">Owner: {selectedTask.leadUser?.name ?? "Unassigned"}</p>
                </div>
                <button className="mq-btn-secondary min-h-[2.2rem] px-3 py-1 text-xs" onClick={() => setSelectedTask(null)}>
                  Close
                </button>
              </div>
              <div className="mq-detail-section mt-3">
                <p className="mq-detail-title">
                  <Signature size={14} />
                  Task title
                </p>
                <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
                  <div className="space-y-1">
                    <div className="mq-input-wrap">
                      <Signature size={15} className="mq-input-icon" />
                      <input
                        className={inputClass("mq-input mq-input-with-icon", !!taskNameError)}
                        value={taskNameDraft}
                        onChange={(e) => {
                          setTaskNameDraft(e.target.value);
                          if (taskNameError) setTaskNameError("");
                        }}
                        placeholder="Task title"
                        aria-invalid={!!taskNameError}
                      />
                    </div>
                    {taskNameError ? <p className="text-xs text-[#fe0f26]">{taskNameError}</p> : null}
                  </div>
                  <button
                    className="mq-btn-primary px-4"
                    onClick={() => void saveTaskName()}
                    disabled={savingTaskName}
                  >
                    {savingTaskName ? "Saving..." : "Save title"}
                  </button>
                </div>
              </div>
              <TaskEditForm>
                <div className="mq-detail-section mt-4">
                  <p className="mq-detail-title">
                    <Workflow size={14} />
                    Task settings
                  </p>
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
                    <LeadSelector users={users} value={selectedTask.leadUserId ?? ""} onChange={(v) => void saveTaskPatch({ leadUserId: v || null })} />
                    <button className="mq-btn-secondary" onClick={() => void requestLead(true)}>
                      Request lead
                    </button>
                    <button className="mq-btn-secondary" onClick={() => void requestLead(false)}>
                      Take lead
                    </button>
                    <select className="mq-input" value={selectedTask.timeEstimate} onChange={(e) => void saveTaskPatch({ timeEstimate: Number(e.target.value) })}>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          Time {n}
                        </option>
                      ))}
                    </select>
                    <select className="mq-input" value={selectedTask.complexity} onChange={(e) => void saveTaskPatch({ complexity: Number(e.target.value) })}>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          Complexity {n}
                        </option>
                      ))}
                    </select>
                    <select className="mq-input" value={selectedTask.difficulty} onChange={(e) => void saveTaskPatch({ difficulty: Number(e.target.value) })}>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          Difficulty {n}
                        </option>
                      ))}
                    </select>
                    <input
                      className="mq-input"
                      type="datetime-local"
                      value={selectedTask.dueDateTime ? new Date(new Date(selectedTask.dueDateTime).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
                      onChange={(e) => void saveTaskPatch({ dueDateTime: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    />
                  </div>
                </div>

                <div className="mq-detail-section mt-3">
                  <p className="mq-detail-title">
                    <Users size={14} />
                    Associates
                  </p>
                  <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
                    <div className="mq-input-wrap">
                      <AtSign size={15} className="mq-input-icon" />
                      <AssociatedUsersSelector
                        users={users}
                        leadUserId={selectedTask.leadUserId}
                        associatedUserIds={selectedTask.associatedUserIds}
                        value={associateUserId}
                        onChange={setAssociateUserId}
                      />
                    </div>
                    <button className="mq-btn-secondary" onClick={() => void associateUser()}>
                      Add associate
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedTask.associatedUserIds.length ? (
                    selectedTask.associatedUserIds.map((id) => {
                      const matched = users.find((u) => u.id === id);
                      return (
                        <span key={id} className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] text-black/65">
                          {matched?.name ?? id}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-xs text-black/55">No associated users.</span>
                  )}
                </div>

                <div className="mq-detail-section mt-3">
                  <p className="mq-detail-title">
                    <MessageSquareText size={14} />
                    Notes
                  </p>
                  <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
                    <div className="space-y-1">
                      <div className="mq-input-wrap">
                        <MessageSquareText size={15} className="mq-input-icon" />
                        <input
                          className={inputClass("mq-input mq-input-with-icon h-12", !!noteError)}
                          placeholder="Add note"
                          value={noteDraft}
                          onChange={(e) => {
                            setNoteDraft(e.target.value);
                            if (noteError) setNoteError("");
                          }}
                          aria-invalid={!!noteError}
                        />
                      </div>
                      {noteError ? <p className="text-xs text-[#fe0f26]">{noteError}</p> : null}
                    </div>
                    <button className="mq-btn-primary h-12 px-5" onClick={() => void addNote()}>
                      Add note
                    </button>
                  </div>
                </div>
                <TaskNotesPanel task={selectedTask} />

                <div className="mq-detail-section mt-4">
                  <p className="mq-detail-title">
                    <FileText size={14} />
                    Documents
                  </p>
                  <div className="mt-3 rounded-xl border border-black/10 bg-white/80 p-3">
                    <div className="grid gap-2 md:grid-cols-3">
                      <div className="space-y-1">
                        <div className="mq-input-wrap">
                          <FileText size={15} className="mq-input-icon" />
                          <input
                            className={inputClass("mq-input mq-input-with-icon", !!docErrors.fileName)}
                            placeholder="Document label"
                            value={docName}
                            onChange={(e) => {
                              setDocName(e.target.value);
                              if (docErrors.fileName) setDocErrors((p) => ({ ...p, fileName: undefined }));
                            }}
                            aria-invalid={!!docErrors.fileName}
                          />
                        </div>
                        {docErrors.fileName ? <p className="text-xs text-[#fe0f26]">{docErrors.fileName}</p> : null}
                      </div>
                      <div className="space-y-1">
                        <div className="mq-input-wrap">
                          <Link2 size={15} className="mq-input-icon" />
                          <input
                            className={inputClass("mq-input mq-input-with-icon", !!docErrors.url)}
                            placeholder="https://... (or upload file)"
                            value={docUrl}
                            onChange={(e) => {
                              setDocUrl(e.target.value);
                              if (docErrors.url) setDocErrors((p) => ({ ...p, url: undefined }));
                            }}
                            aria-invalid={!!docErrors.url}
                          />
                        </div>
                        {docErrors.url ? <p className="text-xs text-[#fe0f26]">{docErrors.url}</p> : null}
                      </div>
                      <label className="flex h-[2.65rem] cursor-pointer items-center justify-between rounded-xl border border-black/12 bg-[#f7f9fb] px-3 text-sm text-[#2c4f66] transition hover:bg-[#eef4ff]">
                        <span className="truncate pr-2">{docFile ? docFile.name : "Choose file (optional)"}</span>
                        <span className="rounded-md border border-black/10 bg-white px-2 py-0.5 text-xs font-semibold">Browse</span>
                        <input
                          className="hidden"
                          type="file"
                          onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                        />
                      </label>
                    </div>
                    <div className="mt-3 flex items-center justify-between rounded-lg border border-[#0c34da]/12 bg-[#f5f8ff] px-3 py-2">
                      <p className="text-xs text-[#355a73]">Attach by URL or upload file directly</p>
                      <button className="mq-btn-primary min-h-[2.2rem] px-5" onClick={() => void addDocument()}>
                        Add document
                      </button>
                    </div>
                  </div>
                </div>
                <TaskDocumentsPanel task={selectedTask} />

                <div className="mq-detail-section mt-4">
                  <p className="mq-detail-title">
                    <Link2 size={14} />
                    Task associations
                  </p>
                  <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
                    <select className="mq-input" value={associationType} onChange={(e) => setAssociationType(e.target.value)}>
                      <option value="related">Related</option>
                      <option value="depends_on">Depends On</option>
                      <option value="blocks">Blocks</option>
                      <option value="duplicate">Duplicate</option>
                    </select>
                    <select className="mq-input" value={associationTaskId} onChange={(e) => setAssociationTaskId(e.target.value)}>
                      <option value="">Related task (optional)</option>
                      {tasks
                        .filter((t) => t.id !== selectedTask.id)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                    </select>
                    <input
                      className="mq-input"
                      placeholder="External system ID"
                      value={associationExternalId}
                      onChange={(e) => setAssociationExternalId(e.target.value)}
                    />
                    <button className="mq-btn-secondary" onClick={() => void addAssociation()}>
                      Add
                    </button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {selectedTask.associations.length ? (
                      selectedTask.associations.map((a) => (
                        <div key={a.id} className="flex items-center justify-between rounded-lg border border-black/10 bg-[#f7f9fb] px-3 py-2">
                          <div className="text-xs text-[#060a32]">
                            <p className="font-semibold">{a.associationType}</p>
                            <p>Task: {a.relatedTaskId ?? "—"} | External: {a.externalSystemId ?? "—"}</p>
                          </div>
                          <button className="mq-btn-danger min-h-[2rem] px-2 py-1 text-xs" onClick={() => void deleteAssociation(a.id)}>
                            Remove
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-black/55">No task associations.</p>
                    )}
                  </div>
                </div>

                <div className="mq-detail-section mt-4 flex flex-wrap items-center gap-3">
                  <p className="mq-detail-title w-full">
                    <ShieldCheck size={14} />
                    Status flags
                  </p>
                  <label className="flex min-h-[2.4rem] items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-xs text-black/70">
                    <input className="mq-checkbox" type="checkbox" checked={selectedTask.isCCRComplete} onChange={(e) => void saveTaskPatch({ isCCRComplete: e.target.checked })} />
                    CCR complete
                  </label>
                  <label className="flex min-h-[2.4rem] items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-xs text-black/70">
                    <input className="mq-checkbox" type="checkbox" checked={selectedTask.isInactive} onChange={(e) => void saveTaskPatch({ isInactive: e.target.checked })} />
                    Inactive
                  </label>
                  <span className="text-xs text-black/50">Current user: {user?.name ?? "N/A"}</span>
                </div>
              </TaskEditForm>
            </>
          ) : null}
        </TaskDetailDrawer>
      </section>
    </main>
  );
}

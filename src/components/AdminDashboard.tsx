import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest, type AdminSummary, type AdminUser, type Subscription, type Team } from "@/lib/api";
import { UserWorkloadPanel } from "@/components/UserWorkloadPanel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function AdminDashboard() {
  const { token } = useAuth();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [newSubName, setNewSubName] = useState("");
  const [newSubSource, setNewSubSource] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamMembers, setNewTeamMembers] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (!token) return;
      try {
        const [data, adminUsers, subscriptions, teamList] = await Promise.all([
          apiRequest<AdminSummary>("/api/admin/summary", { token }),
          apiRequest<AdminUser[]>("/api/admin/users", { token }),
          apiRequest<Subscription[]>("/api/subscriptions", { token }),
          apiRequest<Team[]>("/api/admin/teams", { token }),
        ]);
        setSummary(data);
        setUsers(adminUsers);
        setSubs(subscriptions);
        setTeams(teamList);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load admin summary");
      }
    }
    void load();
  }, [token]);

  async function updateRole(userId: string, role: "ADMIN" | "MEMBER") {
    if (!token) return;
    await apiRequest(`/api/admin/users/${userId}/role`, { method: "PATCH", token, body: { role } });
    const refreshed = await apiRequest<AdminUser[]>("/api/admin/users", { token });
    setUsers(refreshed);
  }

  async function createSubscription() {
    if (!token || !newSubName.trim()) return;
    await apiRequest("/api/admin/subscriptions", {
      method: "POST",
      token,
      body: { name: newSubName.trim(), sourceSystem: newSubSource.trim() || "manual" },
    });
    setNewSubName("");
    setNewSubSource("");
    const refreshed = await apiRequest<Subscription[]>("/api/subscriptions", { token });
    setSubs(refreshed);
  }

  async function deleteSubscription(id: string) {
    if (!token) return;
    await apiRequest(`/api/admin/subscriptions/${id}`, { method: "DELETE", token });
    const refreshed = await apiRequest<Subscription[]>("/api/subscriptions", { token });
    setSubs(refreshed);
  }

  async function createTeam() {
    if (!token || !newTeamName.trim()) return;
    await apiRequest<Team>("/api/admin/teams", {
      method: "POST",
      token,
      body: { name: newTeamName.trim(), memberUserIds: newTeamMembers },
    });
    setNewTeamName("");
    setNewTeamMembers([]);
    const refreshed = await apiRequest<Team[]>("/api/admin/teams", { token });
    setTeams(refreshed);
  }

  async function deleteTeam(teamId: string) {
    if (!token) return;
    await apiRequest(`/api/admin/teams/${teamId}`, { method: "DELETE", token });
    const refreshed = await apiRequest<Team[]>("/api/admin/teams", { token });
    setTeams(refreshed);
  }

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
            <Card className="p-4">
              <p className="text-xs uppercase tracking-wide text-black/55">Open tasks</p>
              <p className="mt-2 text-2xl font-semibold text-[#060a32]">{summary.openTaskCount}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs uppercase tracking-wide text-black/55">Unassigned</p>
              <p className="mt-2 text-2xl font-semibold text-[#060a32]">{summary.unassignedCount}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs uppercase tracking-wide text-black/55">Overloaded users</p>
              <p className="mt-2 text-2xl font-semibold text-[#060a32]">{summary.overloadedUsers.length}</p>
            </Card>
            <UserWorkloadPanel summary={summary} users={summary.roster} />
            <Card className="p-4 md:col-span-3">
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
            </Card>
            <Card className="p-4 md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-black/55">Manage users</p>
              <div className="mt-3 space-y-2">
                {users.map((u) => (
                  <div key={u.userId} className="flex items-center justify-between rounded-lg border border-black/10 bg-[#f7f9fb] px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-[#060a32]">{u.name}</p>
                      <p className="text-xs text-black/60">{u.email}</p>
                    </div>
                    <select
                      className="mq-input h-9 min-h-0 w-[130px] py-1 text-xs"
                      value={u.role}
                      onChange={(e) => void updateRole(u.userId, e.target.value as "ADMIN" | "MEMBER")}
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="MEMBER">MEMBER</option>
                    </select>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-4 md:col-span-1">
              <p className="text-xs uppercase tracking-wide text-black/55">Manage subscriptions</p>
              <div className="mt-3 space-y-2">
                <input className="mq-input" value={newSubName} onChange={(e) => setNewSubName(e.target.value)} placeholder="Subscription name" />
                <input className="mq-input" value={newSubSource} onChange={(e) => setNewSubSource(e.target.value)} placeholder="Source system" />
                <Button className="w-full" onClick={() => void createSubscription()}>Create</Button>
                <div className="space-y-1">
                  {subs.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg border border-black/10 bg-[#f7f9fb] px-2.5 py-1.5">
                      <span className="text-xs text-[#060a32]">{s.name}</span>
                      <Button variant="destructive" size="sm" onClick={() => void deleteSubscription(s.id)}>Delete</Button>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
            <Card className="p-4 md:col-span-3">
              <p className="text-xs uppercase tracking-wide text-black/55">Manage teams</p>
              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <input className="mq-input" placeholder="Team name" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} />
                <select
                  className="mq-input"
                  value=""
                  onChange={(e) => {
                    const id = e.target.value;
                    if (!id) return;
                    if (!newTeamMembers.includes(id)) setNewTeamMembers((prev) => [...prev, id]);
                  }}
                >
                  <option value="">Add member</option>
                  {users
                    .filter((u) => !newTeamMembers.includes(u.userId))
                    .map((u) => (
                      <option key={u.userId} value={u.userId}>
                        {u.name}
                      </option>
                    ))}
                </select>
                <Button onClick={() => void createTeam()}>Create team</Button>
              </div>
              {newTeamMembers.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {newTeamMembers.map((id) => {
                    const m = users.find((u) => u.userId === id);
                    return (
                      <button
                        key={id}
                        className="rounded-full border border-black/15 bg-[#f7f9fb] px-2 py-1 text-xs"
                        onClick={() => setNewTeamMembers((prev) => prev.filter((v) => v !== id))}
                      >
                        {m?.name ?? id} ×
                      </button>
                    );
                  })}
                </div>
              ) : null}
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {teams.map((team) => (
                  <div key={team.id} className="rounded-lg border border-black/10 bg-[#f7f9fb] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#060a32]">{team.name}</p>
                        <p className="text-xs text-black/60">
                          Members:{" "}
                          {team.memberUserIds
                            .map((id) => users.find((u) => u.userId === id)?.name ?? id)
                            .join(", ") || "None"}
                        </p>
                      </div>
                      <Button variant="destructive" size="sm" onClick={() => void deleteTeam(team.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : (
          <div className="mq-panel p-6 text-sm text-black/65">Loading admin summary...</div>
        )}
      </section>
    </main>
  );
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  accountType: "INDIVIDUAL" | "ENTERPRISE";
  organizationId: string | null;
  isOrgAdmin: boolean;
  phone?: string | null;
};

export type TaskListItem = {
  id: string;
  name: string;
  description: string | null;
  priorityQuadrant: 1 | 2 | 3 | 4;
  phase: string;
  dueDateTime: string | null;
  timeEstimate: number;
  complexity: number;
  difficulty: number;
  leadUserId: string | null;
  associatedUserIds: string[];
  isCCRComplete: boolean;
  isInactive: boolean;
  leadUser?: { id: string; name: string; email: string } | null;
};

export type TaskDetail = TaskListItem & {
  notes: Array<{ id: string; body: string; createdAt: string; author: { id: string; name: string } }>;
  documents: Array<{ id: string; fileName: string; url: string; createdAt: string }>;
  associations: Array<{
    id: string;
    relatedTaskId: string | null;
    externalSystemId: string | null;
    associationType: string;
  }>;
};

export type OrgUser = { id: string; name: string; email: string };
export type Subscription = { id: string; name: string; sourceSystem?: string | null };

export type AdminSummary = {
  openTaskCount: number;
  unassignedCount: number;
  byLead: Record<string, number>;
  overloadedUsers: Array<{ userId: string; openTasks: number }>;
  stuckQuadrant34: TaskListItem[];
  upcomingDue: TaskListItem[];
  roster: OrgUser[];
};
export type AdminUser = {
  userId: string;
  name: string;
  email: string;
  role: "ADMIN" | "MEMBER";
};
export type Team = {
  id: string;
  organizationId: string;
  name: string;
  memberUserIds: string[];
  createdAt: string;
  updatedAt: string;
};

type ApiOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
};

export function resolveApiUrl(path: string): string {
  if (!path.startsWith("/")) return path;

  const configuredBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (configuredBase) return `${configuredBase.replace(/\/$/, "")}${path}`;

  // In local dev, call backend directly so API works even if Vite proxy is stale/misconfigured.
  if (import.meta.env.DEV) return `http://localhost:3001${path}`;

  return path;
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const res = await fetch(resolveApiUrl(path), {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (res.status === 204) {
    return null as T;
  }

  const contentType = res.headers.get("content-type") ?? "";
  const data: unknown = contentType.includes("application/json")
    ? await res.json()
    : { error: (await res.text()).slice(0, 160) || "Non-JSON response from server" };

  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? "API request failed");
  }
  return data as T;
}

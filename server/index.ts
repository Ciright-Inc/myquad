import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import 'dotenv/config';
import { AccountType, MembershipRole } from '@prisma/client';
import { signToken } from './authTokens.js';
import { prisma } from './db.js';
import type { AuthedRequest } from './middleware/requireAuth.js';
import { requireAuth } from './middleware/requireAuth.js';
import { MockWorkItemProvider } from './providers/mock-work-item-provider.js';

const mockProvider = new MockWorkItemProvider();
const PORT = Number(process.env.PORT ?? 3001);

async function checkOrgAdmin(userId: string, organizationId: string | null): Promise<boolean> {
  if (!organizationId) return false;
  const m = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });
  return m?.role === MembershipRole.ADMIN;
}

function visibleWhere() {
  return {
    isCCRComplete: false,
    isInactive: false,
  };
}

const app = express();
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));

/** Helps confirm this process is the MyQuad API (not another app on the same port). */
app.get('/', (_req, res) => {
  res.json({
    service: 'myquad-api',
    health: '/api/health',
    hint: 'Angular UI runs on http://localhost:4200 (npm run dev:ng); API is JSON-only on this port.',
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, provider: mockProvider.providerName });
});

app.post('/api/auth/register-individual', async (req, res) => {
  const { email, password, name, phone } = req.body as {
    email?: string;
    password?: string;
    name?: string;
    phone?: string;
  };
  if (!email || !password || !name) {
    res.status(400).json({ error: 'email, password, and name are required' });
    return;
  }
  const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (exists) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      name,
      phone: phone ?? null,
      accountType: AccountType.INDIVIDUAL,
    },
  });
  const token = signToken({ sub: user.id, email: user.email });
  res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      accountType: user.accountType,
      organizationId: user.organizationId,
      isOrgAdmin: false,
      phone: user.phone,
    },
  });
});

app.post('/api/auth/register-enterprise', async (req, res) => {
  const { organizationName, email, password, name, phone } = req.body as {
    organizationName?: string;
    email?: string;
    password?: string;
    name?: string;
    phone?: string;
  };
  if (!organizationName || !email || !password || !name) {
    res.status(400).json({ error: 'organizationName, email, password, and name are required' });
    return;
  }
  const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (exists) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({ data: { name: organizationName } });
    const user = await tx.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name,
        phone: phone ?? null,
        accountType: AccountType.ENTERPRISE,
        organizationId: org.id,
      },
    });
    await tx.membership.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: MembershipRole.ADMIN,
      },
    });
    await tx.subscription.createMany({
      data: [
        { name: 'Ciright Core', sourceSystem: 'ciright-core', organizationId: org.id },
        { name: 'CRM', sourceSystem: 'crm', organizationId: org.id },
        { name: 'Support', sourceSystem: 'support', organizationId: org.id },
      ],
    });
    return { org, user };
  });
  const token = signToken({ sub: result.user.id, email: result.user.email });
  res.status(201).json({
    token,
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      accountType: result.user.accountType,
      organizationId: result.user.organizationId,
      isOrgAdmin: true,
      phone: result.user.phone,
    },
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: 'email and password required' });
    return;
  }
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  let orgAdmin = false;
  if (user.organizationId) {
    orgAdmin = await checkOrgAdmin(user.id, user.organizationId);
  }
  const token = signToken({ sub: user.id, email: user.email });
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      accountType: user.accountType,
      organizationId: user.organizationId,
      isOrgAdmin: orgAdmin,
      phone: user.phone,
    },
  });
});

app.get('/api/me', requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  let orgAdmin = false;
  if (user.organizationId) {
    orgAdmin = await checkOrgAdmin(user.id, user.organizationId);
  }
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    accountType: user.accountType,
    organizationId: user.organizationId,
    isOrgAdmin: orgAdmin,
    phone: user.phone,
  });
});

app.get('/api/users', requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  if (!user.organizationId) {
    res.json([{ id: user.id, name: user.name, email: user.email }]);
    return;
  }
  const colleagues = await prisma.user.findMany({
    where: { organizationId: user.organizationId },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });
  res.json(colleagues);
});

app.get('/api/subscriptions', requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  const subs =
    user.organizationId == null
      ? []
      : await prisma.subscription.findMany({
          where: { organizationId: user.organizationId },
          orderBy: { name: 'asc' },
        });
  res.json(subs);
});

function parseFilters(query: express.Request['query'], userId: string) {
  const subscriptionId = typeof query.subscriptionId === 'string' ? query.subscriptionId : undefined;
  const phase = typeof query.phase === 'string' ? query.phase : undefined;
  const search = typeof query.search === 'string' ? query.search.trim() : undefined;
  const dueFrom = typeof query.dueFrom === 'string' ? new Date(query.dueFrom) : undefined;
  const dueTo = typeof query.dueTo === 'string' ? new Date(query.dueTo) : undefined;
  const leadUserId = typeof query.leadUserId === 'string' ? query.leadUserId : undefined;
  const leadOnly = query.leadOnly === 'true' || query.leadOnly === '1';
  const associatedWithMe = query.associatedWithMe === 'true' || query.associatedWithMe === '1';

  const clauses: object[] = [{ ...visibleWhere() }];

  if (subscriptionId) clauses.push({ subscriptionId });
  if (phase) clauses.push({ phase });
  if (search) {
    clauses.push({
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ],
    });
  }
  if (leadOnly) clauses.push({ leadUserId: userId });
  else if (leadUserId) clauses.push({ leadUserId });
  if (associatedWithMe) {
    clauses.push({
      OR: [{ leadUserId: userId }, { associatedUserIds: { has: userId } }],
    });
  }
  if ((dueFrom && !Number.isNaN(dueFrom.getTime())) || (dueTo && !Number.isNaN(dueTo.getTime()))) {
    const range: { gte?: Date; lte?: Date } = {};
    if (dueFrom && !Number.isNaN(dueFrom.getTime())) range.gte = dueFrom;
    if (dueTo && !Number.isNaN(dueTo.getTime())) range.lte = dueTo;
    clauses.push({ dueDateTime: range });
  }

  return { AND: clauses };
}

app.get('/api/tasks', requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  const orgId = user.organizationId;
  const where = {
    AND: [
      parseFilters(req.query, user.id),
      orgId ? { organizationId: orgId } : { createdById: user.id },
    ],
  };
  const tasks = await prisma.task.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      leadUser: { select: { id: true, name: true, email: true } },
      subscription: { select: { id: true, name: true, sourceSystem: true } },
    },
  });
  res.json(tasks);
});

app.get('/api/tasks/:id', requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  const task = await prisma.task.findFirst({
    where: {
      id: req.params.id,
      ...(user.organizationId
        ? { organizationId: user.organizationId }
        : { createdById: user.id }),
    },
    include: {
      notes: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
      documents: true,
      leadUser: { select: { id: true, name: true, email: true } },
      subscription: true,
    },
  });
  if (!task) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(task);
});

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

app.post('/api/tasks', requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  const body = req.body as Record<string, unknown>;
  const priorityQuadrant = Number(body.priorityQuadrant);
  if (![1, 2, 3, 4].includes(priorityQuadrant)) {
    res.status(400).json({ error: 'priorityQuadrant must be 1–4' });
    return;
  }
  const orgId = user.organizationId;

  const task = await prisma.task.create({
    data: {
      organizationId: orgId,
      subscriptionId: (body.subscriptionId as string | undefined) ?? null,
      sourceSystem: (body.sourceSystem as string | undefined) ?? 'manual',
      name: String(body.name ?? 'Untitled'),
      description: body.description != null ? String(body.description) : null,
      priorityQuadrant,
      timeEstimate: clampInt(body.timeEstimate, 1, 10, 5),
      complexity: clampInt(body.complexity, 1, 10, 5),
      difficulty: clampInt(body.difficulty, 1, 10, 5),
      phase: String(body.phase ?? 'Backlog'),
      dueDateTime: body.dueDateTime ? new Date(String(body.dueDateTime)) : null,
      leadUserId: (body.leadUserId as string | undefined) ?? user.id,
      associatedUserIds: Array.isArray(body.associatedUserIds)
        ? (body.associatedUserIds as string[])
        : [],
      createdById: user.id,
    },
    include: {
      leadUser: { select: { id: true, name: true, email: true } },
      subscription: true,
    },
  });

  await prisma.taskActivityLog.create({
    data: { taskId: task.id, actorId: user.id, action: 'created', detail: 'Task created' },
  });

  res.status(201).json(task);
});

app.patch('/api/tasks/:id', requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  const existing = await prisma.task.findFirst({
    where: {
      id: req.params.id,
      ...(user.organizationId
        ? { organizationId: user.organizationId }
        : { createdById: user.id }),
    },
  });
  if (!existing) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const body = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  if (body.name != null) data.name = String(body.name);
  if (body.description !== undefined) data.description = body.description == null ? null : String(body.description);
  if (body.priorityQuadrant != null) {
    const pq = Number(body.priorityQuadrant);
    if (![1, 2, 3, 4].includes(pq)) {
      res.status(400).json({ error: 'Invalid quadrant' });
      return;
    }
    data.priorityQuadrant = pq;
  }
  if (body.timeEstimate != null) data.timeEstimate = clampInt(body.timeEstimate, 1, 10, existing.timeEstimate);
  if (body.complexity != null) data.complexity = clampInt(body.complexity, 1, 10, existing.complexity);
  if (body.difficulty != null) data.difficulty = clampInt(body.difficulty, 1, 10, existing.difficulty);
  if (body.phase != null) data.phase = String(body.phase);
  if ('dueDateTime' in body) {
    data.dueDateTime =
      body.dueDateTime == null || body.dueDateTime === ''
        ? null
        : new Date(String(body.dueDateTime));
  }
  if (body.leadUserId !== undefined) data.leadUserId = body.leadUserId ? String(body.leadUserId) : null;
  if (Array.isArray(body.associatedUserIds)) data.associatedUserIds = body.associatedUserIds as string[];
  if (typeof body.isCCRComplete === 'boolean') data.isCCRComplete = body.isCCRComplete;
  if (typeof body.isInactive === 'boolean') data.isInactive = body.isInactive;
  if (body.subscriptionId !== undefined) data.subscriptionId = body.subscriptionId ? String(body.subscriptionId) : null;

  const prevLead = existing.leadUserId;
  const task = await prisma.task.update({
    where: { id: existing.id },
    data,
    include: {
      leadUser: { select: { id: true, name: true, email: true } },
      subscription: true,
    },
  });

  if (data.leadUserId !== undefined && String(data.leadUserId) !== String(prevLead ?? '')) {
    await prisma.taskLeadHistory.create({
      data: {
        taskId: task.id,
        previousLeadUserId: prevLead,
        newLeadUserId: task.leadUserId,
        changedByUserId: user.id,
      },
    });
    await prisma.taskActivityLog.create({
      data: {
        taskId: task.id,
        actorId: user.id,
        action: 'lead_changed',
        detail: `Lead updated`,
      },
    });
  }

  await prisma.taskActivityLog.create({
    data: { taskId: task.id, actorId: user.id, action: 'updated', detail: 'Task updated' },
  });

  res.json(task);
});

app.post('/api/tasks/:id/notes', requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  const existing = await prisma.task.findFirst({
    where: {
      id: req.params.id,
      ...(user.organizationId
        ? { organizationId: user.organizationId }
        : { createdById: user.id }),
    },
  });
  if (!existing) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const { body: text } = req.body as { body?: string };
  if (!text?.trim()) {
    res.status(400).json({ error: 'Note body required' });
    return;
  }
  const note = await prisma.taskNote.create({
    data: { taskId: existing.id, authorId: user.id, body: text.trim() },
    include: { author: { select: { id: true, name: true } } },
  });
  await prisma.taskActivityLog.create({
    data: { taskId: existing.id, actorId: user.id, action: 'note_added', detail: 'Note added' },
  });
  res.status(201).json(note);
});

app.get('/api/tasks/:id/documents', requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  const existing = await prisma.task.findFirst({
    where: {
      id: req.params.id,
      ...(user.organizationId
        ? { organizationId: user.organizationId }
        : { createdById: user.id }),
    },
  });
  if (!existing) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const docs = await prisma.taskDocument.findMany({
    where: { taskId: existing.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(docs);
});

app.post('/api/tasks/:id/documents', requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  const existing = await prisma.task.findFirst({
    where: {
      id: req.params.id,
      ...(user.organizationId
        ? { organizationId: user.organizationId }
        : { createdById: user.id }),
    },
  });
  if (!existing) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const { fileName, url, mimeType } = req.body as { fileName?: string; url?: string; mimeType?: string };
  if (!fileName || !url) {
    res.status(400).json({ error: 'fileName and url required' });
    return;
  }
  const doc = await prisma.taskDocument.create({
    data: {
      taskId: existing.id,
      uploadedById: user.id,
      fileName,
      url,
      mimeType: mimeType ?? null,
    },
  });
  res.status(201).json(doc);
});

app.post('/api/tasks/:id/lead', requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  const existing = await prisma.task.findFirst({
    where: {
      id: req.params.id,
      ...(user.organizationId
        ? { organizationId: user.organizationId }
        : { createdById: user.id }),
    },
  });
  if (!existing) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const { leadUserId } = req.body as { leadUserId?: string };
  if (!leadUserId) {
    res.status(400).json({ error: 'leadUserId required' });
    return;
  }
  const prev = existing.leadUserId;
  const task = await prisma.task.update({
    where: { id: existing.id },
    data: { leadUserId },
    include: { leadUser: { select: { id: true, name: true, email: true } } },
  });
  await prisma.taskLeadHistory.create({
    data: {
      taskId: task.id,
      previousLeadUserId: prev,
      newLeadUserId: leadUserId,
      changedByUserId: user.id,
    },
  });
  res.json(task);
});

app.post('/api/tasks/:id/associate-user', requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  const existing = await prisma.task.findFirst({
    where: {
      id: req.params.id,
      ...(user.organizationId
        ? { organizationId: user.organizationId }
        : { createdById: user.id }),
    },
  });
  if (!existing) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const { userId: associateId } = req.body as { userId?: string };
  if (!associateId) {
    res.status(400).json({ error: 'userId required' });
    return;
  }
  const set = new Set(existing.associatedUserIds);
  set.add(associateId);
  const task = await prisma.task.update({
    where: { id: existing.id },
    data: { associatedUserIds: [...set] },
    include: { leadUser: { select: { id: true, name: true, email: true } } },
  });
  res.json(task);
});

app.post('/api/tasks/:id/request-lead', requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  const existing = await prisma.task.findFirst({
    where: {
      id: req.params.id,
      ...(user.organizationId
        ? { organizationId: user.organizationId }
        : { createdById: user.id }),
    },
  });
  if (!existing) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const allowed =
    existing.leadUserId === user.id ||
    existing.associatedUserIds.includes(user.id) ||
    (user.organizationId && (await checkOrgAdmin(user.id, user.organizationId)));
  if (!allowed) {
    res.status(403).json({ error: 'Not permitted to request lead' });
    return;
  }
  const prev = existing.leadUserId;
  const task = await prisma.task.update({
    where: { id: existing.id },
    data: { leadUserId: user.id },
    include: { leadUser: { select: { id: true, name: true, email: true } } },
  });
  await prisma.taskLeadHistory.create({
    data: {
      taskId: task.id,
      previousLeadUserId: prev,
      newLeadUserId: user.id,
      changedByUserId: user.id,
    },
  });
  await prisma.taskActivityLog.create({
    data: {
      taskId: task.id,
      actorId: user.id,
      action: 'lead_requested',
      detail: 'User took lead',
    },
  });
  res.json(task);
});

app.post('/api/tasks/sync-mock', requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  const raw = req.body as { subscriptionIds?: string[] };
  const subscriptionIds = Array.isArray(raw.subscriptionIds) ? raw.subscriptionIds : [];
  const remote = await mockProvider.fetchTasks(user.id, subscriptionIds);
  res.json({ merged: remote.length, message: 'Mock provider returned no tasks; wire Ciright APIs here.' });
});

app.get('/api/admin/summary', requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  if (!user.organizationId || !(await checkOrgAdmin(user.id, user.organizationId))) {
    res.status(403).json({ error: 'Admin only' });
    return;
  }
  const orgId = user.organizationId;

  const openTasks = await prisma.task.findMany({
    where: {
      organizationId: orgId,
      ...visibleWhere(),
    },
    include: {
      leadUser: { select: { id: true, name: true, email: true } },
    },
  });

  const byLead = new Map<string | 'unassigned', number>();
  for (const t of openTasks) {
    const key = t.leadUserId ?? 'unassigned';
    byLead.set(key, (byLead.get(key) ?? 0) + 1);
  }

  const overloaded = [...byLead.entries()]
    .filter(([k, v]) => k !== 'unassigned' && v >= 8)
    .map(([k, v]) => ({ userId: k, openTasks: v }));

  const stuckLow = openTasks.filter((t) => t.priorityQuadrant === 3 || t.priorityQuadrant === 4);
  const upcoming = openTasks
    .filter((t) => t.dueDateTime && new Date(t.dueDateTime).getTime() < Date.now() + 7 * 86400000)
    .sort((a, b) => +new Date(a.dueDateTime!) - +new Date(b.dueDateTime!));

  const users = await prisma.user.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });

  res.json({
    openTaskCount: openTasks.length,
    unassignedCount: byLead.get('unassigned') ?? 0,
    byLead: Object.fromEntries(byLead),
    overloadedUsers: overloaded,
    stuckQuadrant34: stuckLow,
    upcomingDue: upcoming.slice(0, 25),
    roster: users,
  });
});

app.listen(PORT, () => {
  console.log(`[MyQuad] API listening on http://localhost:${PORT} (server/index.ts)`);
});

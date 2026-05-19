import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import 'dotenv/config';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { AccountType, MembershipRole } from '@prisma/client';
import { signToken } from './authTokens.js';
import { prisma } from './db.js';
import type { AuthedRequest } from './middleware/requireAuth.js';
import { requireAuth } from './middleware/requireAuth.js';
import { MockWorkItemProvider } from './providers/mock-work-item-provider.js';
import {
  cirightAppLogin,
  cirightLoginDefaults,
  cirightUserLogin,
  cirightUserLoginEnabled,
} from './ciright.js';
import { createTeam, deleteTeam, listTeams, updateTeam } from './teamStore.js';

const mockProvider = new MockWorkItemProvider();
const PORT = Number(process.env.PORT ?? 3001);
const uploadDir = path.join(process.cwd(), 'uploads');

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
app.use('/uploads', express.static(uploadDir));

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

/** Proxies Ciright commonadmin login (m3440396) — avoids browser CORS on myciright.com */
app.post('/api/ciright/login', async (req, res) => {
  const defaults = cirightLoginDefaults();
  const body = req.body as Partial<typeof defaults>;
  const payload = {
    subscriptionId: String(body.subscriptionId ?? defaults.subscriptionId),
    verticalId: String(body.verticalId ?? defaults.verticalId),
    appId: String(body.appId ?? defaults.appId),
  };
  try {
    const result = await cirightAppLogin(payload);
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Ciright login failed' });
  }
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

async function issueAuthResponse(
  res: express.Response,
  user: {
    id: string;
    email: string;
    name: string;
    accountType: AccountType;
    organizationId: string | null;
    phone: string | null;
  },
) {
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
}

async function ensureWorkspaceUserAfterCirightLogin(email: string, password: string) {
  const normalized = email.toLowerCase();
  const passwordHash = await bcrypt.hash(password, 10);
  const orgId = process.env.CIRIGHT_DEFAULT_ORG_ID?.trim() ?? 'seed-org-ciright-demo';
  const org = await prisma.organization.findUnique({ where: { id: orgId } });

  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash },
    });
  }

  const created = await prisma.user.create({
    data: {
      email: normalized,
      passwordHash,
      name: normalized.split('@')[0].replace(/\./g, ' '),
      accountType: org ? AccountType.ENTERPRISE : AccountType.INDIVIDUAL,
      organizationId: org?.id ?? null,
    },
  });

  if (org) {
    await prisma.membership.upsert({
      where: { userId_organizationId: { userId: created.id, organizationId: org.id } },
      update: {},
      create: {
        userId: created.id,
        organizationId: org.id,
        role: MembershipRole.MEMBER,
      },
    });
  }

  return created;
}

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: 'email and password required' });
    return;
  }

  const normalizedEmail = email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (existing && (await bcrypt.compare(password, existing.passwordHash))) {
    await issueAuthResponse(res, existing);
    return;
  }

  if (cirightUserLoginEnabled()) {
    const ciright = await cirightUserLogin(email, password);
    if (ciright.ok) {
      const user = await ensureWorkspaceUserAfterCirightLogin(email, password);
      await issueAuthResponse(res, user);
      return;
    }
    if (ciright.reason === 'invalid_credentials') {
      res.status(401).json({ error: 'Invalid Ciright username or password' });
      return;
    }
  }

  res.status(401).json({ error: 'Invalid credentials' });
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
      associations: true,
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

app.delete('/api/tasks/:id', requireAuth, async (req: AuthedRequest, res) => {
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

  await prisma.task.delete({ where: { id: existing.id } });
  res.status(204).send();
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
  const { fileName, url, mimeType, contentBase64 } = req.body as {
    fileName?: string;
    url?: string;
    mimeType?: string;
    contentBase64?: string;
  };
  if (!fileName || (!url && !contentBase64)) {
    res.status(400).json({ error: 'fileName and either url or contentBase64 required' });
    return;
  }
  let finalUrl = url ?? '';
  if (contentBase64) {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
    const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const diskName = `${token}-${safeName}`;
    const payload = contentBase64.includes(',') ? contentBase64.split(',')[1] : contentBase64;
    const binary = Buffer.from(payload, 'base64');
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, diskName), binary);
    finalUrl = `/uploads/${diskName}`;
  }
  const doc = await prisma.taskDocument.create({
    data: {
      taskId: existing.id,
      uploadedById: user.id,
      fileName,
      url: finalUrl,
      mimeType: mimeType ?? null,
    },
  });
  res.status(201).json(doc);
});

app.get('/api/tasks/:id/associations', requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  const task = await prisma.task.findFirst({
    where: {
      id: req.params.id,
      ...(user.organizationId ? { organizationId: user.organizationId } : { createdById: user.id }),
    },
  });
  if (!task) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const list = await prisma.taskAssociation.findMany({ where: { taskId: task.id } });
  res.json(list);
});

app.post('/api/tasks/:id/associations', requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  const task = await prisma.task.findFirst({
    where: {
      id: req.params.id,
      ...(user.organizationId ? { organizationId: user.organizationId } : { createdById: user.id }),
    },
  });
  if (!task) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const body = req.body as { relatedTaskId?: string; externalSystemId?: string; associationType?: string };
  if (!body.relatedTaskId && !body.externalSystemId) {
    res.status(400).json({ error: 'relatedTaskId or externalSystemId required' });
    return;
  }
  const created = await prisma.taskAssociation.create({
    data: {
      taskId: task.id,
      relatedTaskId: body.relatedTaskId ?? null,
      externalSystemId: body.externalSystemId ?? null,
      associationType: body.associationType?.trim() || 'related',
    },
  });
  await prisma.taskActivityLog.create({
    data: {
      taskId: task.id,
      actorId: user.id,
      action: 'association_added',
      detail: created.associationType,
    },
  });
  res.status(201).json(created);
});

app.delete('/api/tasks/:id/associations/:associationId', requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  const task = await prisma.task.findFirst({
    where: {
      id: req.params.id,
      ...(user.organizationId ? { organizationId: user.organizationId } : { createdById: user.id }),
    },
  });
  if (!task) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const assoc = await prisma.taskAssociation.findFirst({
    where: { id: req.params.associationId, taskId: task.id },
  });
  if (!assoc) {
    res.status(404).json({ error: 'Association not found' });
    return;
  }
  await prisma.taskAssociation.delete({ where: { id: assoc.id } });
  res.status(204).send();
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
  const requestOnly = Boolean((req.body as { requestOnly?: boolean }).requestOnly);
  if (requestOnly) {
    await prisma.taskActivityLog.create({
      data: {
        taskId: existing.id,
        actorId: user.id,
        action: 'lead_request_submitted',
        detail: 'User requested ownership transfer',
      },
    });
    res.json({ ok: true, status: 'requested' });
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
  const orgScope = user.organizationId ?? null;
  let merged = 0;

  for (const item of remote) {
    const externalKey = item.externalTaskId ?? item.id;
    const existing = await prisma.task.findFirst({
      where: {
        organizationId: orgScope,
        externalTaskId: externalKey,
      },
    });
    if (existing) {
      await prisma.task.update({
        where: { id: existing.id },
        data: {
          name: item.name,
          description: item.description ?? null,
          priorityQuadrant: item.priorityQuadrant,
          timeEstimate: clampInt(item.timeEstimate, 1, 10, existing.timeEstimate),
          complexity: clampInt(item.complexity, 1, 10, existing.complexity),
          difficulty: clampInt(item.difficulty, 1, 10, existing.difficulty),
          phase: item.phase,
          dueDateTime: item.dueDateTime ?? null,
          leadUserId: item.leadUserId ?? existing.leadUserId,
          associatedUserIds: item.associatedUserIds ?? existing.associatedUserIds,
          subscriptionId: item.subscriptionId ?? existing.subscriptionId,
          sourceSystem: item.sourceSystem ?? existing.sourceSystem,
          isCCRComplete: !!item.isCCRComplete,
          isInactive: !!item.isInactive,
        },
      });
    } else {
      await prisma.task.create({
        data: {
          organizationId: orgScope,
          subscriptionId: item.subscriptionId ?? null,
          sourceSystem: item.sourceSystem ?? 'mock-ciright',
          externalTaskId: externalKey,
          name: item.name,
          description: item.description ?? null,
          priorityQuadrant: item.priorityQuadrant,
          timeEstimate: clampInt(item.timeEstimate, 1, 10, 5),
          complexity: clampInt(item.complexity, 1, 10, 5),
          difficulty: clampInt(item.difficulty, 1, 10, 5),
          phase: item.phase,
          dueDateTime: item.dueDateTime ?? null,
          leadUserId: item.leadUserId ?? user.id,
          associatedUserIds: item.associatedUserIds ?? [],
          isCCRComplete: !!item.isCCRComplete,
          isInactive: !!item.isInactive,
          createdById: user.id,
        },
      });
    }
    merged += 1;
  }

  res.json({ merged, message: `Merged ${merged} mock task(s) from ${mockProvider.providerName}` });
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

app.get('/api/admin/users', requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  if (!user.organizationId || !(await checkOrgAdmin(user.id, user.organizationId))) {
    res.status(403).json({ error: 'Admin only' });
    return;
  }
  const members = await prisma.membership.findMany({
    where: { organizationId: user.organizationId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { user: { name: 'asc' } },
  });
  res.json(
    members.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
    })),
  );
});

app.patch('/api/admin/users/:userId/role', requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  if (!user.organizationId || !(await checkOrgAdmin(user.id, user.organizationId))) {
    res.status(403).json({ error: 'Admin only' });
    return;
  }
  const role = String((req.body as { role?: string }).role ?? '');
  if (!['ADMIN', 'MEMBER'].includes(role)) {
    res.status(400).json({ error: 'role must be ADMIN or MEMBER' });
    return;
  }
  const updated = await prisma.membership.update({
    where: {
      userId_organizationId: {
        userId: req.params.userId,
        organizationId: user.organizationId,
      },
    },
    data: { role: role as MembershipRole },
  });
  res.json(updated);
});

app.post('/api/admin/subscriptions', requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  if (!user.organizationId || !(await checkOrgAdmin(user.id, user.organizationId))) {
    res.status(403).json({ error: 'Admin only' });
    return;
  }
  const body = req.body as { name?: string; sourceSystem?: string };
  if (!body.name?.trim()) {
    res.status(400).json({ error: 'name required' });
    return;
  }
  const created = await prisma.subscription.create({
    data: {
      organizationId: user.organizationId,
      name: body.name.trim(),
      sourceSystem: body.sourceSystem?.trim() || 'manual',
    },
  });
  res.status(201).json(created);
});

app.patch('/api/admin/subscriptions/:id', requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  if (!user.organizationId || !(await checkOrgAdmin(user.id, user.organizationId))) {
    res.status(403).json({ error: 'Admin only' });
    return;
  }
  const existing = await prisma.subscription.findFirst({
    where: { id: req.params.id, organizationId: user.organizationId },
  });
  if (!existing) {
    res.status(404).json({ error: 'Subscription not found' });
    return;
  }
  const body = req.body as { name?: string; sourceSystem?: string };
  const updated = await prisma.subscription.update({
    where: { id: existing.id },
    data: {
      name: body.name?.trim() || existing.name,
      sourceSystem: body.sourceSystem?.trim() || existing.sourceSystem,
    },
  });
  res.json(updated);
});

app.delete('/api/admin/subscriptions/:id', requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  if (!user.organizationId || !(await checkOrgAdmin(user.id, user.organizationId))) {
    res.status(403).json({ error: 'Admin only' });
    return;
  }
  const existing = await prisma.subscription.findFirst({
    where: { id: req.params.id, organizationId: user.organizationId },
  });
  if (!existing) {
    res.status(404).json({ error: 'Subscription not found' });
    return;
  }
  await prisma.subscription.delete({ where: { id: existing.id } });
  res.status(204).send();
});

app.get('/api/admin/teams', requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  if (!user.organizationId || !(await checkOrgAdmin(user.id, user.organizationId))) {
    res.status(403).json({ error: 'Admin only' });
    return;
  }
  const teams = await listTeams(user.organizationId);
  res.json(teams);
});

app.post('/api/admin/teams', requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  if (!user.organizationId || !(await checkOrgAdmin(user.id, user.organizationId))) {
    res.status(403).json({ error: 'Admin only' });
    return;
  }
  const body = req.body as { name?: string; memberUserIds?: string[] };
  if (!body.name?.trim()) {
    res.status(400).json({ error: 'name required' });
    return;
  }
  const team = await createTeam({
    organizationId: user.organizationId,
    name: body.name.trim(),
    memberUserIds: Array.isArray(body.memberUserIds) ? body.memberUserIds : [],
  });
  res.status(201).json(team);
});

app.patch('/api/admin/teams/:id', requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  if (!user.organizationId || !(await checkOrgAdmin(user.id, user.organizationId))) {
    res.status(403).json({ error: 'Admin only' });
    return;
  }
  const body = req.body as { name?: string; memberUserIds?: string[] };
  const updated = await updateTeam(req.params.id, user.organizationId, {
    name: body.name?.trim(),
    memberUserIds: Array.isArray(body.memberUserIds) ? body.memberUserIds : undefined,
  });
  if (!updated) {
    res.status(404).json({ error: 'Team not found' });
    return;
  }
  res.json(updated);
});

app.delete('/api/admin/teams/:id', requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  if (!user.organizationId || !(await checkOrgAdmin(user.id, user.organizationId))) {
    res.status(403).json({ error: 'Admin only' });
    return;
  }
  const ok = await deleteTeam(req.params.id, user.organizationId);
  if (!ok) {
    res.status(404).json({ error: 'Team not found' });
    return;
  }
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`[MyQuad] API listening on http://localhost:${PORT} (server/index.ts)`);
});

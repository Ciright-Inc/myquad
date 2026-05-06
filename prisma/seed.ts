import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, AccountType, MembershipRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Demo123!', 10);

  const org = await prisma.organization.upsert({
    where: { id: 'seed-org-ciright-demo' },
    update: { name: 'Ciright Demo Org' },
    create: { id: 'seed-org-ciright-demo', name: 'Ciright Demo Org' },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.myquad' },
    update: {},
    create: {
      email: 'admin@demo.myquad',
      passwordHash,
      name: 'Alex Admin',
      phone: '+10000000001',
      accountType: AccountType.ENTERPRISE,
      organizationId: org.id,
    },
  });

  const operator = await prisma.user.upsert({
    where: { email: 'operator@demo.myquad' },
    update: {},
    create: {
      email: 'operator@demo.myquad',
      passwordHash,
      name: 'Riley Operator',
      phone: '+10000000002',
      accountType: AccountType.ENTERPRISE,
      organizationId: org.id,
    },
  });

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: admin.id, organizationId: org.id } },
    update: { role: MembershipRole.ADMIN },
    create: { userId: admin.id, organizationId: org.id, role: MembershipRole.ADMIN },
  });

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: operator.id, organizationId: org.id } },
    update: { role: MembershipRole.MEMBER },
    create: { userId: operator.id, organizationId: org.id, role: MembershipRole.MEMBER },
  });

  const subs = {
    core: await prisma.subscription.upsert({
      where: { id: 'seed-sub-core' },
      update: {},
      create: {
        id: 'seed-sub-core',
        name: 'Ciright Core',
        sourceSystem: 'ciright-core',
        organizationId: org.id,
      },
    }),
    crm: await prisma.subscription.upsert({
      where: { id: 'seed-sub-crm' },
      update: {},
      create: {
        id: 'seed-sub-crm',
        name: 'CRM',
        sourceSystem: 'crm',
        organizationId: org.id,
      },
    }),
    support: await prisma.subscription.upsert({
      where: { id: 'seed-sub-support' },
      update: {},
      create: {
        id: 'seed-sub-support',
        name: 'Support Tickets',
        sourceSystem: 'support',
        organizationId: org.id,
      },
    }),
    nexus: await prisma.subscription.upsert({
      where: { id: 'seed-sub-nexus' },
      update: {},
      create: {
        id: 'seed-sub-nexus',
        name: 'Nexus Projects',
        sourceSystem: 'nexus',
        organizationId: org.id,
      },
    }),
  };

  const existingCount = await prisma.task.count({ where: { organizationId: org.id } });
  if (existingCount >= 20) {
    console.log('Seed tasks already present, skipping task inserts.');
    return;
  }

  const samples: Array<{
    name: string;
    description: string;
    priorityQuadrant: 1 | 2 | 3 | 4;
    timeEstimate: number;
    complexity: number;
    difficulty: number;
    phase: string;
    due: Date | null;
    lead: typeof admin.id;
    associated: string[];
    subscriptionId: string;
    sourceSystem: string;
  }> = [
    {
      name: 'Prepare investor deck',
      description: 'Q3 narrative, metrics, and appendix.',
      priorityQuadrant: 1,
      timeEstimate: 9,
      complexity: 8,
      difficulty: 6,
      phase: 'Active',
      due: new Date(Date.now() + 86400000),
      lead: admin.id,
      associated: [operator.id],
      subscriptionId: subs.core.id,
      sourceSystem: 'ciright-core',
    },
    {
      name: 'Review legal agreement',
      description: 'MSA redlines with counsel.',
      priorityQuadrant: 1,
      timeEstimate: 7,
      complexity: 9,
      difficulty: 8,
      phase: 'Review',
      due: new Date(Date.now() + 2 * 86400000),
      lead: admin.id,
      associated: [],
      subscriptionId: subs.core.id,
      sourceSystem: 'data-room',
    },
    {
      name: 'Call enterprise customer',
      description: 'Renewal checkpoint — exec sponsor.',
      priorityQuadrant: 1,
      timeEstimate: 4,
      complexity: 5,
      difficulty: 4,
      phase: 'Active',
      due: new Date(Date.now() + 12 * 3600000),
      lead: operator.id,
      associated: [admin.id],
      subscriptionId: subs.crm.id,
      sourceSystem: 'crm',
    },
    {
      name: 'Upload support document',
      description: 'Attach logs for ticket #4412.',
      priorityQuadrant: 1,
      timeEstimate: 2,
      complexity: 3,
      difficulty: 2,
      phase: 'Active',
      due: new Date(Date.now() + 6 * 3600000),
      lead: operator.id,
      associated: [],
      subscriptionId: subs.support.id,
      sourceSystem: 'support',
    },
    {
      name: 'Review overdue project task',
      description: 'Dependency unblock for Nexus sprint.',
      priorityQuadrant: 1,
      timeEstimate: 6,
      complexity: 7,
      difficulty: 6,
      phase: 'Blocked',
      due: new Date(Date.now() - 86400000),
      lead: admin.id,
      associated: [operator.id],
      subscriptionId: subs.nexus.id,
      sourceSystem: 'nexus',
    },
    {
      name: 'Strategic roadmap workshop',
      description: 'Facilitate priorities for next half.',
      priorityQuadrant: 2,
      timeEstimate: 8,
      complexity: 7,
      difficulty: 5,
      phase: 'Planned',
      due: new Date(Date.now() + 21 * 86400000),
      lead: admin.id,
      associated: [operator.id],
      subscriptionId: subs.core.id,
      sourceSystem: 'ciright-core',
    },
    {
      name: 'Update CRM data',
      description: 'Normalize account hierarchies.',
      priorityQuadrant: 2,
      timeEstimate: 5,
      complexity: 6,
      difficulty: 4,
      phase: 'Backlog',
      due: new Date(Date.now() + 14 * 86400000),
      lead: operator.id,
      associated: [],
      subscriptionId: subs.crm.id,
      sourceSystem: 'crm',
    },
    {
      name: 'Sync subscription billing',
      description: 'Reconcile seats vs contracts.',
      priorityQuadrant: 2,
      timeEstimate: 6,
      complexity: 8,
      difficulty: 7,
      phase: 'Active',
      due: new Date(Date.now() + 10 * 86400000),
      lead: admin.id,
      associated: [operator.id],
      subscriptionId: subs.core.id,
      sourceSystem: 'ecrm',
    },
    {
      name: 'Vendor security questionnaire',
      description: 'Annual SOC follow-ups.',
      priorityQuadrant: 2,
      timeEstimate: 7,
      complexity: 8,
      difficulty: 6,
      phase: 'Backlog',
      due: new Date(Date.now() + 30 * 86400000),
      lead: operator.id,
      associated: [admin.id],
      subscriptionId: subs.core.id,
      sourceSystem: 'enterprise-workflow',
    },
    {
      name: 'Knowledge base refresh',
      description: 'Deprecate stale articles.',
      priorityQuadrant: 2,
      timeEstimate: 5,
      complexity: 5,
      difficulty: 3,
      phase: 'Planned',
      due: new Date(Date.now() + 45 * 86400000),
      lead: operator.id,
      associated: [],
      subscriptionId: subs.support.id,
      sourceSystem: 'support',
    },
    {
      name: 'Clean inactive workflow',
      description: 'Archive legacy automation branches.',
      priorityQuadrant: 3,
      timeEstimate: 4,
      complexity: 5,
      difficulty: 4,
      phase: 'Backlog',
      due: new Date(Date.now() + 60 * 86400000),
      lead: operator.id,
      associated: [],
      subscriptionId: subs.core.id,
      sourceSystem: 'ciright-core',
    },
    {
      name: 'Assign lead for open issue',
      description: 'Rotate ownership for stale CRM cases.',
      priorityQuadrant: 3,
      timeEstimate: 3,
      complexity: 4,
      difficulty: 3,
      phase: 'Backlog',
      due: new Date(Date.now() + 90 * 86400000),
      lead: admin.id,
      associated: [],
      subscriptionId: subs.crm.id,
      sourceSystem: 'crm',
    },
    {
      name: 'Label taxonomy cleanup',
      description: 'Low impact CRM hygiene.',
      priorityQuadrant: 3,
      timeEstimate: 2,
      complexity: 3,
      difficulty: 2,
      phase: 'Backlog',
      due: null,
      lead: operator.id,
      associated: [],
      subscriptionId: subs.crm.id,
      sourceSystem: 'crm',
    },
    {
      name: 'Quarterly archive purge',
      description: 'Cold storage for old exports.',
      priorityQuadrant: 3,
      timeEstimate: 5,
      complexity: 6,
      difficulty: 5,
      phase: 'Planned',
      due: new Date(Date.now() + 120 * 86400000),
      lead: admin.id,
      associated: [],
      subscriptionId: subs.nexus.id,
      sourceSystem: 'nexus',
    },
    {
      name: 'Complete CCR closeout',
      description: 'CCR checklist items prior to formal completion.',
      priorityQuadrant: 3,
      timeEstimate: 4,
      complexity: 5,
      difficulty: 5,
      phase: 'Done',
      due: null,
      lead: admin.id,
      associated: [],
      subscriptionId: subs.core.id,
      sourceSystem: 'manual',
    },
    {
      name: 'Newsletter draft',
      description: 'Low priority marketing asset.',
      priorityQuadrant: 4,
      timeEstimate: 3,
      complexity: 4,
      difficulty: 3,
      phase: 'Backlog',
      due: null,
      lead: operator.id,
      associated: [],
      subscriptionId: subs.core.id,
      sourceSystem: 'manual',
    },
    {
      name: 'Office snack survey',
      description: 'Noise — optional pulse.',
      priorityQuadrant: 4,
      timeEstimate: 1,
      complexity: 2,
      difficulty: 1,
      phase: 'Backlog',
      due: null,
      lead: operator.id,
      associated: [],
      subscriptionId: subs.core.id,
      sourceSystem: 'manual',
    },
    {
      name: 'Reorder mouse pads',
      description: 'Facilities vendor catalog.',
      priorityQuadrant: 4,
      timeEstimate: 2,
      complexity: 2,
      difficulty: 2,
      phase: 'Backlog',
      due: new Date(Date.now() + 365 * 86400000),
      lead: admin.id,
      associated: [],
      subscriptionId: subs.core.id,
      sourceSystem: 'manual',
    },
    {
      name: 'Lint shared CSS tokens',
      description: 'Nice-to-have UI consistency.',
      priorityQuadrant: 4,
      timeEstimate: 3,
      complexity: 4,
      difficulty: 3,
      phase: 'Backlog',
      due: null,
      lead: operator.id,
      associated: [admin.id],
      subscriptionId: subs.nexus.id,
      sourceSystem: 'nexus',
    },
    {
      name: 'Ping about parking spots',
      description: 'Low urgency logistics.',
      priorityQuadrant: 4,
      timeEstimate: 1,
      complexity: 1,
      difficulty: 1,
      phase: 'Backlog',
      due: null,
      lead: operator.id,
      associated: [],
      subscriptionId: subs.support.id,
      sourceSystem: 'support',
    },
  ];

  for (const s of samples) {
    await prisma.task.create({
      data: {
        organizationId: org.id,
        subscriptionId: s.subscriptionId,
        sourceSystem: s.sourceSystem,
        name: s.name,
        description: s.description,
        priorityQuadrant: s.priorityQuadrant,
        timeEstimate: s.timeEstimate,
        complexity: s.complexity,
        difficulty: s.difficulty,
        phase: s.phase,
        dueDateTime: s.due,
        leadUserId: s.lead,
        associatedUserIds: s.associated,
        isCCRComplete: false,
        isInactive: false,
        createdById: admin.id,
      },
    });
  }

  console.log('Seed complete. Demo login: admin@demo.myquad / Demo123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

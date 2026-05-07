import type { TaskDTO, TaskDocumentDTO, WorkItemProvider } from './work-item-provider.js';

/** Stand-in for future Ciright Core / CRM / Nexus integrations. */
export class MockWorkItemProvider implements WorkItemProvider {
  providerName = 'mock-ciright';

  async fetchTasks(userId: string, subscriptionIds: string[]): Promise<TaskDTO[]> {
    const now = Date.now();
    const pool = subscriptionIds.length ? subscriptionIds : ['mock-sub-core'];
    return [
      {
        id: `mock-${userId}-deck`,
        externalTaskId: `ext-${userId}-deck`,
        organizationId: null,
        subscriptionId: pool[0],
        sourceSystem: 'ciright-core',
        name: 'Mock sync: executive deck follow-up',
        description: 'Pulled from provider mock adapter.',
        priorityQuadrant: 2,
        timeEstimate: 6,
        complexity: 7,
        difficulty: 5,
        phase: 'Planned',
        dueDateTime: new Date(now + 3 * 86400000),
        leadUserId: userId,
        associatedUserIds: [],
        isCCRComplete: false,
        isInactive: false,
        createdById: userId,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      },
      {
        id: `mock-${userId}-ticket`,
        externalTaskId: `ext-${userId}-ticket`,
        organizationId: null,
        subscriptionId: pool[Math.min(1, pool.length - 1)],
        sourceSystem: 'support',
        name: 'Mock sync: support escalation review',
        description: 'Escalated ticket from connected source.',
        priorityQuadrant: 1,
        timeEstimate: 4,
        complexity: 4,
        difficulty: 4,
        phase: 'Active',
        dueDateTime: new Date(now + 10 * 3600000),
        leadUserId: userId,
        associatedUserIds: [],
        isCCRComplete: false,
        isInactive: false,
        createdById: userId,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      },
    ];
  }

  async updateTask(taskId: string, updates: Partial<TaskDTO>): Promise<TaskDTO> {
    throw new Error(`MockWorkItemProvider.updateTask not wired for ${taskId}: ${JSON.stringify(updates)}`);
  }

  async fetchDocuments(taskId: string): Promise<TaskDocumentDTO[]> {
    void taskId;
    return [];
  }
}

import type { TaskDTO, TaskDocumentDTO, WorkItemProvider } from './work-item-provider.js';

/** Stand-in for future Ciright Core / CRM / Nexus integrations. */
export class MockWorkItemProvider implements WorkItemProvider {
  providerName = 'mock-ciright';

  async fetchTasks(_userId: string, _subscriptionIds: string[]): Promise<TaskDTO[]> {
    return [];
  }

  async updateTask(taskId: string, updates: Partial<TaskDTO>): Promise<TaskDTO> {
    throw new Error(`MockWorkItemProvider.updateTask not wired for ${taskId}: ${JSON.stringify(updates)}`);
  }

  async fetchDocuments(_taskId: string): Promise<TaskDocumentDTO[]> {
    return [];
  }
}

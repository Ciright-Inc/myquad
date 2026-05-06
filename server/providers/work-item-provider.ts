export interface TaskDocumentDTO {
  id: string;
  taskId: string;
  fileName: string;
  mimeType?: string | null;
  url: string;
  createdAt: Date;
}

export interface TaskDTO {
  id: string;
  organizationId?: string | null;
  subscriptionId?: string | null;
  sourceSystem?: string | null;
  externalTaskId?: string | null;
  name: string;
  description?: string | null;
  priorityQuadrant: 1 | 2 | 3 | 4;
  timeEstimate: number;
  complexity: number;
  difficulty: number;
  phase: string;
  dueDateTime?: Date | null;
  leadUserId?: string | null;
  associatedUserIds: string[];
  isCCRComplete: boolean;
  isInactive: boolean;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkItemProvider {
  providerName: string;
  fetchTasks(userId: string, subscriptionIds: string[]): Promise<TaskDTO[]>;
  updateTask(taskId: string, updates: Partial<TaskDTO>): Promise<TaskDTO>;
  fetchDocuments(taskId: string): Promise<TaskDocumentDTO[]>;
}

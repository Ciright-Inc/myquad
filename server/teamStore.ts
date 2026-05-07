import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export type TeamRecord = {
  id: string;
  organizationId: string;
  name: string;
  memberUserIds: string[];
  createdAt: string;
  updatedAt: string;
};

const dataFile = path.join(process.cwd(), 'server', 'data', 'teams.json');

async function readAll(): Promise<TeamRecord[]> {
  try {
    const raw = await fs.readFile(dataFile, 'utf8');
    const parsed = JSON.parse(raw) as TeamRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(records: TeamRecord[]): Promise<void> {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(records, null, 2), 'utf8');
}

export async function listTeams(organizationId: string): Promise<TeamRecord[]> {
  const records = await readAll();
  return records.filter((r) => r.organizationId === organizationId);
}

export async function createTeam(input: {
  organizationId: string;
  name: string;
  memberUserIds: string[];
}): Promise<TeamRecord> {
  const records = await readAll();
  const now = new Date().toISOString();
  const team: TeamRecord = {
    id: randomUUID(),
    organizationId: input.organizationId,
    name: input.name,
    memberUserIds: input.memberUserIds,
    createdAt: now,
    updatedAt: now,
  };
  records.push(team);
  await writeAll(records);
  return team;
}

export async function updateTeam(
  teamId: string,
  organizationId: string,
  patch: Partial<Pick<TeamRecord, 'name' | 'memberUserIds'>>,
): Promise<TeamRecord | null> {
  const records = await readAll();
  const idx = records.findIndex((r) => r.id === teamId && r.organizationId === organizationId);
  if (idx < 0) return null;
  records[idx] = {
    ...records[idx],
    name: patch.name ?? records[idx].name,
    memberUserIds: patch.memberUserIds ?? records[idx].memberUserIds,
    updatedAt: new Date().toISOString(),
  };
  await writeAll(records);
  return records[idx];
}

export async function deleteTeam(teamId: string, organizationId: string): Promise<boolean> {
  const records = await readAll();
  const next = records.filter((r) => !(r.id === teamId && r.organizationId === organizationId));
  if (next.length === records.length) return false;
  await writeAll(next);
  return true;
}

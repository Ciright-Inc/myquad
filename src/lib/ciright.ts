import { apiRequest } from "@/lib/api";

export type CirightAppRecord = {
  appId: number;
  appName: string;
  leadId: number;
  leadName: string;
  supportId: number;
  supportName: string;
  managementId: number;
  managementName: string;
};

export type CirightLoginResponse = {
  status: boolean;
  message: string;
  data: CirightAppRecord[];
};

export type CirightLoginRequest = {
  subscriptionId?: string;
  verticalId?: string;
  appId?: string;
};

const STORAGE_KEY = "myquad_ciright_app";

export function loadStoredCirightApp(): CirightAppRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CirightAppRecord;
  } catch {
    return null;
  }
}

export function storeCirightApp(app: CirightAppRecord | null): void {
  if (!app) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(app));
}

export async function cirightLogin(body: CirightLoginRequest = {}): Promise<CirightLoginResponse> {
  return apiRequest<CirightLoginResponse>("/api/ciright/login", {
    method: "POST",
    body,
  });
}

const CIRIGHT_PORTAL_BASE =
  process.env.CIRIGHT_PORTAL_BASE_URL?.trim() ?? 'https://www.myciright.com/Ciright';
const CIRIGHT_API_BASE =
  process.env.CIRIGHT_API_BASE_URL?.trim() ?? `${CIRIGHT_PORTAL_BASE}/api/commonadmin`;
const CIRIGHT_LOGIN_METHOD = process.env.CIRIGHT_LOGIN_METHOD?.trim() ?? 'm3440396';
const CIRIGHT_USER_LOGIN_URL =
  process.env.CIRIGHT_USER_LOGIN_URL?.trim() ?? `${CIRIGHT_PORTAL_BASE}/login`;

export type CirightUserLoginResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_credentials' | 'unavailable' };

export function cirightUserLoginEnabled(): boolean {
  return process.env.CIRIGHT_USER_LOGIN?.trim() !== 'false';
}

function isLoginFailureRedirect(location: string): boolean {
  const target = location.toLowerCase();
  return target.includes('error=1') || target.includes('error=2') || target.includes('error=3');
}

function isLoginPageRedirect(location: string): boolean {
  const target = location.toLowerCase();
  return target.includes('login.htm') || target.endsWith('/login');
}

/** Validates username/password against myciright.com (same form as login.htm). */
export async function cirightUserLogin(username: string, password: string): Promise<CirightUserLoginResult> {
  try {
    const body = new URLSearchParams({ username: username.trim(), password });
    const res = await fetch(CIRIGHT_USER_LOGIN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'text/html,application/xhtml+xml',
      },
      body: body.toString(),
      redirect: 'manual',
    });

    const location = res.headers.get('location') ?? '';
    if (res.status >= 300 && res.status < 400 && location) {
      if (isLoginFailureRedirect(location) || isLoginPageRedirect(location)) {
        return { ok: false, reason: 'invalid_credentials' };
      }
      return { ok: true };
    }

    if (res.status === 200) {
      const html = (await res.text()).toLowerCase();
      if (html.includes('error=1') || html.includes('invalid username') || html.includes('invalid password')) {
        return { ok: false, reason: 'invalid_credentials' };
      }
      return { ok: true };
    }

    return { ok: false, reason: 'unavailable' };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

export type CirightLoginRequest = {
  subscriptionId: string;
  verticalId: string;
  appId: string;
};

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

export function cirightLoginDefaults(): CirightLoginRequest {
  return {
    subscriptionId: process.env.CIRIGHT_SUBSCRIPTION_ID?.trim() ?? '9329',
    verticalId: process.env.CIRIGHT_VERTICAL_ID?.trim() ?? '18',
    appId: process.env.CIRIGHT_APP_ID?.trim() ?? '2969',
  };
}

export async function cirightAppLogin(
  payload: CirightLoginRequest,
  options?: { filterByAppId?: boolean },
): Promise<CirightLoginResponse> {
  const url = `${CIRIGHT_API_BASE.replace(/\/$/, '')}/${CIRIGHT_LOGIN_METHOD}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const contentType = res.headers.get('content-type') ?? '';
  const body: unknown = contentType.includes('application/json')
    ? await res.json()
    : { status: false, message: (await res.text()).slice(0, 200) || 'Non-JSON response', data: [] };

  if (!res.ok) {
    const message =
      typeof body === 'object' && body !== null && 'message' in body
        ? String((body as { message: unknown }).message)
        : `Ciright API error (${res.status})`;
    throw new Error(message);
  }

  const parsed = body as CirightLoginResponse;
  if (!parsed.status) {
    throw new Error(parsed.message || 'Ciright login failed');
  }

  const filterByAppId = options?.filterByAppId ?? true;
  if (!filterByAppId || !payload.appId) {
    return parsed;
  }

  const appId = Number(payload.appId);
  const data = parsed.data.filter((row) => row.appId === appId);
  return { ...parsed, data };
}

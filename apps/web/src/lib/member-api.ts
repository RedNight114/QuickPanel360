const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export function getMemberToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('member:token');
}

export function getMemberData(): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem('member:data') ?? 'null') as Record<string, unknown> | null;
  } catch {
    return null;
  }
}

export function getMemberTenantId(): string | null {
  const data = getMemberData();
  const tenantId = data?.tenantId;
  return typeof tenantId === 'string' && tenantId.trim() ? tenantId : null;
}

export function setMemberAuth(token: string, data: Record<string, unknown>) {
  localStorage.setItem('member:token', token);
  localStorage.setItem('member:data', JSON.stringify(data));
}

export function clearMemberAuth() {
  localStorage.removeItem('member:token');
  localStorage.removeItem('member:data');
}

export async function memberFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getMemberToken();
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    const tenantId = getMemberTenantId();
    clearMemberAuth();
    window.location.href = tenantId ? `/member/login?t=${tenantId}` : '/member/login';
    throw new Error('Session expired');
  }

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json() as Promise<T>;
}

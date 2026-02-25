import type { AppData } from '@/types';

export const apiLogin = async (password: string) => {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  return res.ok;
};

export const apiLogout = async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
};

export const apiCheckSession = async () => {
  const res = await fetch('/api/auth/session', { cache: 'no-store' });
  if (!res.ok) return false;
  const json = (await res.json()) as { authenticated?: boolean };
  return Boolean(json.authenticated);
};

export const apiLoadData = async (): Promise<AppData | null> => {
  const res = await fetch('/api/home', { cache: 'no-store' });
  if (!res.ok) return null;
  const json = (await res.json()) as { data?: AppData };
  return json.data || null;
};

export const apiSaveData = async (data: AppData) => {
  const res = await fetch('/api/home', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  });
  return res.ok;
};

export const apiUploadImage = async (file: File): Promise<string | null> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: formData });
  if (!res.ok) return null;
  const json = (await res.json()) as { data?: { url?: string } };
  return json.data?.url || null;
};

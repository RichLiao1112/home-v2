import type { AppData } from '@/types';

export interface SnapshotMeta {
  id: string;
  key: string;
  createdAt: string;
  reason: 'manual' | 'auto' | 'before_restore' | 'before_import';
  note?: string;
}

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

export const apiLoadData = async (
  key?: string
): Promise<{ data: AppData; key: string; keys: string[] } | null> => {
  const search = key ? `?key=${encodeURIComponent(key)}` : '';
  const res = await fetch(`/api/home${search}`, { cache: 'no-store' });
  if (!res.ok) return null;
  const json = (await res.json()) as { data?: AppData; key?: string; keys?: string[] };
  if (!json.data || !json.key || !json.keys) return null;
  return { data: json.data, key: json.key, keys: json.keys };
};

export const apiSaveData = async (key: string, data: AppData) => {
  const res = await fetch('/api/home', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, data }),
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

export const apiCreateConfigKey = async (key: string) => {
  const res = await fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { key?: string; keys?: string[]; data?: AppData };
  if (!json.key || !json.keys || !json.data) return null;
  return { key: json.key, keys: json.keys, data: json.data };
};

export const apiDeleteConfigKey = async (key: string) => {
  const res = await fetch('/api/config', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { key?: string; keys?: string[]; data?: AppData };
  if (!json.key || !json.keys || !json.data) return null;
  return { key: json.key, keys: json.keys, data: json.data };
};

export const apiSearchMedia = async (q: string) => {
  const res = await fetch(`/api/media?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
  if (!res.ok) return [];
  const json = (await res.json()) as { files?: Array<{ name: string; url: string }> };
  return json.files || [];
};

export const apiSearchUnsplashCollections = async (q: string) => {
  const res = await fetch(`/api/unsplash?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    collections?: Array<{ id: string; title: string; totalPhotos: number; cover: string }>;
  };
  return json.collections || [];
};

export const apiListUnsplashPhotos = async (collectionId: string) => {
  const res = await fetch('/api/unsplash', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ collectionId }),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    photos?: Array<{ id: string; title: string; thumb: string; regular: string; full: string; raw: string; author: string }>;
  };
  return json.photos || [];
};

export const apiListSnapshots = async (key: string) => {
  const res = await fetch(`/api/snapshots?key=${encodeURIComponent(key)}`, { cache: 'no-store' });
  if (!res.ok) return [];
  const json = (await res.json()) as { snapshots?: SnapshotMeta[] };
  return json.snapshots || [];
};

export const apiCreateSnapshot = async (key: string, note?: string) => {
  const res = await fetch('/api/snapshots', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'create', key, note }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { snapshot?: SnapshotMeta; created?: boolean };
  return { snapshot: json.snapshot, created: Boolean(json.created) };
};

export const apiRestoreSnapshot = async (key: string, snapshotId: string) => {
  const res = await fetch('/api/snapshots', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'restore', key, snapshotId }),
  });
  return res.ok;
};

export const apiDeleteSnapshot = async (key: string, snapshotId: string) => {
  const res = await fetch('/api/snapshots', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, snapshotId }),
  });
  return res.ok;
};

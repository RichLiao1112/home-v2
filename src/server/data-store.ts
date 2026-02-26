import { createHash, randomUUID } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { AppData } from '@/types';
import { createDefaultData, normalizeData } from '@/types';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const MEDIA_DIR = process.env.MEDIA_DIR || path.join(process.cwd(), 'media');
const DATA_FILE = process.env.DATA_FILE || 'home.json';
const SNAPSHOT_FILE = process.env.SNAPSHOT_FILE || 'snapshots.json';
const SNAPSHOT_MAX_PER_KEY = Math.min(Math.max(Number(process.env.SNAPSHOT_MAX_PER_KEY || 30), 5), 200);

export const getDataFilePath = () => path.join(DATA_DIR, DATA_FILE);
const getSnapshotFilePath = () => path.join(DATA_DIR, SNAPSHOT_FILE);

export const getMediaDir = () => MEDIA_DIR;

const ensureDir = async (dirPath: string) => {
  await mkdir(dirPath, { recursive: true });
};

type AppDB = Record<string, AppData>;
type SnapshotReason = 'manual' | 'auto' | 'before_restore' | 'before_import';

interface SnapshotItem {
  id: string;
  key: string;
  createdAt: string;
  reason: SnapshotReason;
  note?: string;
  hash: string;
  data: AppData;
}

type SnapshotDB = Record<string, SnapshotItem[]>;

export interface SnapshotMeta {
  id: string;
  key: string;
  createdAt: string;
  reason: SnapshotReason;
  note?: string;
}

const toSnapshotMeta = (item: SnapshotItem): SnapshotMeta => ({
  id: item.id,
  key: item.key,
  createdAt: item.createdAt,
  reason: item.reason,
  note: item.note,
});

const normalizeDb = (payload: unknown): AppDB => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { default: createDefaultData() };
  }

  // single-profile format
  if (Array.isArray((payload as AppData).categories)) {
    return { default: normalizeData(payload as AppData) };
  }

  const entries = Object.entries(payload as Record<string, unknown>);
  const mapped = Object.fromEntries(
    entries
      .filter(([, value]) => value && typeof value === 'object')
      .map(([key, value]) => [key, normalizeData(value as AppData | Record<string, unknown>)]),
  ) as AppDB;

  if (Object.keys(mapped).length === 0) {
    return { default: createDefaultData() };
  }
  return mapped;
};

const normalizeSnapshotDb = (payload: unknown): SnapshotDB => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {};
  const raw = payload as Record<string, unknown>;
  const db: SnapshotDB = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!Array.isArray(value)) continue;
    const items = value
      .map(item => {
        if (!item || typeof item !== 'object') return null;
        const record = item as Partial<SnapshotItem>;
        if (!record.id || !record.createdAt || !record.hash || !record.data) return null;
        const normalizedItem: SnapshotItem = {
          id: String(record.id),
          key,
          createdAt: String(record.createdAt),
          reason: (record.reason as SnapshotReason) || 'manual',
          hash: String(record.hash),
          data: normalizeData(record.data as AppData | Record<string, unknown>),
        };
        if (record.note) normalizedItem.note = String(record.note);
        return normalizedItem;
      })
      .filter((it): it is SnapshotItem => it !== null)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, SNAPSHOT_MAX_PER_KEY);
    if (items.length) db[key] = items;
  }
  return db;
};

export const readAppDB = async (): Promise<AppDB> => {
  await ensureDir(DATA_DIR);
  const filePath = getDataFilePath();

  try {
    const raw = await readFile(filePath, 'utf-8');
    if (!raw.trim()) {
      const fallback = { default: createDefaultData() };
      await writeAppDB(fallback);
      return fallback;
    }
    const parsed = JSON.parse(raw) as unknown;
    const db = normalizeDb(parsed);
    return db;
  } catch {
    const fallback = { default: createDefaultData() };
    await writeAppDB(fallback);
    return fallback;
  }
};

export const writeAppDB = async (payload: AppDB) => {
  await ensureDir(DATA_DIR);
  const filePath = getDataFilePath();
  const normalized = Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, normalizeData(value)]));
  await writeFile(filePath, JSON.stringify(normalized, null, 2), 'utf-8');
};

const readSnapshotDB = async (): Promise<SnapshotDB> => {
  await ensureDir(DATA_DIR);
  const filePath = getSnapshotFilePath();
  try {
    const raw = await readFile(filePath, 'utf-8');
    if (!raw.trim()) return {};
    return normalizeSnapshotDb(JSON.parse(raw) as unknown);
  } catch {
    return {};
  }
};

const writeSnapshotDB = async (payload: SnapshotDB) => {
  await ensureDir(DATA_DIR);
  const filePath = getSnapshotFilePath();
  await writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
};

const computeDataHash = (data: AppData) => {
  return createHash('sha256')
    .update(JSON.stringify(normalizeData(data)))
    .digest('hex');
};

const pushSnapshot = async (
  key: string,
  data: AppData,
  reason: SnapshotReason,
  note?: string,
): Promise<{ created: boolean; snapshot?: SnapshotMeta }> => {
  const db = await readSnapshotDB();
  const list = db[key] || [];
  const normalized = normalizeData(data);
  const hash = computeDataHash(normalized);
  if (list[0]?.hash === hash) {
    return { created: false, snapshot: toSnapshotMeta(list[0]) };
  }
  const item: SnapshotItem = {
    id: randomUUID(),
    key,
    createdAt: new Date().toISOString(),
    reason,
    note: note?.trim() || undefined,
    hash,
    data: normalized,
  };
  db[key] = [item, ...list].slice(0, SNAPSHOT_MAX_PER_KEY);
  await writeSnapshotDB(db);
  return { created: true, snapshot: toSnapshotMeta(item) };
};

export const readAppData = async (targetKey?: string) => {
  const db = await readAppDB();
  const keys = Object.keys(db);
  const key = targetKey && db[targetKey] ? targetKey : keys[0] || 'default';
  if (!db[key]) {
    db[key] = createDefaultData();
  }
  return { key, keys: Object.keys(db), data: db[key] };
};

export const writeAppData = async (key: string, payload: AppData) => {
  const db = await readAppDB();
  db[key] = normalizeData(payload);
  await writeAppDB(db);
  return { key, keys: Object.keys(db), data: db[key] };
};

export const createConfigKey = async (key: string) => {
  const db = await readAppDB();
  if (db[key]) return { success: false, message: '配置 key 已存在' };
  db[key] = createDefaultData();
  await writeAppDB(db);
  return { success: true, key, keys: Object.keys(db), data: db[key] };
};

export const deleteConfigKey = async (key: string) => {
  const db = await readAppDB();
  const keys = Object.keys(db);
  if (!db[key]) return { success: false, message: '配置 key 不存在' };
  if (keys.length <= 1) return { success: false, message: '至少保留一个配置' };
  delete db[key];
  const nextKey = Object.keys(db)[0];
  await writeAppDB(db);
  return { success: true, key: nextKey, keys: Object.keys(db), data: db[nextKey] };
};

export const listSnapshots = async (targetKey?: string) => {
  const result = await readAppData(targetKey);
  const db = await readSnapshotDB();
  const list = (db[result.key] || []).map(toSnapshotMeta);
  return { key: result.key, keys: result.keys, snapshots: list };
};

export const createSnapshot = async (targetKey?: string, reason: SnapshotReason = 'manual', note?: string) => {
  const result = await readAppData(targetKey);
  const created = await pushSnapshot(result.key, result.data, reason, note);
  return { key: result.key, keys: result.keys, ...created };
};

export const deleteSnapshot = async (targetKey: string, snapshotId: string) => {
  const result = await readAppData(targetKey);
  const db = await readSnapshotDB();
  const current = db[result.key] || [];
  const next = current.filter(item => item.id !== snapshotId);
  if (next.length === current.length) {
    return { success: false, message: '快照不存在' };
  }
  if (next.length) db[result.key] = next;
  else delete db[result.key];
  await writeSnapshotDB(db);
  return { success: true, key: result.key, keys: result.keys };
};

export const restoreSnapshot = async (targetKey: string, snapshotId: string) => {
  const current = await readAppData(targetKey);
  const db = await readSnapshotDB();
  const match = (db[current.key] || []).find(item => item.id === snapshotId);
  if (!match) {
    return { success: false, message: '快照不存在' };
  }

  const nowText = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
  await pushSnapshot(current.key, current.data, 'before_restore', `恢复前自动快照 ${nowText}`);
  const restored = await writeAppData(current.key, match.data);
  return { success: true, ...restored };
};

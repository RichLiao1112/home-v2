import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { AppData } from '@/types';
import { createDefaultData, normalizeData } from '@/types';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const MEDIA_DIR = process.env.MEDIA_DIR || path.join(process.cwd(), 'media');
const DATA_FILE = process.env.DATA_FILE || 'home.json';

export const getDataFilePath = () => path.join(DATA_DIR, DATA_FILE);

export const getMediaDir = () => MEDIA_DIR;

const ensureDir = async (dirPath: string) => {
  await mkdir(dirPath, { recursive: true });
};

type AppDB = Record<string, AppData>;

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
      .map(([key, value]) => [key, normalizeData({ default: value } as Record<string, unknown>)])
  ) as AppDB;

  if (Object.keys(mapped).length === 0) {
    return { default: createDefaultData() };
  }
  return mapped;
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
  const normalized = Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, normalizeData(value)])
  );
  await writeFile(filePath, JSON.stringify(normalized, null, 2), 'utf-8');
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

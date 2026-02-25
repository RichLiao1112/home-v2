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

export const readAppData = async (): Promise<AppData> => {
  await ensureDir(DATA_DIR);
  const filePath = getDataFilePath();

  try {
    const raw = await readFile(filePath, 'utf-8');
    if (!raw.trim()) {
      const fallback = createDefaultData();
      await writeAppData(fallback);
      return fallback;
    }
    const parsed = JSON.parse(raw) as AppData;
    return normalizeData(parsed);
  } catch {
    const fallback = createDefaultData();
    await writeAppData(fallback);
    return fallback;
  }
};

export const writeAppData = async (payload: AppData) => {
  await ensureDir(DATA_DIR);
  const filePath = getDataFilePath();
  await writeFile(filePath, JSON.stringify(normalizeData(payload), null, 2), 'utf-8');
};

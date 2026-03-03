import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const RATE_LIMIT_FILE = path.join(DATA_DIR, 'qweather-rate.json');

interface RateLimitData {
  date: string;
  count: number;
}

const getRateLimitFilePath = () => RATE_LIMIT_FILE;

const ensureDir = async () => {
  await mkdir(DATA_DIR, { recursive: true });
};

const getToday = () => new Date().toISOString().split('T')[0];

export const checkAndIncrementRateLimit = async (maxPerDay: number = 150): Promise<{ allowed: boolean; remaining: number; resetDate: string }> => {
  await ensureDir();

  const today = getToday();

  try {
    const raw = await readFile(getRateLimitFilePath(), 'utf-8');
    const data = JSON.parse(raw) as RateLimitData;

    if (data.date === today) {
      if (data.count >= maxPerDay) {
        return { allowed: false, remaining: 0, resetDate: today };
      }
      data.count += 1;
      await writeFile(getRateLimitFilePath(), JSON.stringify(data), 'utf-8');
      return { allowed: true, remaining: maxPerDay - data.count, resetDate: today };
    } else {
      // 新的一天，重置计数
      const newData: RateLimitData = { date: today, count: 1 };
      await writeFile(getRateLimitFilePath(), JSON.stringify(newData), 'utf-8');
      return { allowed: true, remaining: maxPerDay - 1, resetDate: today };
    }
  } catch {
    // 文件不存在或解析错误，创建新的
    const newData: RateLimitData = { date: today, count: 1 };
    await writeFile(getRateLimitFilePath(), JSON.stringify(newData), 'utf-8');
    return { allowed: true, remaining: maxPerDay - 1, resetDate: today };
  }
};

export const getRateLimitStatus = async (maxPerDay: number = 150): Promise<{ count: number; remaining: number; resetDate: string }> => {
  await ensureDir();

  const today = getToday();

  try {
    const raw = await readFile(getRateLimitFilePath(), 'utf-8');
    const data = JSON.parse(raw) as RateLimitData;

    if (data.date === today) {
      return {
        count: data.count,
        remaining: Math.max(0, maxPerDay - data.count),
        resetDate: today,
      };
    }
  } catch {
    // 忽略错误
  }

  return { count: 0, remaining: maxPerDay, resetDate: today };
};

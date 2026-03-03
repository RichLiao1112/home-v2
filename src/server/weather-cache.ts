// 天气数据内存缓存（1小时）

interface CacheEntry {
  data: any;
  timestamp: number;
}

const weatherCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 60 * 1000; // 1小时

export function getWeatherCache(location: string): any | null {
  const entry = weatherCache.get(location);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  weatherCache.delete(location);
  return null;
}

export function setWeatherCache(location: string, data: any): void {
  weatherCache.set(location, {
    data,
    timestamp: Date.now(),
  });
}

export function clearWeatherCache(location?: string): void {
  if (location) {
    weatherCache.delete(location);
  } else {
    weatherCache.clear();
  }
}

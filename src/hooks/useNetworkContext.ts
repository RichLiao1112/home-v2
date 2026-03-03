import { useEffect, useState, useCallback } from 'react';

interface NetworkContext {
  clientIP: string;
  isPrivate: boolean;
  networkType: 'lan' | 'wan';
  loading: boolean;
  error: string | null;
}

const CACHE_KEY = 'home-v2-network-context';
const CACHE_DURATION = 5 * 60 * 1000; // 5 分钟缓存

interface CachedContext {
  data: Omit<NetworkContext, 'loading' | 'error'>;
  timestamp: number;
}

export function useNetworkContext(): NetworkContext {
  const [state, setState] = useState<NetworkContext>({
    clientIP: 'unknown',
    isPrivate: false,
    networkType: 'wan',
    loading: true,
    error: null,
  });

  const fetchNetworkContext = useCallback(async () => {
    try {
      // 每次都重新调用 API（刷新页面时更新缓存）
      const response = await fetch('/api/network-context', {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // 缓存结果
      const cacheData: CachedContext = {
        data: {
          clientIP: data.clientIP,
          isPrivate: data.isPrivate,
          networkType: data.networkType,
        },
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

      setState({
        clientIP: data.clientIP,
        isPrivate: data.isPrivate,
        networkType: data.networkType,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('[NetworkContext] Failed to fetch:', error);
      // 如果 API 调用失败，尝试使用缓存作为 fallback
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { data }: CachedContext = JSON.parse(cached);
          setState({
            ...data,
            loading: false,
            error: `使用缓存数据 (API 失败：${error instanceof Error ? error.message : 'Unknown'})`,
          });
          return;
        } catch {
          // 缓存解析失败，继续使用错误状态
        }
      }
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, []);

  useEffect(() => {
    fetchNetworkContext();
  }, [fetchNetworkContext]);

  return state;
}

// 辅助函数：获取缓存的网络上下文（同步）
// 用于在组件渲染前快速获取缓存数据（无过期时间限制）
export function getCachedNetworkContext(): Omit<NetworkContext, 'loading' | 'error'> | null {
  if (typeof window === 'undefined') return null;

  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return null;

  try {
    const { data }: CachedContext = JSON.parse(cached);
    return data;
  } catch {
    // 解析失败，忽略
  }

  return null;
}

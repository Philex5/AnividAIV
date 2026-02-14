import { useState, useEffect, useRef, useCallback } from "react";

export type ChatQuotaData = {
  success: boolean;
  data?: {
    quota: {
      membership_level: string;
      monthly_quota: number;
      monthly_used: number;
      monthly_remaining: number;
      reset_at: string;
      total_used: number;
      is_unlimited?: boolean;
    };
    stats: {
      total_used: number;
      today_used: number;
    };
    subscription: {
      current: string;
      next_level: string | null;
    };
  };
  error?: string;
};

// 内存缓存，避免重复请求
const quotaCache = new Map<string, { data: ChatQuotaData; timestamp: number }>();
const CACHE_TTL = 30 * 1000; // 30秒缓存

export function useChatQuota(options?: { lazy?: boolean }) {
  const [data, setData] = useState<ChatQuotaData | null>(null);
  const [loading, setLoading] = useState(!options?.lazy);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(!options?.lazy);
  const fetchId = useRef(0);
  const currentCacheKey = "default";

  const fetchQuota = async () => {
    const currentFetchId = ++fetchId.current;
    const cacheKey = currentCacheKey;
    const now = Date.now();

    console.log(`[useChatQuota] fetchQuota called #${currentFetchId}`);
    console.log(`[useChatQuota] Cache size: ${quotaCache.size}, Cache keys:`, Array.from(quotaCache.keys()));

    // 检查缓存
    const cached = quotaCache.get(cacheKey);
    if (cached) {
      const age = now - cached.timestamp;
      console.log(`[useChatQuota] Found cache for key "${cacheKey}", age: ${age}ms, TTL: ${CACHE_TTL}ms, isValid: ${age < CACHE_TTL}`);
    }

    if (cached && now - cached.timestamp < CACHE_TTL) {
      console.log("[useChatQuota] ✅ Using cached data");
      setData(cached.data);
      setLoading(false);
      setHasFetched(true);
      return;
    }

    console.log(`[useChatQuota] Fetching fresh data (fetchId: ${currentFetchId})`);
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/chat/quota");
      const result = await response.json();

      console.log("[useChatQuota] API response:", {
        status: response.status,
        ok: response.ok,
        result
      });

      // 检查是否是过时的请求
      if (currentFetchId !== fetchId.current) {
        console.log(`[useChatQuota] Outdated request (${currentFetchId}), ignoring response`);
        return;
      }

      if (!result.success) {
        console.error("[useChatQuota] API returned success=false:", result.error);
        throw new Error(result.error || "Failed to fetch quota");
      }

      console.log("[useChatQuota] Setting data:", result);
      setData(result);
      setHasFetched(true);

      // 更新缓存
      quotaCache.set(cacheKey, { data: result, timestamp: now });
      console.log("[useChatQuota] Updated cache");
    } catch (err: any) {
      console.error("[useChatQuota] Error:", err);
      if (currentFetchId === fetchId.current) {
        setError(err.message || "Failed to fetch quota");
        setData(null);
        setHasFetched(true);
      }
    } finally {
      if (currentFetchId === fetchId.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    console.log(`[useChatQuota] Mounted/Updated, lazy=${options?.lazy}, hasFetched=${hasFetched}`);
    if (!options?.lazy || !hasFetched) {
      console.log(`[useChatQuota] Triggering initial fetch`);
      fetchQuota();
    } else {
      console.log(`[useChatQuota] Skipping initial fetch (lazy=true and already fetched)`);
    }
  }, []);

  const refetch = useCallback(() => {
    console.log("[useChatQuota] Manual refetch requested");
    // 清除缓存，强制重新获取
    quotaCache.delete(currentCacheKey);
    // 直接访问当前状态，避免依赖项不稳定
    if (!hasFetched || loading) {
      console.log("[useChatQuota] Skipping refetch (not ready)");
      return;
    }
    fetchQuota();
    // 空依赖数组，函数引用稳定
  }, []);

  return {
    data: data?.data,
    loading,
    error,
    refetch,
    hasFetched,
  };
}

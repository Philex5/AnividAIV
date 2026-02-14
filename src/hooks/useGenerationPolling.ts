import { useEffect, useRef, useCallback, useState } from "react";

export type GenerationType = "anime" | "avatar" | "character" | "background" | "video";

export interface GenerationResult {
  image_uuid: string;
  image_url: string;
  thumbnail_url?: string;
  created_at: string;
  generation_uuid: string;
  image_index: number;
}

export interface GenerationStatusResponse {
  uuid: string;
  status: string;
  created_at: string;
  batch_size: number;
  credits_used: number;
  message?: string;
  error_message?: string;
  results?: GenerationResult[];
}

export interface UseGenerationPollingOptions {
  generationId: string | null;
  generationType: GenerationType;
  pollingInterval?: number; // 毫秒，默认根据类型自动设置
  timeoutMs?: number; // 毫秒，默认根据类型自动设置
  onCompleted?: (results: GenerationResult[]) => void;
  onFailed?: (error: string) => void;
  onTimeout?: () => void;
  onStatusUpdate?: (status: GenerationStatusResponse) => void;
}

export interface UseGenerationPollingReturn {
  isPolling: boolean;
  timeElapsed: number; // 已轮询时间，毫秒
  error: string | null;
  pollingCount: number;
}

/**
 * 根据生成类型获取默认轮询配置
 */
function getPollingConfig(generationType: GenerationType) {
  switch (generationType) {
    case "video":
      return {
        initialInterval: 5000, // 初始5秒
        midInterval: 8000, // 中期8秒
        lateInterval: 10000, // 后期10秒
        timeout: 20 * 60 * 1000, // 20分钟超时
        midThreshold: 30 * 1000, // 30秒后进入中期
        lateThreshold: 2 * 60 * 1000, // 2分钟后进入后期
        maxPollingCount: 200, // 最大轮询次数
      };
    case "anime":
    case "avatar":
    case "character":
    case "background":
    default:
      return {
        initialInterval: 3000, // 初始3秒
        midInterval: 3000, // 中期3秒
        lateInterval: 3000, // 后期3秒
        timeout: 10 * 60 * 1000, // 10分钟超时
        midThreshold: Infinity, // 不切换
        lateThreshold: Infinity, // 不切换
        maxPollingCount: 100, // 最大轮询次数
      };
  }
}

/**
 * 通用的生成任务轮询Hook
 * 基于generation_id管理独立的轮询任务，支持类型相关的超时和渐进式轮询间隔
 */
export function useGenerationPolling({
  generationId,
  generationType,
  pollingInterval,
  timeoutMs,
  onCompleted,
  onFailed,
  onTimeout,
  onStatusUpdate,
}: UseGenerationPollingOptions): UseGenerationPollingReturn {
  // 获取类型相关的默认配置
  const pollingConfig = getPollingConfig(generationType);

  // 使用传入的值或默认值
  const effectivePollingInterval =
    pollingInterval ?? pollingConfig.initialInterval;
  const effectiveTimeout = timeoutMs ?? pollingConfig.timeout;

  const [isPolling, setIsPolling] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pollingCount, setPollingCount] = useState(0);
  const [currentInterval, setCurrentInterval] = useState(
    effectivePollingInterval
  );

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const timeElapsedIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 根据经过的时间动态调整轮询间隔
   */
  const getAdaptiveInterval = useCallback((): number => {
    if (!startTimeRef.current) return effectivePollingInterval;

    const elapsed = Date.now() - startTimeRef.current;

    // 如果用户自定义了轮询间隔，不使用自适应
    if (pollingInterval !== undefined) {
      return pollingInterval;
    }

    // 根据时间阶段返回不同的轮询间隔
    if (elapsed >= pollingConfig.lateThreshold) {
      return pollingConfig.lateInterval;
    } else if (elapsed >= pollingConfig.midThreshold) {
      return pollingConfig.midInterval;
    }
    return pollingConfig.initialInterval;
  }, [effectivePollingInterval, pollingInterval, pollingConfig]);

  // 检查生成状态的API调用
  const checkGenerationStatus = useCallback(
    async (genId: string): Promise<GenerationStatusResponse | null> => {
      try {
        const startTime = Date.now();
        const response = await fetch(`/api/generation/status/${genId}`);
        const duration = Date.now() - startTime;

        if (response.ok) {
          const data = await response.json().catch(() => null);
          if (data?.code != null && data.code !== 0) {
            throw new Error(data?.message || "Failed to get generation status");
          }
          const resolvedStatus =
            data?.data && typeof data.data === "object" ? data.data : data;
          if (!resolvedStatus || typeof resolvedStatus !== "object") {
            throw new Error("Invalid generation status response");
          }
          console.log(`[Polling] [${genId}] StatusCheck: Response received`, {
            status: resolvedStatus.status,
            progress: resolvedStatus.progress,
            has_results: !!resolvedStatus.results,
            duration: `${duration}ms`,
          });
          return resolvedStatus;
        } else {
          // 任何非200状态码都视为失败，需要停止轮询并处理积分
          console.error(
            `[Polling] [${genId}] StatusCheck: Failed with status ${response.status}`,
            {
              duration: `${duration}ms`,
            }
          );

          let errorMessage = "Generation failed";
          if (response.status === 400) {
            errorMessage = "Generation failed due to harmful content";
          } else if (response.status === 404) {
            errorMessage = "Generation task not found";
          } else if (response.status >= 500) {
            errorMessage = "Server error occurred during generation";
          }

          // 调用失败处理API
          try {
            console.log(`[Polling] [${genId}] Calling handle-failure API`, {
              error_type: "polling_error",
              reason: errorMessage,
            });
            await fetch("/api/generation/handle-failure", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                generation_uuid: genId,
                reason: `Status ${response.status}: ${errorMessage}`,
                error_type: "polling_error",
              }),
            });
          } catch (failureError) {
            console.error(
              `[Polling] [${genId}] Failed to handle polling failure:`,
              failureError
            );
          }

          throw new Error(errorMessage);
        }
      } catch (error) {
        console.error(
          `[Polling] [${genId}] Network error while checking status:`,
          error
        );

        // 网络错误也需要处理失败
        try {
          await fetch("/api/generation/handle-failure", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              generation_uuid: genId,
              reason: `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
              error_type: "network_error",
            }),
          });
        } catch (failureError) {
          console.error(
            `[Polling] [${genId}] Failed to handle network failure:`,
            failureError
          );
        }

        throw error;
      }
    },
    []
  );

  // 停止轮询
  const stopPolling = useCallback(() => {
    const elapsed = startTimeRef.current
      ? Date.now() - startTimeRef.current
      : 0;
    console.log("[Polling] Stopping polling", {
      elapsed: `${elapsed}ms`,
      pollingCount,
    });
    setIsPolling(false);
    setTimeElapsed(0);
    setPollingCount(0);
    startTimeRef.current = null;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (timeElapsedIntervalRef.current) {
      clearInterval(timeElapsedIntervalRef.current);
      timeElapsedIntervalRef.current = null;
    }
  }, [pollingCount]);

  // 处理超时
  const handleTimeout = useCallback(
    async (genId: string) => {
      const timeoutMinutes = Math.round(effectiveTimeout / 60000);
      console.log(
        `[Polling] [${genId}] Timeout reached after ${effectiveTimeout}ms (${timeoutMinutes} minutes)`
      );
      stopPolling();

      // 调用失败处理API
      try {
        console.log(
          `[Polling] [${genId}] Calling handle-failure API for timeout`
        );
        await fetch("/api/generation/handle-failure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            generation_uuid: genId,
            reason: `Generation timeout after ${timeoutMinutes} minutes`,
            error_type: "polling_timeout",
          }),
        });
      } catch (failureError) {
        console.error(
          `[Polling] [${genId}] Failed to handle timeout:`,
          failureError
        );
      }

      setError(`Generation timeout after ${timeoutMinutes} minutes`);
      onTimeout?.();
    },
    [stopPolling, onTimeout, effectiveTimeout]
  );

  // 轮询逻辑
  const pollStatus = useCallback(
    async (genId: string) => {
      // 检查超时
      if (
        startTimeRef.current &&
        Date.now() - startTimeRef.current > effectiveTimeout
      ) {
        await handleTimeout(genId);
        return;
      }

      let statusData;
      try {
        statusData = await checkGenerationStatus(genId);
      } catch (error) {
        // 如果checkGenerationStatus抛出错误，说明已经处理了失败，直接停止轮询
        stopPolling();
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        setError(errorMsg);
        onFailed?.(errorMsg);
        return;
      }

      // 🔴 Use functional update to avoid pollingCount dependency
      setPollingCount((prev) => {
        const newCount = prev + 1;

        // 🔴 使用类型相关的最大轮询次数
        if (newCount > pollingConfig.maxPollingCount) {
          console.warn(
            `[useGenerationPolling] Polling count exceeded limit (${newCount}), forcing stop`
          );
          // 异步执行停止操作，避免在state更新中调用
          setTimeout(() => {
            stopPolling();
            const timeoutMsg =
              "Polling limit exceeded, operation may have completed";
            setError(timeoutMsg);
            onTimeout?.();
          }, 0);
        }

        return newCount;
      });

      if (!statusData) {
        console.warn(
          "[useGenerationPolling] Failed to get status data, continuing..."
        );
        return;
      }

      // 通知状态更新
      onStatusUpdate?.(statusData);

      // Debug logging for completed status with results
      if (statusData.status === "completed") {
        console.log('[Polling] Generation completed:', {
          status: statusData.status,
          hasResults: !!statusData.results,
          resultsLength: statusData.results?.length || 0,
          allResults: statusData.results,
          firstResultKeys: statusData.results?.[0] ? Object.keys(statusData.results[0]) : 'no results',
        });
      }

      // 🔴 增强完成状态检查逻辑 - 优先检查是否有结果
      // 如果已有结果,无论状态如何都视为完成(避免重复触发)
      if (statusData.results && statusData.results.length > 0) {
        stopPolling();
        onCompleted?.(statusData.results);
      } else if (statusData.status === "completed") {
        stopPolling();
        const results = statusData.results || [];
        onCompleted?.(results);
      } else if (statusData.status === "failed") {
        stopPolling();
        const errorMsg =
          statusData.error_message || statusData.message || "Generation failed";
        setError(errorMsg);
        onFailed?.(errorMsg);
      }
      // 对于 pending 和 processing 状态，继续轮询
    },
    [
      effectiveTimeout,
      checkGenerationStatus,
      handleTimeout,
      stopPolling,
      onStatusUpdate,
      onCompleted,
      onFailed,
      onTimeout,
      pollingConfig.maxPollingCount,
    ]
  );

  // 开始轮询
  const startPolling = useCallback(
    (genId: string) => {
      console.log(`[Polling] [${genId}] Starting polling`, {
        generationType,
        initialInterval: `${effectivePollingInterval}ms`,
        timeout: `${effectiveTimeout}ms`,
        config: pollingConfig,
      });

      // 清理之前的轮询
      stopPolling();

      // 重置状态
      setError(null);
      setIsPolling(true);
      setTimeElapsed(0);
      setPollingCount(0);
      setCurrentInterval(effectivePollingInterval);
      startTimeRef.current = Date.now();

      // 立即执行一次状态检查
      pollStatus(genId);

      // 设置渐进式定时轮询
      const setupPolling = () => {
        const interval = getAdaptiveInterval();

        // 如果间隔变化了，重新设置定时器
        if (interval !== currentInterval) {
          console.log(
            `[Polling] [${genId}] Adjusting polling interval to ${interval}ms`
          );
          setCurrentInterval(interval);

          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }

          intervalRef.current = setInterval(() => {
            pollStatus(genId);
            setupPolling(); // 检查是否需要调整间隔
          }, interval);
        }
      };

      // 初始化定时轮询
      intervalRef.current = setInterval(() => {
        pollStatus(genId);
        setupPolling(); // 每次轮询后检查是否需要调整间隔
      }, effectivePollingInterval);

      // 设置时间计时器
      timeElapsedIntervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setTimeElapsed(Date.now() - startTimeRef.current);
        }
      }, 1000);
    },
    [
      generationType,
      effectivePollingInterval,
      effectiveTimeout,
      pollingConfig,
      stopPolling,
      pollStatus,
      getAdaptiveInterval,
      currentInterval,
    ]
  );

  // 监听 generationId 变化
  useEffect(() => {
    if (generationId) {
      startPolling(generationId);
    } else {
      stopPolling();
    }

    // 清理函数
    return () => {
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generationId]);

  return {
    isPolling,
    timeElapsed,
    error,
    pollingCount,
  };
}

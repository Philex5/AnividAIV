import { useState, useEffect, useCallback } from 'react';

interface VideoQuoteParams {
  model_id: string;
  task_subtype?: 'text_to_video' | 'image_to_video' | 'multi_image_to_video';
  duration_seconds?: number;
  resolution?: string;
  mode?: 'std' | 'pro';
  video_mode?: 'standard' | 'start_end_frame' | 'multi_shot';
  multi_shots?: boolean;
  sound?: boolean;
  aspect_ratio?: '1:1' | '9:16' | '16:9';
  reference_image_url?: string;
  reference_image_urls?: string[];
  multi_prompt?: Array<{
    prompt: string;
    duration: number;
  }>;
}

interface VideoQuoteResponse {
  estimated_credits: number;
  explain: string;
}

interface UseVideoQuoteOptions {
  enabled?: boolean;
  debounceMs?: number;
}

export function useVideoQuote(
  params: VideoQuoteParams,
  options: UseVideoQuoteOptions = {}
) {
  const { enabled = true, debounceMs = 500 } = options;
  
  const [data, setData] = useState<VideoQuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuote = useCallback(async (quoteParams: VideoQuoteParams) => {
    if (!quoteParams.model_id || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/anime-video/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quoteParams),
      });

      if (!response.ok) {
        throw new Error(`Quote request failed: ${response.status}`);
      }

      const result: VideoQuoteResponse = await response.json();
      setData(result);
    } catch (err: any) {
      console.error('Failed to fetch video quote:', err);
      setError(err.message || 'Failed to calculate credits');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  // Debounced effect to avoid too frequent API calls
  useEffect(() => {
    if (!enabled || !params.model_id) {
      setData(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      fetchQuote(params);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [
    params.model_id,
    params.duration_seconds,
    params.resolution,
    params.mode,
    params.video_mode,
    params.multi_shots,
    params.sound,
    params.multi_prompt,
    params.aspect_ratio,
    params.task_subtype,
    params.reference_image_url,
    params.reference_image_urls,
    fetchQuote,
    debounceMs,
    enabled,
  ]);

  const refetch = useCallback(() => {
    if (enabled && params.model_id) {
      fetchQuote(params);
    }
  }, [fetchQuote, params, enabled]);

  return {
    data,
    loading,
    error,
    refetch,
    credits: data?.estimated_credits ?? null,
    explain: data?.explain ?? null,
  };
}

import { useState, useEffect } from "react";

interface UseImagePreloadOptions {
  /** Enable/disable preloading */
  enabled?: boolean;
  /** Callback when all images are loaded */
  onLoadComplete?: () => void;
  /** Callback when an image fails to load */
  onError?: (error: Error) => void;
}

interface UseImagePreloadResult {
  /** Whether all images have finished loading */
  allLoaded: boolean;
  /** Number of images currently loaded */
  loadedCount: number;
  /** Total number of images to load */
  totalCount: number;
  /** Loading progress (0-1) */
  progress: number;
}

/**
 * Hook to preload images before displaying them
 * Useful for preventing layout shifts and providing smooth UX
 *
 * @example
 * ```tsx
 * const { allLoaded } = useImagePreload([
 *   'https://example.com/image1.jpg',
 *   'https://example.com/image2.jpg'
 * ]);
 *
 * if (!allLoaded) return <Skeleton />;
 * return <Images />;
 * ```
 */
export function useImagePreload(
  urls: string[],
  options: UseImagePreloadOptions = {}
): UseImagePreloadResult {
  const { enabled = true, onLoadComplete, onError } = options;

  const [loadedCount, setLoadedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!enabled || !urls.length) {
      setTotalCount(0);
      setLoadedCount(0);
      return;
    }

    // Filter out empty URLs
    const validUrls = urls.filter(Boolean);
    setTotalCount(validUrls.length);
    setLoadedCount(0);

    // Track loaded state
    let loaded = 0;

    const markComplete = () => {
      loaded++;
      setLoadedCount(loaded);

      if (loaded === validUrls.length && onLoadComplete) {
        onLoadComplete();
      }
    };

    const imageElements = validUrls.map((url) => {
      const img = new Image();

      const handleLoad = () => {
        markComplete();
      };

      const handleError = () => {
        if (onError) {
          onError(new Error(`Failed to load image: ${url}`));
        }

        // Still mark as completed to prevent waiting forever
        markComplete();
      };

      // Check if already cached/loaded
      if (img.complete) {
        handleLoad();
      } else {
        img.onload = handleLoad;
        img.onerror = handleError;
      }

      // Start loading
      img.src = url;

      return img;
    });

    // Cleanup
    return () => {
      imageElements.forEach((img) => {
        img.onload = null;
        img.onerror = null;
      });
    };
  }, [urls, enabled, onLoadComplete, onError]);

  const progress = totalCount > 0 ? loadedCount / totalCount : 1;
  const allLoaded = loadedCount >= totalCount && totalCount > 0;

  return {
    allLoaded,
    loadedCount,
    totalCount,
    progress,
  };
}

/**
 * Hook to preload a single image
 * Simpler version for single image use cases
 */
export function useSingleImagePreload(
  url: string | undefined,
  options: Omit<UseImagePreloadOptions, "onLoadComplete"> = {}
): { loaded: boolean; error: Error | null } {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { enabled = true, onError } = options;

  useEffect(() => {
    if (!enabled || !url) {
      setLoaded(false);
      setError(null);
      return;
    }

    setLoaded(false);
    setError(null);

    const img = new Image();

    const handleLoad = () => {
      setLoaded(true);
    };

    const handleError = () => {
      const err = new Error(`Failed to load image: ${url}`);
      setError(err);
      onError?.(err);
    };

    if (img.complete) {
      handleLoad();
    } else {
      img.onload = handleLoad;
      img.onerror = handleError;
    }

    img.src = url;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [url, enabled, onError]);

  return { loaded, error };
}

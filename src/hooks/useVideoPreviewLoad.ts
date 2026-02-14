import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface UseVideoPreviewLoadOptions {
  enabled?: boolean;
  sources?: Array<string | null | undefined>;
  identity?: string | number;
  rootMargin?: string;
  threshold?: number;
}

function mapVideoErrorMessage(error: MediaError | null): string {
  if (!error) {
    return "Failed to load video";
  }

  switch (error.code) {
    case MediaError.MEDIA_ERR_ABORTED:
      return "Video loading was aborted";
    case MediaError.MEDIA_ERR_NETWORK:
      return "Network error occurred";
    case MediaError.MEDIA_ERR_DECODE:
      return "Video decoding failed";
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return "Video format not supported";
    default:
      return "Unknown video error";
  }
}

export function useVideoPreviewLoad({
  enabled = true,
  sources = [],
  identity,
  rootMargin = "300px 0px",
  threshold = 0.01,
}: UseVideoPreviewLoadOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pendingCanPlayHandler = useRef<((event: Event) => void) | null>(null);

  const validSources = useMemo(
    () => sources.filter((item): item is string => Boolean(item && item.trim())),
    [sources],
  );

  const hasSource = enabled && validSources.length > 0;

  const [isInView, setIsInView] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isLoading, setIsLoading] = useState(hasSource);
  const [isReady, setIsReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [isLoadRequested, setIsLoadRequested] = useState(false);

  const clearPendingCanPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || !pendingCanPlayHandler.current) {
      return;
    }

    video.removeEventListener("canplay", pendingCanPlayHandler.current);
    pendingCanPlayHandler.current = null;
  }, []);

  const stopPreview = useCallback(() => {
    if (!hasSource) {
      return;
    }

    const video = videoRef.current;
    if (!video) {
      return;
    }

    clearPendingCanPlay();
    video.pause();

    try {
      video.currentTime = 0;
    } catch {
      // ignore seek errors
    }

    setIsPreviewing(false);
  }, [clearPendingCanPlay, hasSource]);

  const startPreview = useCallback(() => {
    if (!hasSource || errorMessage) {
      return;
    }

    const video = videoRef.current;
    if (!video) {
      return;
    }

    setIsLoadRequested(true);

    const play = () => {
      setIsPreviewing(true);
      void video.play().catch(() => {
        setIsPreviewing(false);
      });
    };

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      play();
      return;
    }

    clearPendingCanPlay();

    const handleCanPlay = () => {
      video.removeEventListener("canplay", handleCanPlay);
      pendingCanPlayHandler.current = null;
      play();
    };

    pendingCanPlayHandler.current = handleCanPlay;
    video.addEventListener("canplay", handleCanPlay);
  }, [clearPendingCanPlay, errorMessage, hasSource]);

  const retryLoad = useCallback(() => {
    if (!hasSource) {
      return;
    }

    const video = videoRef.current;
    if (!video) {
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    setIsReady(false);
    setIsLoadRequested(true);
    video.load();
  }, [hasSource]);

  useEffect(() => {
    setIsInView(false);
    setIsPreviewing(false);
    setIsReady(false);
    setAspectRatio(null);
    setErrorMessage(null);
    setIsLoadRequested(false);
    setIsLoading(hasSource);

    const video = videoRef.current;
    if (video) {
      video.pause();
      try {
        video.currentTime = 0;
      } catch {
        // ignore seek errors
      }
    }
  }, [hasSource, identity, validSources]);

  useEffect(() => {
    if (!hasSource) {
      return;
    }

    const element = containerRef.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsInView(true);
          setIsLoadRequested(true);
          observer.disconnect();
        }
      },
      {
        rootMargin,
        threshold,
      },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [hasSource, identity, rootMargin, threshold]);

  useEffect(() => {
    if (!hasSource) {
      return;
    }

    const video = videoRef.current;
    if (!video) {
      return;
    }

    const handleLoadStart = () => {
      setIsLoading(true);
      setErrorMessage(null);
    };

    const handleLoadedMetadata = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setAspectRatio(video.videoWidth / video.videoHeight);
      }
    };

    const handleLoadedData = () => {
      setIsLoading(false);
      setIsReady(true);
      setErrorMessage(null);

      if (!isPreviewing) {
        video.pause();
        try {
          video.currentTime = 0;
        } catch {
          // ignore seek errors
        }
      }
    };

    const handleError = () => {
      setIsLoading(false);
      setIsReady(false);
      setIsPreviewing(false);
      setErrorMessage(mapVideoErrorMessage(video.error));
    };

    const handleEnded = () => {
      video.pause();
      try {
        video.currentTime = 0;
      } catch {
        // ignore seek errors
      }
      setIsPreviewing(false);
    };

    video.addEventListener("loadstart", handleLoadStart);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("error", handleError);
    video.addEventListener("ended", handleEnded);

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      handleLoadedMetadata();
    }
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      handleLoadedData();
    }

    return () => {
      clearPendingCanPlay();
      video.removeEventListener("loadstart", handleLoadStart);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("error", handleError);
      video.removeEventListener("ended", handleEnded);
    };
  }, [clearPendingCanPlay, hasSource, identity, isPreviewing]);

  const shouldLoadMetadata =
    hasSource && (isLoadRequested || isPreviewing || isInView);

  useEffect(() => {
    if (!shouldLoadMetadata) {
      return;
    }

    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.load();
  }, [shouldLoadMetadata, validSources]);

  useEffect(() => {
    return () => {
      clearPendingCanPlay();
    };
  }, [clearPendingCanPlay]);

  return {
    containerRef,
    videoRef,
    validSources,
    hasSource,
    isInView,
    shouldLoadMetadata,
    isLoading,
    isReady,
    isPreviewing,
    errorMessage,
    aspectRatio,
    startPreview,
    stopPreview,
    retryLoad,
  };
}

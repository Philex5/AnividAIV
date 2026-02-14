import { useCallback, useEffect, useRef, useState } from "react"

interface UseVideoThumbnailOptions {
  timeOffset?: number
  quality?: number
  width?: number
  height?: number
}

interface UseVideoThumbnailReturn {
  thumbnailUrl: string | null
  isLoading: boolean
  error: string | null
  generateThumbnail: () => void
}

export function useVideoThumbnail(
  videoElement: HTMLVideoElement | null,
  options: UseVideoThumbnailOptions = {}
): UseVideoThumbnailReturn {
  const {
    timeOffset = 0.1,
    quality = 0.8,
    width = 320,
    height = 180
  } = options

  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const generateThumbnail = useCallback(() => {
    if (!videoElement) {
      console.log("Video thumbnail: No video element available")
      setError("Video element not available")
      return
    }

    if (videoElement.readyState < 2) {
      console.log("Video thumbnail: Video not ready, readyState:", videoElement.readyState)
      setError("Video not ready")
      return
    }

    console.log("Video thumbnail: Starting generation...")
    setIsLoading(true)
    setError(null)

    try {
      if (!canvasRef.current) {
        canvasRef.current = document.createElement("canvas")
      }

      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        throw new Error("Cannot get canvas context")
      }

      const videoWidth = videoElement.videoWidth
      const videoHeight = videoElement.videoHeight

      console.log("Video thumbnail: Video dimensions:", videoWidth, "x", videoHeight)

      if (videoWidth === 0 || videoHeight === 0) {
        throw new Error("Invalid video dimensions")
      }

      const aspectRatio = videoWidth / videoHeight
      let targetWidth = width
      let targetHeight = height

      if (aspectRatio > targetWidth / targetHeight) {
        targetHeight = targetWidth / aspectRatio
      } else {
        targetWidth = targetHeight * aspectRatio
      }

      canvas.width = targetWidth
      canvas.height = targetHeight

      ctx.drawImage(videoElement, 0, 0, targetWidth, targetHeight)

      const dataUrl = canvas.toDataURL("image/jpeg", quality)
      console.log("Video thumbnail: Generated successfully")
      setThumbnailUrl(dataUrl)
      setIsLoading(false)
    } catch (err) {
      console.error("Failed to generate thumbnail:", err)
      setError(err instanceof Error ? err.message : "Failed to generate thumbnail")
      setIsLoading(false)
    }
  }, [videoElement, timeOffset, quality, width, height])

  const handleVideoSeek = useCallback(() => {
    generateThumbnail()
  }, [generateThumbnail])

  const handleVideoLoadedData = useCallback(() => {
    if (!videoElement) return

    console.log("Video thumbnail: Video loadeddata event, readyState:", videoElement.readyState)
    
    // Wait a bit for the video to stabilize, then generate thumbnail
    const timer = setTimeout(() => {
      if (videoElement.readyState >= 2) {
        const originalTime = videoElement.currentTime
        videoElement.currentTime = timeOffset

        const onSeeked = () => {
          console.log("Video thumbnail: Video seeked to", timeOffset)
          generateThumbnail()
          videoElement.currentTime = originalTime
          videoElement.removeEventListener("seeked", onSeeked)
        }

        videoElement.addEventListener("seeked", onSeeked)
        
        // Fallback: if seek doesn't trigger, try direct generation
        setTimeout(() => {
          if (videoElement && videoElement.currentTime === timeOffset) {
            generateThumbnail()
          }
        }, 1000)
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [videoElement, timeOffset, generateThumbnail])

  useEffect(() => {
    if (!videoElement) {
      console.log("Video thumbnail: No video element")
      return
    }

    console.log("Video thumbnail: Setting up video element, readyState:", videoElement.readyState)

    if (videoElement.readyState >= 2) {
      console.log("Video thumbnail: Video already loaded, generating thumbnail")
      handleVideoLoadedData()
    } else if (videoElement.readyState >= 1) {
      // Video metadata is loaded, wait for data
      console.log("Video thumbnail: Metadata loaded, waiting for data")
      videoElement.addEventListener("loadeddata", handleVideoLoadedData)
    } else {
      // Video is not loaded yet, wait for metadata first
      console.log("Video thumbnail: Waiting for metadata")
      const handleMetadataLoaded = () => {
        console.log("Video thumbnail: Metadata loaded")
        videoElement.addEventListener("loadeddata", handleVideoLoadedData)
        videoElement.removeEventListener("loadedmetadata", handleMetadataLoaded)
      }
      videoElement.addEventListener("loadedmetadata", handleMetadataLoaded)
    }

    return () => {
      videoElement.removeEventListener("loadeddata", handleVideoLoadedData)
    }
  }, [videoElement, handleVideoLoadedData])

  useEffect(() => {
    return () => {
      if (thumbnailUrl && thumbnailUrl.startsWith("blob:")) {
        URL.revokeObjectURL(thumbnailUrl)
      }
    }
  }, [thumbnailUrl])

  return {
    thumbnailUrl,
    isLoading,
    error,
    generateThumbnail
  }
}
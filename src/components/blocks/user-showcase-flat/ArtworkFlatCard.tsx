"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import type { ArtworkPreview } from "@/types/pages/community";
import { Play } from "lucide-react";
import { useResolvedImageUrl } from "@/hooks/useResolvedImage";
import { displayTypeToApiParam, normalizeToDisplayType } from "@/lib/artwork-types";

interface ArtworkFlatCardProps {
  artwork: ArtworkPreview;
  locale: string;
}

export function ArtworkFlatCard({
  artwork,
  locale,
}: ArtworkFlatCardProps) {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cover = artwork.cover_url || artwork.media_urls?.[0] || "";
  const alt = artwork.title || "Artwork";
  const isOC = artwork.type === "oc" || artwork.type === "character";
  const localePath = locale === "en" ? "" : `/${locale}`;
  const normalizedType = normalizeToDisplayType(artwork.type);
  const apiType = displayTypeToApiParam(normalizedType);
  const detailUrl = `${localePath}/community?artwork=${artwork.id}&artworkType=${apiType}&type=${normalizedType}`;

  const { displayUrl: authorAvatarUrl } = useResolvedImageUrl(artwork.author?.avatar);

  const startPreview = () => {
    if (artwork.type !== "video") return;
    const video = videoRef.current;
    if (!video) return;
    clearTimeout((video as any).previewTimer);
    setIsPreviewing(true);
    void video.play().catch(() => setIsPreviewing(false));
  };

  const stopPreview = () => {
    if (artwork.type !== "video") return;
    const video = videoRef.current;
    if (!video) return;
    clearTimeout((video as any).previewTimer);
    setIsPreviewing(false);
    video.pause();
    try { video.currentTime = 0; } catch {}
  };

  useEffect(() => {
    if (!cover || artwork.type === "video") return;
    const img = new window.Image();
    img.src = cover;
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setAspectRatio(img.naturalWidth / img.naturalHeight);
      }
    };
  }, [cover, artwork.type]);

  useEffect(() => {
    if (artwork.type !== "video") return;
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedData = () => {
      if (video.videoWidth && video.videoHeight) {
        setAspectRatio(video.videoWidth / video.videoHeight);
      }
      video.pause();
      try { video.currentTime = 0; } catch {}
    };

    const handleEnded = () => {
      video.pause();
      try { video.currentTime = 0; } catch {}
      setIsPreviewing(false);
    };

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      handleLoadedData();
    } else {
      video.addEventListener("loadeddata", handleLoadedData);
    }
    video.addEventListener("ended", handleEnded);
    return () => {
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("ended", handleEnded);
    };
  }, [artwork.type]);

  const validMediaUrls = artwork.media_urls?.filter(
    (src) => src && src.trim() && src.startsWith("http")
  ) || [];

  return (
    <Link
      href={detailUrl}
      className="group block relative overflow-hidden rounded-2xl bg-muted/30 border border-border/50 hover:border-primary/50 hover:shadow-[0_20px_40px_rgba(var(--primary-rgb),0.1)] transition-all duration-500"
      onMouseEnter={artwork.type === "video" ? startPreview : undefined}
      onMouseLeave={artwork.type === "video" ? stopPreview : undefined}
    >
      <div
        className={`relative w-full overflow-hidden ${isOC ? 'bg-gradient-to-b from-muted/50 to-muted/80' : ''}`}
        style={{ 
          aspectRatio: aspectRatio || (isOC ? '2/3' : '4/5'),
          minHeight: '200px'
        }}
      >
        {cover || artwork.type === "video" ? (
          <>
            {artwork.type === "video" && validMediaUrls.length > 0 ? (
              <video
                ref={videoRef}
                preload="metadata"
                muted
                playsInline
                loop={false}
                poster={cover || undefined}
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
              >
                {validMediaUrls.map((src, index) => (
                  <source key={`${src}-${index}`} src={src} />
                ))}
              </video>
            ) : (
              <img
                src={cover}
                alt={alt}
                className={`w-full h-full ${isOC ? 'object-contain px-4 py-6' : 'object-cover'} transition-transform duration-1000 group-hover:scale-110`}
                loading="lazy"
              />
            )}

            {/* Flat Badge */}
            {artwork.gen_type && (
              <div className="absolute top-3 right-3 z-20">
                <span className="inline-flex items-center rounded-full bg-black/50 backdrop-blur-md text-white text-[10px] px-3 py-1 font-black uppercase tracking-wider border border-white/10 shadow-sm">
                  {artwork.gen_type.replace(/_/g, " ")}
                </span>
              </div>
            )}

             {/* Hover info (Enhanced for larger size) */}
             <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-5 z-10">
                <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                  <div className="flex items-center gap-2">
                    {authorAvatarUrl ? (
                      <img 
                        src={authorAvatarUrl} 
                        alt={artwork.author?.name || "Avatar"} 
                        className="w-6 h-6 rounded-full object-cover border border-white/20 shadow-sm"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-[10px] text-white/70 font-black">
                        {artwork.author?.name?.charAt(0).toUpperCase() || "A"}
                      </div>
                    )}
                    <p className="text-white text-xs font-black tracking-tight drop-shadow-sm">@{artwork.author?.name || "Anonymous"}</p>
                  </div>
                </div>
             </div>

            {artwork.type === "video" && !isPreviewing && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-80 group-hover:opacity-0 transition-opacity z-20">
                 <div className="bg-black/40 backdrop-blur-md rounded-full p-2 border border-white/10">
                   <Play className="w-4 h-4 text-white fill-white" />
                 </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex w-full h-full items-center justify-center text-xs text-muted-foreground p-4 text-center">
            {alt}
          </div>
        )}
      </div>
    </Link>
  );
}

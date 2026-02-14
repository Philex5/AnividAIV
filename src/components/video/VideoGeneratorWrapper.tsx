"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { VideoGeneratorSkeleton } from "./VideoGeneratorSkeleton";
import type { AnimeGeneratorPage } from "@/types/pages/landing";

// 动态导入 VideoGenerator 组件，禁用 SSR 优化首次内容绘制
const VideoGenerator = dynamic(
  () => import("./VideoGenerator").then(mod => ({ default: mod.VideoGenerator })),
  {
    ssr: false,
    loading: () => <VideoGeneratorSkeleton />
  }
);

interface VideoGeneratorWrapperProps {
  pageData: AnimeGeneratorPage;
  genVideoId?: string;
  characterUuid?: string;
  refImageUrl?: string;
  isLoggedIn?: boolean;
  initialCanUsePrivate?: boolean;
  className?: string;
}

export function VideoGeneratorWrapper({
  pageData,
  genVideoId,
  characterUuid,
  refImageUrl,
  isLoggedIn = false,
  initialCanUsePrivate = false,
  className = "",
}: VideoGeneratorWrapperProps) {
  return (
    <Suspense fallback={<VideoGeneratorSkeleton />}>
      <VideoGenerator
        pageData={pageData}
        genVideoId={genVideoId}
        characterUuid={characterUuid}
        refImageUrl={refImageUrl}
        isLoggedIn={isLoggedIn}
        initialCanUsePrivate={initialCanUsePrivate}
        className={className}
      />
    </Suspense>
  );
}

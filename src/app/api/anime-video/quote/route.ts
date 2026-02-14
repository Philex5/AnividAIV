import { NextRequest } from "next/server";
import { VideoAIProvider } from "@/services/generation/providers/video-ai-provider";
import type { VideoGenerationParams } from "@/types/video-provider";

interface QuoteRequest {
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

interface QuoteResponse {
  estimated_credits: number;
  explain: string;
}

type SupportedResolution =
  | "480p"
  | "580p"
  | "720p"
  | "768p"
  | "1080p"
  | "2k"
  | "4k";

/**
 * 视频生成费用预估接口
 * 仅计算预估费用，不实际扣费或创建任务
 */
export async function POST(request: NextRequest) {
  try {
    const body: QuoteRequest = await request.json();
    const {
      model_id,
      task_subtype,
      duration_seconds,
      resolution,
      mode,
      video_mode,
      multi_shots,
      sound,
      aspect_ratio,
      reference_image_url,
      reference_image_urls,
      multi_prompt,
    } = body;

    if (!model_id) {
      return Response.json(
        { error: "Missing required field: model_id" },
        { status: 400 }
      );
    }

    // 构建参数用于计费计算
    const videoParams: VideoGenerationParams = {
      prompt: "dummy prompt for quote calculation", // Quote只计算费用，不需要实际prompt
      model_name: model_id,
      task_subtype: task_subtype || "text_to_video",
      duration_seconds: duration_seconds || 5,
      quality: mapResolutionToQuality(resolution),
      resolution: normalizeResolution(resolution), // 直接传递分辨率值，供需要精确分辨率的模型使用
      mode,
      video_mode,
      multi_shots,
      sound,
      multi_prompt,
      aspect_ratio: aspect_ratio || "16:9",
      reference_image_urls:
        reference_image_urls && reference_image_urls.length > 0
          ? reference_image_urls
          : reference_image_url
            ? [reference_image_url]
            : undefined,
    };

    // 使用VideoAIProvider计算费用（单例模式）
    const videoProvider = VideoAIProvider.getInstance();
    const estimatedCredits = await videoProvider.calculateVideoCredits(videoParams);

    // 生成说明
    const explain = generateExplanation(videoParams, estimatedCredits);

    const response: QuoteResponse = {
      estimated_credits: estimatedCredits,
      explain: explain,
    };

    return Response.json(response);

  } catch (error) {
    console.error("[video-quote] Failed to calculate video quote:", error);
    
    return Response.json(
      { 
        error: "Failed to calculate video quote",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

/**
 * 分辨率映射到质量等级
 */
function mapResolutionToQuality(resolution?: string): "standard" | "high" {
  if (!resolution) return "standard";
  
  // 支持数字格式（如 720, 1080）和字符串格式（如 "720p", "1080p"）
  if (typeof resolution === 'string') {
    const normalizedRes = resolution.toLowerCase();
    if (normalizedRes.includes('1080') || normalizedRes === 'high') {
      return 'high';
    }
    if (normalizedRes.includes('720') || normalizedRes === 'standard') {
      return 'standard';
    }
  }
  
  // 兼容数字格式
  const resolutionNum = parseInt(resolution);
  if (!isNaN(resolutionNum)) {
    return resolutionNum >= 1080 ? 'high' : 'standard';
  }
  
  return 'standard';
}

function normalizeResolution(resolution?: string): SupportedResolution | undefined {
  if (!resolution) return undefined;

  const normalized = resolution.toLowerCase();
  const supported: SupportedResolution[] = [
    "480p",
    "580p",
    "720p",
    "768p",
    "1080p",
    "2k",
    "4k",
  ];

  return supported.includes(normalized as SupportedResolution)
    ? (normalized as SupportedResolution)
    : undefined;
}

/**
 * 生成费用说明
 */
function generateExplanation(params: VideoGenerationParams, credits: number): string {
  const { model_name, task_subtype, duration_seconds, quality } = params;
  
  let explanation = `${model_name} model`;
  
  if (task_subtype === 'image_to_video') {
    explanation += ' (image-to-video)';
  } else {
    explanation += ' (text-to-video)';
  }
  
  if (duration_seconds) {
    explanation += `, ${duration_seconds}s duration`;
  }
  
  if (quality) {
    explanation += `, ${quality} quality`;
  }
  
  explanation += ` = ${credits} credits`;
  
  return explanation;
}

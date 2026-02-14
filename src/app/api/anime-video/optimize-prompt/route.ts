import { NextRequest } from "next/server";
import { getUserUuid } from "@/services/user";
import { buildVideoOptimizationPrompt } from "@/lib/video-prompt-optimizer";
import { generateTextWithFallback } from "@/services/llm/llm-service";
import { z } from "zod";

// 请求参数验证
const OptimizePromptSchema = z.object({
  prompt: z
    .string()
    .min(1, "Prompt cannot be empty")
    .max(20000, "Prompt length cannot exceed 20000 characters"),
});

export async function POST(request: NextRequest) {
  try {
    // 检查用户登录状态
    const userUuid = await getUserUuid();
    if (!userUuid) {
      return Response.json(
        { success: false, error: "User not authenticated" },
        { status: 401 }
      );
    }

    // 解析请求参数
    const body = await request.json();
    const validatedData = OptimizePromptSchema.parse(body);

    // 构建优化请求的 prompt（用于 LLM）
    const optimizationPrompt = buildVideoOptimizationPrompt({
      original_prompt: validatedData.prompt,
    });

    // 调用小静AI进行prompt优化
    let optimizedPrompt = "";
    let improvements: string[] = [];

    try {
      const { text } = await generateTextWithFallback({
        model: "gpt-3.5-turbo",
        system: optimizationPrompt.system,
        prompt: optimizationPrompt.user,
        temperature: 0.7,
        provider: "xiaojing",
        scenario: "anime_video_optimize_prompt",
      });

      optimizedPrompt = text.trim();

      // 分析改进点
      improvements = [
        "Enhanced scene description for video",
        "Improved motion and camera details",
        "Added anime-specific visual elements",
        "Optimized prompt structure for video generation",
      ];
    } catch (error) {
      console.error("LLM optimization failed:", error);
      // 如果LLM调用失败，回退到简单优化
      optimizedPrompt = `${validatedData.prompt}, anime cinematic, high quality, detailed lighting, vivid colors`;
      improvements = [
        "Added basic quality enhancement terms for video",
        "Applied fallback optimization",
      ];
    }

    return Response.json({
      success: true,
      data: {
        original_prompt: validatedData.prompt,
        optimized_prompt: optimizedPrompt,
        improvements: improvements,
      },
    });
  } catch (error: any) {
    console.error("Video prompt optimization failed:", error);

    // 处理Zod验证错误
    if (error.name === "ZodError") {
      return Response.json(
        {
          error: "Request parameter validation failed",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return Response.json(
      { error: error.message || "Video prompt optimization failed" },
      { status: 500 }
    );
  }
}

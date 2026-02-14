import { NextRequest } from "next/server";
import { generationServiceFactory } from "@/services/generation/factory/generation-service-factory";
import { findGenerationByUuid } from "@/models/generation";
import { getUserUuid } from "@/services/user";

interface FailureRequest {
  generation_uuid: string;
  reason: string;
  error_type: 'polling_error' | 'polling_timeout' | 'network_error';
}

/**
 * 统一处理生成失败的API端点
 * 处理轮询超时、状态码错误、网络错误等场景
 * 确保积分只返还一次，避免与webhook冲突
 * 通过GenerationServiceFactory路由到正确的服务类型
 */
export async function POST(request: NextRequest) {
  try {
    const body: FailureRequest = await request.json();
    const { generation_uuid, reason, error_type } = body;

    if (!generation_uuid || !reason || !error_type) {
      return Response.json(
        { error: "Missing required fields: generation_uuid, reason, error_type" },
        { status: 400 }
      );
    }

    const internalSecret = process.env.INTERNAL_API_SECRET;
    const authHeader = request.headers.get("authorization") || "";
    const bearer = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";

    const isInternalCall = !!internalSecret && bearer === internalSecret;
    const userUuid = isInternalCall ? null : await getUserUuid();

    if (!isInternalCall && !userUuid) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 查询生成记录以确定类型
    const generation = await findGenerationByUuid(generation_uuid);
    if (!generation) {
      return Response.json(
        { error: `Generation not found: ${generation_uuid}` },
        { status: 404 }
      );
    }

    if (!isInternalCall && generation.user_uuid !== userUuid) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log("[handle-failure] Processing failure", {
      generation_uuid,
      error_type,
    });

    // 通过工厂获取正确的服务
    const service = generationServiceFactory.resolveServiceByStoredType(
      generation.type,
      generation.sub_type ?? undefined
    );
    
    // 调用安全的失败处理方法
    await (service as any).safeHandlePollingFailure(generation_uuid, reason, error_type);

    return Response.json({ success: true, message: "Failure handled successfully" });

  } catch (error) {
    console.error("[handle-failure] Failed to handle generation failure:", error);
    
    return Response.json(
      { 
        error: "Failed to handle generation failure",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

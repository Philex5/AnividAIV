import { NextRequest } from "next/server";
import { handleWebhookCallback } from "@/services/generation/factory/generation-service-factory";
import {
  findGenerationByRemoteTaskId,
  findGenerationByWebhookToken,
  updateGeneration,
} from "@/models/generation";
import {
  maskUrlForLog,
  truncateForLog,
} from "@/services/generation/webhook/webhook-security";

// Force Node.js runtime for Sharp image processing (avatar generation in webhook)
export const runtime = "nodejs";

// KieAI Webhook payload types
interface GPT4oWebhookPayload {
  code: number;
  msg?: string;
  data?: {
    taskId: string;
    info?: {
      result_urls?: string[];
    };
  };
}

interface NanoBananaWebhookPayload {
  code: number;
  msg?: string;
  data?: {
    taskId: string;
    state: string;
    resultJson?: string;
    failMsg?: string;
    failCode?: string;
    model?: string;
  };
}

type WebhookPayload = GPT4oWebhookPayload | NanoBananaWebhookPayload;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let taskId: string | undefined;

  try {
    const rawBody = await request.text();
    const payload: WebhookPayload = JSON.parse(rawBody);

    if (!payload.data?.taskId) {
      return Response.json(
        { error: "Missing taskId in webhook payload" },
        { status: 400 }
      );
    }

    taskId = payload.data.taskId;

    const providedToken = request.nextUrl.searchParams.get("token") || undefined;
    let generation = await findGenerationByRemoteTaskId(taskId);

    if (!generation && providedToken) {
      generation = await findGenerationByWebhookToken(providedToken);
      if (generation?.uuid) {
        await updateGeneration(generation.uuid, { remote_task_id: taskId });
      }
    }

    if (!generation) {
      return Response.json({ error: "Generation not found" }, { status: 404 });
    }

    const expectedToken = (generation as any)?.metadata?.webhook_token as
      | string
      | undefined;

    if (!expectedToken || !providedToken || expectedToken !== providedToken) {
      console.warn("[Webhook] Unauthorized webhook request", {
        taskId,
        has_expected_token: !!expectedToken,
        has_provided_token: !!providedToken,
      });
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let state: "success" | "fail";
    let resultUrls: string[] | undefined;
    let failMsg: string | undefined;

    if ("state" in payload.data) {
      // Nano Banana callback
      state = payload.data.state === "success" ? "success" : "fail";

      if (state === "success" && payload.data.resultJson) {
        try {
          const resultObj = JSON.parse(payload.data.resultJson);
          resultUrls = Array.isArray(resultObj.resultUrls)
            ? resultObj.resultUrls.filter((url: any) => typeof url === "string")
            : [];
        } catch (error) {
          console.error("[Webhook] Failed to parse resultJson", {
            taskId,
            error: (error as any)?.message || error,
          });
        }
      }

      failMsg = payload.data.failMsg;
    } else {
      // GPT4o callback
      if (payload.code === 200 && payload.data.info?.result_urls) {
        state = "success";
        resultUrls = Array.isArray(payload.data.info.result_urls)
          ? payload.data.info.result_urls.filter((url: any) => typeof url === "string")
          : [];
      } else {
        state = "fail";
        failMsg = payload.msg || "Generation failed";
      }
    }

    if (state === "success" && (!resultUrls || resultUrls.length === 0)) {
      return Response.json(
        { error: "Missing or invalid resultUrls for success state" },
        { status: 400 }
      );
    }

    if (state === "success" && resultUrls?.length) {
      console.info("[Webhook] Accepted success callback", {
        taskId,
        urls_count: resultUrls.length,
        url_sample: maskUrlForLog(resultUrls[0]!),
      });
    } else if (state === "fail") {
      console.info("[Webhook] Accepted failed callback", {
        taskId,
        fail_msg: truncateForLog(failMsg || ""),
      });
    }

    await handleWebhookCallback(taskId, state, resultUrls, failMsg);

    const responseTime = Date.now() - startTime;

    return Response.json(
      {
        status: "accepted",
        taskId,
        state,
        responseTime,
        message: "Webhook processed successfully",
        urls_count: resultUrls?.length || 0,
      },
      { status: 200 }
    );
  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    console.error("[Webhook] Processing failed", {
      taskId,
      error: error?.message || String(error),
      response_time: `${responseTime}ms`,
    });

    return Response.json(
      {
        error: error?.message || "Webhook processing failed",
      },
      { status: 500 }
    );
  }
}

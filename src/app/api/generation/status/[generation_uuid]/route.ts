import { NextRequest } from "next/server";
import { getGenerationStatus } from "@/services/generation";
import { getUserUuid } from "@/services/user";
import { findGenerationByUuid } from "@/models/generation";
import { respData, respErr } from "@/lib/resp";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ generation_uuid: string }> }
) {
  try {
    // Check user authentication
    const userUuid = await getUserUuid();
    if (!userUuid) {
      return respErr("User not authenticated", 401);
    }

    const resolvedParams = await params;
    const generation_uuid = resolvedParams.generation_uuid;

    // Find generation record
    const generation = await findGenerationByUuid(generation_uuid);
    if (!generation) {
      return respErr("Generation not found", 404);
    }

    // Verify generation belongs to current user
    if (generation.user_uuid !== userUuid) {
      return respErr("Access denied", 403);
    }

    // Get generation status (read-only, no database writes)
    const status = await getGenerationStatus(generation_uuid);
    if (!status) {
      return respErr("Failed to get generation status", 500);
    }

    // Build response
    const result: any = {
      uuid: status.uuid,
      status: status.status,
      progress: status.progress,
      results: status.results,
      error_message: status.error_message,
      created_at: status.created_at || generation.created_at?.toISOString(),
      batch_size: status.batch_size || generation.counts,
      credits_used: status.credits_used || generation.credits_cost,
      message: getStatusMessage(status.status),
      // Add remote task ID if available
      remote_task_id: generation.remote_task_id,
    };

    return respData(result);
  } catch (error: any) {
    console.error("Failed to get generation status:", error);
    return respErr(error.message || "Failed to get status", 500);
  }
}

// Status message mapping
function getStatusMessage(status: string): string {
  const messages: Record<string, string> = {
    pending: "Task created, waiting for processing...",
    processing: "Generating images, please wait...",
    completed: "Generation completed!",
    failed: "Generation failed, please try again",
  };

  return messages[status] || "Unknown status";
}

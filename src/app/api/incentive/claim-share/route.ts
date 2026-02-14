import { respData, respErr } from "@/lib/resp";
import { getUserUuid } from "@/services/user";
import { claimShareReward } from "@/services/incentive";
import { z } from "zod";

const shareMetadataSchema = z.object({
  platform: z.string().max(50).optional(),
  url: z.string().url().max(500).optional(),
  title: z.string().max(200).optional(),
  target_id: z.string().max(100).optional(),
  target_type: z.string().max(50).optional(),
});

function sanitizeShareMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }

  const raw = metadata as Record<string, unknown>;
  const normalized = {
    platform:
      typeof raw.platform === "string" ? raw.platform.slice(0, 50) : undefined,
    url: typeof raw.url === "string" ? raw.url.slice(0, 500) : undefined,
    title: typeof raw.title === "string" ? raw.title.slice(0, 200) : undefined,
    target_id:
      typeof raw.target_id === "string" ? raw.target_id.slice(0, 100) : undefined,
    target_type:
      typeof raw.target_type === "string" ? raw.target_type.slice(0, 50) : undefined,
  };

  const result = shareMetadataSchema.safeParse(normalized);
  if (!result.success) {
    return {};
  }

  return result.data;
}

export async function POST(req: Request) {
  try {
    const userUuid = await getUserUuid();
    if (!userUuid) {
      return respErr("no auth", 401);
    }

    const body = await req.json().catch(() => ({}));
    const { metadata } = body;

    const validatedMetadata = sanitizeShareMetadata(metadata);

    const result = await claimShareReward(userUuid, validatedMetadata);
    if (!result.success) {
      return respErr(result.message || "claim share reward failed");
    }

    return respData(result);
  } catch (e) {
    console.error("claim share reward failed: ", e);
    return respErr("claim share reward failed");
  }
}

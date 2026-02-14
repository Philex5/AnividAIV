import { respData, respErr } from "@/lib/resp";
import { getUserUuid } from "@/services/user";
import { createworld, getworlds } from "@/services/world";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const page = url.searchParams.get("page");
    const limit = url.searchParams.get("limit");
    const visibilityLevel = url.searchParams.get("visibility_level") as
      | "public"
      | "private"
      | null;
    const search = url.searchParams.get("search");
    const creatorUuid = url.searchParams.get("creator_uuid");
    const joinableOnly = url.searchParams.get("joinable_only") === "1";

    const viewerUuid = await getUserUuid();
    const viewer = viewerUuid || undefined;
    if (visibilityLevel === "private" && !viewer) {
      return respErr("User not authenticated", 401);
    }

    const result = await getworlds({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      visibility_level: visibilityLevel || undefined,
      search: search || undefined,
      creatorUuid: creatorUuid || undefined,
      viewerUuid: viewer,
      includePreset: true,
      joinableOnly,
    });

    return respData(result);
  } catch (error: any) {
    return respErr(error?.message || "Failed to get worlds", 500);
  }
}

export async function POST(req: Request) {
  try {
    const userUuid = await getUserUuid();
    if (!userUuid) return respErr("User not authenticated", 401);

    const body = await req.json();
    const created = await createworld(body, userUuid);
    return respData(created);
  } catch (error: any) {
    const code = error?.code;
    if (code === "CONFLICT") return respErr(error.message || "Conflict", 409);
    if (code === "FORBIDDEN") return respErr(error.message || "Forbidden", 403);
    if (code === "SUBSCRIPTION_REQUIRED")
      return respErr(error.message || "Subscription required", 403);
    if (code === "LIMIT_EXCEEDED") return respErr(error.message || "Limit exceeded", 402);
    if (code === "INVALID_URL" || code === "INVALID_NAME")
      return respErr(error.message || "Invalid input", 400);
    if (error?.name === "ZodError")
      return respErr("Request parameter validation failed", 400);
    return respErr(error?.message || "Failed to create world", 500);
  }
}

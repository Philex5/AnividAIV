import { respData, respErr } from "@/lib/resp";
import { unauthorizedResponse, verifyAdminAccess } from "@/lib/admin-auth";
import { syncAdminEmailLogsFromResend } from "@/services/admin/email";

export async function POST(request: Request) {
  const authResult = await verifyAdminAccess(request);
  if (!authResult.authenticated) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json().catch(() => ({}));

    const uuidsRaw = body?.uuids;
    const limitRaw = body?.limit;

    const uuids = Array.isArray(uuidsRaw)
      ? uuidsRaw.filter((item) => typeof item === "string")
      : undefined;
    const limit =
      typeof limitRaw === "number" && Number.isFinite(limitRaw)
        ? limitRaw
        : undefined;

    const result = await syncAdminEmailLogsFromResend({
      uuids,
      limit,
    });

    return respData(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to sync email logs";
    return respErr(message);
  }
}

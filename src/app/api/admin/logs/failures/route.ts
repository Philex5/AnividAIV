import { respData, respErr } from "@/lib/resp";
import { listFailedGenerations } from "@/services/admin";
import { verifyAdminAccess, unauthorizedResponse } from '@/lib/admin-auth';

export async function GET(req: Request) {
  // Verify admin access (Bearer Token OR session)
  const authResult = await verifyAdminAccess(req);
  if (!authResult.authenticated) {
    return unauthorizedResponse();
  }

  try {
    console.log(`🔐 [Admin-Logs] Authenticated via: ${authResult.method}`);
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const list = await listFailedGenerations({ limit });
    return respData({ items: list });
  } catch (e: any) {
    return respErr(e?.message || "failed to list failures");
  }
}


import { NextRequest } from "next/server";
import { listAllGenerationsWithPagination } from "@/services/admin-generations";
import { verifyAdminAccess, unauthorizedResponse } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  // Verify admin access (Bearer Token OR session)
  const authResult = await verifyAdminAccess(request);
  if (!authResult.authenticated) {
    return unauthorizedResponse();
  }

  try {
    console.log(`🔐 [Admin-Generations] Authenticated via: ${authResult.method}`);

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const type = searchParams.get("type") || "all";
    const genType = searchParams.get("genType") || "all";
    const userId = searchParams.get("userId") || undefined;
    const dateRange = searchParams.get("dateRange") || "30d";
    const search = searchParams.get("search") || undefined;
    const artworkUuid = searchParams.get("artworkUuid") || undefined;
    const moderationStatus = searchParams.get("moderationStatus") || "all";

    // Calculate start date based on dateRange
    const startDate = new Date();
    if (dateRange === "7d") {
      startDate.setDate(startDate.getDate() - 7);
    } else if (dateRange === "30d") {
      startDate.setDate(startDate.getDate() - 30);
    } else if (dateRange === "90d") {
      startDate.setDate(startDate.getDate() - 90);
    } else if (dateRange !== "all") {
      startDate.setDate(startDate.getDate() - 30);
    }

    const result = await listAllGenerationsWithPagination({
      page,
      limit,
      type,
      genType,
      userId,
      startDate: dateRange !== "all" ? startDate.toISOString() : undefined,
      search: search || undefined,
      artworkUuid,
      moderationStatus,
    });

    return Response.json({
      code: 0,
      data: result,
    });
  } catch (error: any) {
    console.error("Admin generations API error:", error);
    console.error("Stack trace:", error.stack);
    return Response.json(
      { code: -1, message: error.message || "Internal server error", stack: error.stack },
      { status: 500 }
    );
  }
}

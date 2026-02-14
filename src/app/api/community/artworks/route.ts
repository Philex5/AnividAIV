import { respData, respErr } from "@/lib/resp";
import { getCommunityList } from "@/services/community";
import { normalizeGenTypes } from "@/configs/gen-type-display";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") || "all") as any;
    const sort = (searchParams.get("sort") || "trending") as any;
    const q = searchParams.get("q");
    const genTypesRaw = searchParams.get("gen_types");
    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "24", 10);
    const genTypes = normalizeGenTypes(genTypesRaw?.split(","));

    const { items, nextCursor } = await getCommunityList({
      type,
      sort,
      q,
      gen_types: genTypes,
      cursor,
      limit,
    });

    return respData({ items, nextCursor });
  } catch (error) {
    console.error("Community list failed:", error);
    return respErr("Failed to fetch artworks", 500);
  }
}

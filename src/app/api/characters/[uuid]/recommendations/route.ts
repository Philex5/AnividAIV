import { NextRequest, NextResponse } from "next/server";
import { getCharacterRecommendations } from "@/services/character-recommendation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid } = await params;
    const searchParams = request.nextUrl.searchParams;

    const limitParam = searchParams.get("limit");
    const parsedLimit = limitParam ? parseInt(limitParam, 10) : undefined;
    const limit =
      parsedLimit && parsedLimit > 0 && parsedLimit <= 50
        ? parsedLimit
        : undefined;
    const style = searchParams.get("style");
    const species = searchParams.get("species");

    // Get recommendations with 3-tier priority: same author > same theme > popular
    const result = await getCharacterRecommendations(uuid, {
      limit,
      style,
      species,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "Character not found" ? 404 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("Error in recommendations API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

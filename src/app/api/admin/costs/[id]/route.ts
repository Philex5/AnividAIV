import { NextRequest } from "next/server";
import { requireAdmin } from "@/services/admin";
import { updateOperationCost, deleteOperationCost } from "@/models/operation-cost";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return Response.json(
        { error: "Invalid cost ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { platform, amount, currency, note } = body;

    if (!platform || amount === undefined || !currency) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const updated = await updateOperationCost(id, {
      platform,
      amount,
      currency,
      note: note || null,
    });

    if (!updated) {
      return Response.json(
        { error: "Cost not found" },
        { status: 404 }
      );
    }

    return Response.json({
      data: updated,
    });
  } catch (error: any) {
    console.error("Update cost error:", error);
    return Response.json(
      { error: error.message || "Failed to update cost" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return Response.json(
        { error: "Invalid cost ID" },
        { status: 400 }
      );
    }

    await deleteOperationCost(id);

    return Response.json({
      success: true,
    });
  } catch (error: any) {
    console.error("Delete cost error:", error);
    return Response.json(
      { error: error.message || "Failed to delete cost" },
      { status: 500 }
    );
  }
}

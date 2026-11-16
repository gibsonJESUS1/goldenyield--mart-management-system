import { NextResponse } from "next/server";
import { deleteExpense } from "@/lib/db/expenses";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await deleteExpense(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/expenses/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete expense." },
      { status: 500 },
    );
  }
}

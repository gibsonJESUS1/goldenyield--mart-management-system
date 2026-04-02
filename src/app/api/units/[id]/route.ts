import { NextResponse } from "next/server";
import { updateUnit } from "@/lib/db/unit";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const body = await req.json();
  const { id } = await params;

  if (!body.name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const unit = await updateUnit(id, body.name, body.symbol);

  return NextResponse.json(unit);
}

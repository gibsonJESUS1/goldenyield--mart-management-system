import { NextResponse } from "next/server";
import { updateOwner } from "@/lib/db/owner";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const body = await req.json();
  const { id } = await params;

  if (!body.name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const owner = await updateOwner(id, body.name, body.role);

  return NextResponse.json(owner);
}

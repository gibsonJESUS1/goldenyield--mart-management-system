import { NextResponse } from "next/server";
import { createOwner, getOwners } from "@/lib/db/owner";

export async function GET() {
  const owners = await getOwners();
  return NextResponse.json(owners);
}

export async function POST(req: Request) {
  const body = await req.json();

  if (!body.name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const owner = await createOwner(body.name, body.role);

  return NextResponse.json(owner, { status: 201 });
}

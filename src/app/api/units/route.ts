import { NextResponse } from "next/server";
import { createUnit, getUnits } from "@/lib/db/unit";

export async function GET() {
  const units = await getUnits();
  return NextResponse.json(units);
}

export async function POST(req: Request) {
  const body = await req.json();

  if (!body.name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const unit = await createUnit(body.name, body.symbol);

  return NextResponse.json(unit, { status: 201 });
}

import { NextResponse } from "next/server";
import { createCategory, getCategories } from "@/lib/db/category";

export async function GET() {
  const categories = await getCategories();
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const body = await req.json();

  if (!body.name || !body.slug) {
    return NextResponse.json(
      { error: "Name and slug are required" },
      { status: 400 },
    );
  }

  const category = await createCategory(body.name, body.slug, body.description);

  return NextResponse.json(category, { status: 201 });
}

import { NextResponse } from "next/server";
import { MODEL_OPTIONS } from "@/lib/llm/models";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ models: MODEL_OPTIONS });
}

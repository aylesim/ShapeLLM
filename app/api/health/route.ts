import { NextResponse } from "next/server";
import { MODEL_OPTIONS } from "@/lib/llm/models";
import { PROMPT_VERSION, hasServerKey, resolveProvider } from "@/lib/llm/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    live: hasServerKey(),
    provider: resolveProvider(),
    promptVersion: PROMPT_VERSION,
    models: MODEL_OPTIONS,
  });
}

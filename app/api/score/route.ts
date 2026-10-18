import { NextResponse } from "next/server";
import { z } from "zod";
import { LlmError, scoreWithLlm } from "@/lib/llm/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const RequestSchema = z.object({
  text: z.string().min(1).max(6000),
  mode: z.enum(["single", "reading"]).default("single"),
  provider: z.enum(["openai", "openrouter"]).optional(),
  model: z.string().max(120).optional(),
  apiKey: z.string().max(400).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body.", code: "INVALID_BODY" },
      { status: 400 },
    );
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid request.",
        code: "INVALID_REQUEST",
      },
      { status: 400 },
    );
  }

  try {
    const result = await scoreWithLlm({
      text: parsed.data.text,
      mode: parsed.data.mode,
      provider: parsed.data.provider,
      model: parsed.data.model,
      apiKey: parsed.data.apiKey,
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof LlmError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The reading failed for an unknown reason.",
        code: "READING_FAILED",
      },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { createOpenAiClient, resolveLlmModel } from "@/lib/openai-server";
import { parseLlmProvider } from "@/lib/llm-provider";

const requestSchema = z.object({
  text: z.string().min(1).max(4000),
  openAiApiKey: z.string().optional(),
  llmProvider: z.enum(["openai", "openrouter"]).optional(),
  llmModel: z.string().optional(),
});

const responseSchema = z.object({
  angry: z.number().min(0).max(1),
});

const SYSTEM_PROMPT = `You score how angry a piece of text feels.

Return ONLY valid JSON with one field:
{ "angry": <number> }

Rules:
- angry is a float from 0.0 to 1.0
- 0.0 = completely calm, neutral, peaceful, no anger
- 1.0 = extremely angry — furious, hostile, aggressive, enraged tone
- Use the full range when warranted
- Empty or neutral text should be near 0
- Consider word choice, punctuation, capitalization, frustration, threats, insults, impatience`;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const { text, openAiApiKey, llmModel } = parsed.data;
  const provider = parseLlmProvider(parsed.data.llmProvider) ?? "openai";

  let client;
  try {
    client = createOpenAiClient({ apiKey: openAiApiKey, provider });
  } catch (err) {
    const message = err instanceof Error ? err.message : "API key missing";
    return NextResponse.json(
      { error: message, code: "MISSING_API_KEY" },
      { status: 401 },
    );
  }

  const model = resolveLlmModel(provider, llmModel);

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) {
      return NextResponse.json({ error: "Empty LLM response" }, { status: 502 });
    }

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "LLM returned invalid JSON" }, { status: 502 });
    }

    const scored = responseSchema.safeParse(json);
    if (!scored.success) {
      return NextResponse.json({ error: "LLM JSON missing valid angry score" }, { status: 502 });
    }

    return NextResponse.json({ angry: scored.data.angry });
  } catch (err) {
    const message = err instanceof Error ? err.message : "LLM request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

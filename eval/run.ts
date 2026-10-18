import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DEFAULT_MODEL, type LlmProvider } from "../lib/llm/models";
import { scoreWithLlm } from "../lib/llm/server";
import { heuristicReading } from "../lib/reading/heuristic";
import { AXES, type Axis, type Reading } from "../lib/reading/types";

type Row = {
  id: string;
  text: string;
  targets?: Partial<Record<Axis, number>>;
  note?: string;
};

type Metrics = {
  generatedAt: string;
  model: string;
  prompt: string;
  source: "heuristic" | "llm";
  n: number;
  mae: Record<string, number>;
  spearman: Record<string, number>;
  latencyMs: { p50: number; p95: number };
  costUsd: number;
  notes: string;
};

const args = process.argv.slice(2);
const useLlm = args.includes("--llm");
const modelArg = args.find((arg) => arg.startsWith("--model="))?.split("=")[1];
const datasetArg = args.find((arg) => arg.startsWith("--dataset="))?.split("=")[1];
const datasetPath = path.resolve(
  process.cwd(),
  datasetArg ?? "eval/dataset/seed.jsonl",
);
const resultsDir = path.join(process.cwd(), "eval", "results");

function readDataset(file: string): Row[] {
  const raw = readFileSync(file, "utf8");
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Row);
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function ranks(values: number[]): number[] {
  const sorted = values
    .map((value, index) => ({ value, index }))
    .sort((a, b) => a.value - b.value);
  const result = new Array<number>(values.length).fill(0);
  let cursor = 0;
  while (cursor < sorted.length) {
    let end = cursor;
    while (end + 1 < sorted.length && sorted[end + 1].value === sorted[cursor].value) {
      end += 1;
    }
    const rank = (cursor + end) / 2 + 1;
    for (let index = cursor; index <= end; index += 1) {
      result[sorted[index].index] = rank;
    }
    cursor = end + 1;
  }
  return result;
}

function pearson(a: number[], b: number[]): number {
  if (a.length < 2 || b.length !== a.length) return 0;
  const meanA = a.reduce((sum, value) => sum + value, 0) / a.length;
  const meanB = b.reduce((sum, value) => sum + value, 0) / b.length;
  let numerator = 0;
  let denomA = 0;
  let denomB = 0;
  for (let index = 0; index < a.length; index += 1) {
    const da = a[index] - meanA;
    const db = b[index] - meanB;
    numerator += da * db;
    denomA += da * da;
    denomB += db * db;
  }
  if (denomA === 0 || denomB === 0) return 0;
  return numerator / Math.sqrt(denomA * denomB);
}

function spearman(predicted: number[], targets: number[]): number {
  if (predicted.length < 2) return 0;
  return pearson(ranks(predicted), ranks(targets));
}

async function predict(text: string, model?: string): Promise<{ reading: Reading; latencyMs: number }> {
  if (!useLlm) {
    const started = performance.now();
    const reading = heuristicReading(text);
    return { reading, latencyMs: performance.now() - started };
  }

  const provider = (process.env.LLM_PROVIDER === "openrouter"
    ? "openrouter"
    : "openai") as LlmProvider;
  const started = performance.now();
  const result = await scoreWithLlm({
    text,
    mode: "single",
    model: model ?? modelArg ?? DEFAULT_MODEL[provider],
  });
  const latencyMs = performance.now() - started;
  if ("reading" in result) return { reading: result.reading, latencyMs };
  return { reading: result.performance.document, latencyMs };
}

async function main() {
  const rows = readDataset(datasetPath);
  if (rows.length === 0) throw new Error(`No rows in ${datasetPath}`);

  const predictions: number[][] = [];
  const targets: number[][] = [];
  const latencies: number[] = [];
  let costUsd = 0;
  let model = "heuristic.v1";
  let prompt = "heuristic.v1";

  const results: Array<{ row: Row; reading: Reading; latencyMs: number }> = [];

  for (const row of rows) {
    const { reading, latencyMs } = await predict(row.text, modelArg);
    model = reading.trace.model;
    prompt = reading.trace.promptVersion;
    costUsd += reading.trace.costUsd;
    latencies.push(latencyMs);
    results.push({ row, reading, latencyMs });

    if (row.targets) {
      predictions.push(AXES.map((axis) => reading.axes[axis].value));
      targets.push(AXES.map((axis) => row.targets?.[axis] ?? 0.5));
    }
  }

  const mae: Record<string, number> = {};
  const spearmanValues: Record<string, number> = {};

  AXES.forEach((axis, axisIndex) => {
    if (predictions.length === 0) {
      mae[axis] = 0;
      spearmanValues[axis] = 0;
      return;
    }
    const predictedAxis = predictions.map((row) => row[axisIndex]);
    const targetAxis = targets.map((row) => row[axisIndex]);
    const error =
      predictedAxis.reduce(
        (sum, value, index) => sum + Math.abs(value - targetAxis[index]),
        0,
      ) / predictedAxis.length;
    mae[axis] = Number(error.toFixed(4));
    spearmanValues[axis] = Number(spearman(predictedAxis, targetAxis).toFixed(4));
  });

  const output: Metrics = {
    generatedAt: new Date().toISOString(),
    model,
    prompt,
    source: useLlm ? "llm" : "heuristic",
    n: rows.length,
    mae,
    spearman: spearmanValues,
    latencyMs: {
      p50: Math.round(percentile(latencies, 50)),
      p95: Math.round(percentile(latencies, 95)),
    },
    costUsd: Number(costUsd.toFixed(6)),
    notes: useLlm
      ? "Seed set. Single-author targets; no held-out split yet."
      : "Local baseline. Single-author targets, no held-out split. Run `pnpm eval:llm` with a key to compare a model.",
  };

  mkdirSync(resultsDir, { recursive: true });
  writeFileSync(
    path.join(resultsDir, "latest.json"),
    `${JSON.stringify(output, null, 2)}\n`,
    "utf8",
  );

  const markdown = [
    "# ShapeLLM eval",
    "",
    `Generated: ${output.generatedAt}`,
    `Source: ${output.source} · model: ${output.model} · prompt: ${output.prompt} · n: ${output.n}`,
    "",
    "| Axis | MAE | Spearman |",
    "| --- | ---: | ---: |",
    ...AXES.map(
      (axis) => `| ${axis} | ${mae[axis].toFixed(3)} | ${spearmanValues[axis].toFixed(3)} |`,
    ),
    "",
    `Latency: p50 ${output.latencyMs.p50} ms · p95 ${output.latencyMs.p95} ms`,
    `Cost: $${output.costUsd.toFixed(6)}`,
    "",
    output.notes,
    "",
  ].join("\n");

  writeFileSync(path.join(resultsDir, "report.md"), markdown, "utf8");

  console.log(markdown);
  console.log(`Wrote ${path.join(resultsDir, "latest.json")}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

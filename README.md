# ShapeLLM

**Text, with a body.** A dark instrument panel that reads a text on six dimensions, shows the evidence behind every number, and grows a 3D specimen.

ShapeLLM is a POC about treating an LLM as a **noisy sensor**, not an oracle:

- It returns a typed reading — six axes, confidences, labels, and verbatim evidence — not a magic number.
- The geometry is a **pure, deterministic function** of that reading. The model never generates the shape.
- The Reading Room turns a longer text into a **temporal performance**: beats, voice, an arc, and a body that changes with the reading.
- The Lab measures the whole thing, including where it fails.

## Two ways to use it

**Studio** (`/`) — one text, one reading, one specimen. Click an axis to filter the evidence. Open the instrument log to see the model, prompt version, latency, tokens, cost, cache, and repair path. Export a specimen card as a PNG.

**Reading Room** (`/reading`) — a curated 11-beat performance called *The Reservation*. Press play: the browser voice reads the text, the current word is highlighted, the arc moves, and the specimen morphs from calm to furious to resigned. You can scrub by clicking a beat or the arc, switch to silent mode, change the voice and speed, and build a performance from your own text.

The gallery at `/specimens` is a cabinet of six readings. The Lab at `/lab` is the method, the baseline, and the failure modes.

## What it demonstrates

- **Structured output with a contract.** Zod schemas, strict JSON mode, a single repair retry, and a typed degraded path.
- **Evidence, not vibes.** The model must quote the text; quotes are anchored back to character offsets. Unanchored evidence is marked.
- **A deterministic bridge from meaning to matter.** `vectorToForm()` is pure and testable; the shader consumes its output. The same reading always grows the same specimen.
- **Temporal LLM work.** Long text becomes beats; each beat gets its own reading; the document gets a separate reading, not an average. The Reading Room evaluates the arc, not just a point.
- **A real local fallback.** No key? A deterministic heuristic engine keeps the Studio, gallery, and Reading Room alive. The UI labels it `local preview` instead of pretending it is a model.
- **A product surface, not a landing page.** A dark instrument panel with a sidebar, one large specimen stage, six-axis rings, an electric-violet accent, and a data palette that carries meaning. No giant hero, no generic AI chrome.
- **An eval harness.** A seed set, per-axis MAE and Spearman, latency, cost, and a reproducible report. The Lab page reads `eval/results/latest.json`.

## Quick start

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

No API key is required. The app starts on the curated/local engine. To use a live model, open the **model** panel in the Studio or Reading Room, paste an OpenAI or OpenRouter key, and choose a model. Keys stay in the browser and are sent only with the request that uses them.

For a server-side key, create `.env.local`:

```bash
OPENAI_API_KEY=sk-...
# or
OPENROUTER_API_KEY=sk-or-...
LLM_PROVIDER=openrouter
OPENROUTER_MODEL=openrouter/free
```

See [`.env.example`](./.env.example).

## How it works

```
text
  → normalize + segment
  → one structured reading (document) or beats (Reading Room)
  → Zod validation + one repair retry
  → anchor every quote to the source
  → six-axis vector
  → vectorToForm()  (pure, deterministic)
  → shader uniforms
  → specimen
```

The six axes are **valence, arousal, dominance, tension, warmth, certainty**. Each one has a distinct visual operator; a dimension that does not change the object is not in the contract.

The Reading Room uses one call for the curated performance and the same schema for arbitrary text. If the model returns beats that do not cover the source, the client falls back to the local preview and says so. Browser speech synthesis is used for the voice; the silent mode keeps the performance usable in an office, in a recording, or on a browser without speech.

### The Reading Room

- **beats** are 1–3 sentence units with a distinct tone;
- **arc** is the compressed trajectory (`calm → unease → friction → explosion → resignation`);
- **play** reads each beat, highlights words, advances the playhead, and maps the active beat to the stage;
- **scrub** by clicking a beat or the arc; **silent** mode uses estimated word timings;
- **card** exports a specimen card.

## Evaluation

The repo ships a deliberately small seed set: 12 texts, English and Italian, single-author targets, no held-out split. It is a baseline, not a claim. The point is the harness and the honesty of the labels.

```bash
pnpm eval        # local heuristic baseline (no key)
pnpm eval:llm    # same set with a model; requires a key
```

`eval/run.ts` writes `eval/results/latest.json` and `eval/results/report.md`. The Lab page reads `latest.json` and renders the per-axis table, the MAE, and the Spearman values. The current baseline is visible at `/lab`.

The next evaluation step is a three-rater panel with inter-rater agreement (ICC), a held-out test split, and a model/prompt matrix. The Reading Room adds temporal metrics: beat-level MAE, arc correlation, change-point F1, peak hit, and offset coverage.

## Project map

```
app/
  page.tsx                  Studio
  reading/page.tsx          Reading Room
  specimens/page.tsx        Cabinet
  lab/page.tsx              Method + baseline
  components/stage/         R3F specimen chamber and shaders
  components/studio/        Composer, readout, settings, rail
  components/reading/       Player, beats, arc
  api/score/                Reading endpoint
  api/health/               Live/local status
lib/
  reading/                  Schema, heuristic, form, palette, anchoring, card, share
  llm/                      Prompt, provider, repair, cache, trace
eval/
  dataset/seed.jsonl        Seed set
  run.ts                    Harness
  results/                  Generated JSON + report
```

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Next dev server |
| `pnpm build` | Production build |
| `pnpm start` | Production server |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm eval` | Local baseline |
| `pnpm eval:llm` | Model baseline (needs a key) |

## Limits

- The seed eval is small and single-author. It is a baseline, not a paper.
- Irony, negation, reported speech, and code-switching remain hard. The failure gallery in `/lab` shows them.
- Browser speech synthesis varies by OS and browser; the silent mode is the reliable path.
- The Reading Room does not yet use generated studio audio with forced word alignment. That is the next quality jump.
- Readings are interpretations of how a text reads to a careful reader, not diagnoses of an author.

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind v4 · `@react-three/fiber` + `three` · OpenAI SDK (OpenAI / OpenRouter) · Zod · `tsx` for the eval harness.

Designed and built by [Alessandro Miracapillo](https://github.com/aylesim).

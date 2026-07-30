# ShapeLLM

Experimental POC: LLM scores how **angry** a piece of text feels (0 = calm, 1 = furious), then morphs a 3D ball sharper and redder in near real time.

Visual style matches sibling project [Glossia](https://glossia-seven.vercel.app).

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API key

Paste an OpenAI or OpenRouter key in the **LLM** panel (stored in browser localStorage), or set env vars when running locally:

```bash
OPENAI_API_KEY=sk-...
# or
OPENROUTER_API_KEY=sk-or-...
LLM_PROVIDER=openrouter
OPENROUTER_MODEL=openrouter/free
```

## How it works

1. Type text in the textarea (auto-evaluates ~600ms after you pause, or click **Evaluate**).
2. `POST /api/angry` asks the LLM for `{ "angry": 0..1 }`.
3. The 3D icosahedron displaces along normals and shifts from cool gray-blue to red based on the score.

## Stack

- Next.js 16, React 19, Tailwind v4
- `@react-three/fiber` + `three` for the morphing ball
- OpenAI SDK (OpenAI / OpenRouter via server route)

## Deploy

Works on Vercel. Set `OPENAI_API_KEY` or `OPENROUTER_API_KEY` in project env if you don't want users to paste keys.

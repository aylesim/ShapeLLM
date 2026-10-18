# ShapeLLM eval

Generated: 2026-10-17T23:56:58.129Z
Source: heuristic · model: heuristic.v1 · prompt: heuristic.v1 · n: 12

| Axis | MAE | Spearman |
| --- | ---: | ---: |
| valence | 0.169 | 0.591 |
| arousal | 0.183 | 0.155 |
| dominance | 0.076 | 0.149 |
| tension | 0.229 | 0.536 |
| warmth | 0.192 | 0.415 |
| certainty | 0.115 | 0.351 |

Latency: p50 0 ms · p95 5 ms
Cost: $0.000000

Local baseline. Single-author targets, no held-out split. Run `pnpm eval:llm` with a key to compare a model.

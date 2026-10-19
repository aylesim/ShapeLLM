import type { Metadata } from "next";
import fs from "node:fs/promises";
import path from "node:path";
import { Card, CardHeader } from "@/app/components/ui/card";
import { FAILURE_GALLERY, LAB_NOTES } from "@/lib/reading/fixtures";
import { heuristicReading } from "@/lib/reading/heuristic";
import { AXIS_META, LABEL_COPY } from "@/lib/reading/types";

export const metadata: Metadata = {
  title: "Lab — ShapeLLM",
  description:
    "The method, the contract, the baseline evaluation, and the failure modes behind ShapeLLM.",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type EvalResult = {
  generatedAt?: string;
  model?: string;
  prompt?: string;
  source?: string;
  n?: number;
  mae?: Record<string, number>;
  spearman?: Record<string, number>;
  latencyMs?: { p50?: number; p95?: number };
  costUsd?: number;
  notes?: string;
};

async function loadResults(): Promise<EvalResult | null> {
  try {
    const file = path.join(process.cwd(), "eval", "results", "latest.json");
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as EvalResult;
  } catch {
    return null;
  }
}

function metric(value: number | undefined, digits = 2): string {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(digits)
    : "—";
}

const AXIS_TABLE = [
  { axis: "valence", reads: "hostile ↔ warm", shapes: "palette and key light" },
  { axis: "arousal", reads: "still ↔ activated", shapes: "spikes, speed, particles" },
  { axis: "dominance", reads: "powerless ↔ commanding", shapes: "scale and footprint" },
  { axis: "tension", reads: "relaxed ↔ conflicted", shapes: "twist and membrane gap" },
  { axis: "warmth", reads: "cold ↔ warm", shapes: "sheen and rim light" },
  { axis: "certainty", reads: "hedged ↔ absolute", shapes: "surface coherence" },
];

const METRICS = [
  {
    name: "MAE",
    what: "mean absolute error per axis against the human panel",
    why: "the plain question: how far off is the reading?",
  },
  {
    name: "Spearman",
    what: "rank correlation with the human panel",
    why: "does it order texts correctly even when the absolute value is off?",
  },
  {
    name: "Calibration",
    what: "does confidence predict error? (ECE / reliability curve)",
    why: "if not, the confidence is theater",
  },
  {
    name: "Stability",
    what: "disagreement across independent samples",
    why: "the uncertainty you can actually see",
  },
  {
    name: "JSON validity",
    what: "schema-valid outputs before and after repair",
    why: "a production contract, not a demo",
  },
  {
    name: "Arc / change-point",
    what: "does the performance find the same tone shifts as readers?",
    why: "the Reading Room needs temporal accuracy, not just an average",
  },
];

export default async function LabPage() {
  const results = await loadResults();
  const failures = FAILURE_GALLERY.map((item) => ({
    ...item,
    reading: heuristicReading(item.text),
  }));

  return (
    <div className="lab-dashboard">
      <Card className="lab-summary-card">
        <CardHeader
          icon="beaker"
          title="Does it actually read?"
          hint="method and evidence"
        />
        <div className="lab-summary-grid">
          <div className="lab-summary-copy">
            <h2 className="lab-hero-title">A beautiful object is not evidence.</h2>
            <p className="lab-hero-text">
              ShapeLLM treats the model as a noisy sensor, not an oracle. The
              reading is a contract: six axes, a confidence, and verbatim
              evidence. The geometry is a pure, deterministic function of that
              reading, which is why the same reading always grows the same
              specimen.
            </p>
          </div>
          <div className="stat-grid">
            <div className="stat-card">
              <span className="stat-value">{results?.n ?? "—"}</span>
              <span className="stat-label">texts</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{metric(results?.mae?.valence)}</span>
              <span className="stat-label">MAE valence</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {metric(results?.spearman?.valence)}
              </span>
              <span className="stat-label">Spearman valence</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {results?.latencyMs?.p95 != null
                  ? `${results.latencyMs.p95} ms`
                  : "—"}
              </span>
              <span className="stat-label">p95 latency</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="method-card">
        <CardHeader
          icon="spark"
          title="Method"
          hint="from text to a validated reading"
        />
        <div className="pipeline-grid">
          {[
            {
              title: "Segment",
              text: "The text becomes beats: one to three sentences with a distinct tone. Quotes are anchored back to the source.",
            },
            {
              title: "Read",
              text: "Each beat gets six axes, a confidence, a label, and evidence. The document gets its own reading, not the average.",
            },
            {
              title: "Validate",
              text: "Zod checks the contract. One repair call fixes malformed JSON. If the beats do not cover the text, the client falls back to the local preview.",
            },
            {
              title: "Shape",
              text: "A pure mapping turns the vector into geometry and material. The same reading is reproducible; the uncertainty is visible.",
            },
          ].map((step, index) => (
            <div className="pipeline-step" key={step.title}>
              <span className="pipeline-index">0{index + 1}</span>
              <h3 className="pipeline-title">{step.title}</h3>
              <p className="pipeline-text">{step.text}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="contract-card">
        <CardHeader
          icon="grid"
          title="The contract"
          hint="six axes, six visual operators"
        />
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Axis</th>
                <th>Reads</th>
                <th>Shapes</th>
              </tr>
            </thead>
            <tbody>
              {AXIS_TABLE.map((row) => (
                <tr key={row.axis}>
                  <td>
                    {AXIS_META[row.axis as keyof typeof AXIS_META].label}
                  </td>
                  <td>{row.reads}</td>
                  <td>{row.shapes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="eval-card">
        <CardHeader
          icon="beaker"
          title="Evaluation"
          hint={`${LAB_NOTES.dataset} · ${LAB_NOTES.split}`}
          action={
            results ? (
              <span className="micro-pill">{results.source ?? "baseline"}</span>
            ) : null
          }
        />

        <p className="card-prose">
          The seed set is deliberately small: {LAB_NOTES.dataset},{" "}
          {LAB_NOTES.raters}, {LAB_NOTES.split}. It is a baseline, not a claim.
          The next step is a three-rater panel with inter-rater agreement, a
          held-out test split, and the same harness across models and prompt
          versions.
        </p>

        {results ? (
          <>
            <div className="metric-bars">
              {Object.keys(AXIS_META).map((axis) => {
                const value = results.mae?.[axis] ?? 0;
                const width = Math.min(100, (value / 0.35) * 100);
                return (
                  <div className="metric-bar-row" key={axis}>
                    <span className="metric-bar-label">
                      {AXIS_META[axis as keyof typeof AXIS_META].label}
                    </span>
                    <span className="metric-bar-track">
                      <span
                        className="metric-bar-fill"
                        style={{
                          width: `${width}%`,
                          background:
                            AXIS_META[axis as keyof typeof AXIS_META].color,
                        }}
                      />
                    </span>
                    <span className="metric-bar-value">{value.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>

            <div className="table-wrap" style={{ marginTop: 16 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Axis</th>
                    <th>MAE</th>
                    <th>Spearman</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(AXIS_META).map((axis) => (
                    <tr key={axis}>
                      <td>{AXIS_META[axis as keyof typeof AXIS_META].label}</td>
                      <td>{metric(results.mae?.[axis])}</td>
                      <td>{metric(results.spearman?.[axis])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="card-footnote">
              source {results.source ?? "unknown"} · model{" "}
              {results.model ?? "—"} · prompt {results.prompt ?? "—"} ·
              generated {results.generatedAt ?? "—"}
              {results.notes ? ` · ${results.notes}` : ""}
            </p>
          </>
        ) : (
          <div className="empty-state" style={{ marginTop: 14 }}>
            <p className="empty-title">No live results yet.</p>
            <p className="empty-text">
              The harness is in the repository. Run the local baseline (no key),
              then the same set with a model key to compare.
            </p>
            <p className="empty-commands">
              <code>pnpm eval</code>
              <code>pnpm eval:llm</code>
            </p>
          </div>
        )}

        <details className="metric-definitions">
          <summary>Metric definitions</summary>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>What it measures</th>
                  <th>Why it matters</th>
                </tr>
              </thead>
              <tbody>
                {METRICS.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td>{row.what}</td>
                    <td>{row.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </Card>

      <Card className="failures-card">
        <CardHeader
          icon="beaker"
          title="Where it fails"
          hint="the local preview is shown next to the human note"
        />
        <div className="failure-grid">
          {failures.map((item) => (
            <article className="failure-item" key={item.text}>
              <p className="failure-quote">“{item.text}”</p>
              <p className="failure-human">human · {item.human}</p>
              <p className="failure-note">
                local preview:{" "}
                <strong>{LABEL_COPY[item.reading.label]}</strong> ·{" "}
                {Math.round(
                  (Object.values(item.reading.axes).reduce(
                    (sum, axis) => sum + axis.confidence,
                    0,
                  ) /
                    Object.values(item.reading.axes).length) *
                    100,
                )}
                % conf. {item.note}
              </p>
            </article>
          ))}
        </div>
      </Card>

      <Card className="limits-card">
        <CardHeader
          icon="settings"
          title="Limits"
          hint="what this POC does not claim"
        />
        <p className="card-prose">
          This is a POC, and the limits are part of the design. The evaluation is
          a seed, not a paper. The browser voice is convenient, not
          studio-grade. The performance is not yet aligned to a generated voice
          with word-level timestamps. Irony, negation, reported speech, and
          code-switching remain genuinely hard.
        </p>
        <p className="card-prose">
          The next version would add a three-rater panel with ICC, a held-out
          test split, a model/prompt matrix, a calibration curve, change-point F1
          for the Reading Room, studio TTS with forced alignment, and a
          cost/quality router that escalates to a stronger model only when the
          reading is unstable.
        </p>
        <p className="card-footnote">
          Readings are interpretations of how a text reads to a careful reader.
          They are not diagnoses of an author, and they are not a measurement of
          a person.
        </p>
      </Card>
    </div>
  );
}

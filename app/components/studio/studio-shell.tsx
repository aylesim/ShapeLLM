"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardHeader } from "@/app/components/ui/card";
import { CopyButton } from "@/app/components/ui/copy-button";
import { Icon } from "@/app/components/ui/icons";
import { ProgressRing } from "@/app/components/ui/progress-ring";
import { SourceBadge } from "@/app/components/ui/source-badge";
import { AxisRings } from "./axis-rings";
import { Composer } from "./composer";
import { SettingsPanel } from "./settings-panel";
import { SpecimenRail } from "./specimen-rail";
import { StageCard } from "./stage-card";
import {
  fetchHealth,
  interpretText,
  ReadingError,
  type Health,
} from "@/lib/reading/client";
import { downloadSpecimenCard, getStageCanvas } from "@/lib/reading/card";
import {
  CURATED_SPECIMENS,
  SAMPLE_TEXTS,
  type CuratedSpecimen,
} from "@/lib/reading/fixtures";
import { seedFromString, vectorToForm } from "@/lib/reading/form";
import { describeForm, formatConfidence } from "@/lib/reading/palette";
import { useLlmSettings } from "@/lib/reading/settings";
import {
  copyToClipboard,
  readShareFromLocation,
  shareUrl,
} from "@/lib/reading/share";
import {
  AXIS_META,
  LABEL_COPY,
  averageConfidence,
  vectorFromReading,
  type Axis,
  type Reading,
} from "@/lib/reading/types";

const DEFAULT_SPECIMEN = CURATED_SPECIMENS[0];
const TEXT_LIMIT = 4000;

export default function StudioShell() {
  const { settings, setSettings, hydrated } = useLlmSettings();
  const [health, setHealth] = useState<Health | null>(null);
  const [text, setText] = useState(DEFAULT_SPECIMEN.text);
  const [reading, setReading] = useState<Reading>(DEFAULT_SPECIMEN.reading);
  const [activeId, setActiveId] = useState<string | null>(DEFAULT_SPECIMEN.id);
  const [status, setStatus] = useState<"idle" | "reading" | "error">("idle");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState<string | null>(null);
  const [auto, setAuto] = useState(true);
  const [selectedAxis, setSelectedAxis] = useState<Axis | null>(null);
  const [cage, setCage] = useState(true);
  const [cardBusy, setCardBusy] = useState(false);
  const [shared, setShared] = useState(false);

  const lastEvaluated = useRef(DEFAULT_SPECIMEN.text);
  const requestRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const restoredShare = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetchHealth(controller.signal).then((value) => setHealth(value));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (restoredShare.current) return;
    restoredShare.current = true;
    const share = readShareFromLocation();
    if (!share) return;
    setText(share.text);
    setActiveId(null);
    setSelectedAxis(null);
    lastEvaluated.current = "";
  }, []);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const applySpecimen = useCallback((specimen: CuratedSpecimen) => {
    setText(specimen.text);
    setReading(specimen.reading);
    setActiveId(specimen.id);
    setSelectedAxis(null);
    setWarning(null);
    setError("");
    setStatus("idle");
    lastEvaluated.current = specimen.text;
  }, []);

  const evaluate = useCallback(
    async (nextText: string) => {
      const trimmed = nextText.trim();
      if (!trimmed) return;
      if (trimmed.length > TEXT_LIMIT) {
        setStatus("error");
        setError(
          `Keep it under ${TEXT_LIMIT.toLocaleString("en-US")} characters in the Studio. The Reading Room handles longer texts.`,
        );
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const requestId = ++requestRef.current;

      setStatus("reading");
      setError("");
      setWarning(null);

      try {
        const result = await interpretText(trimmed, settings, {
          live: Boolean(health?.live),
          signal: controller.signal,
        });
        if (requestId !== requestRef.current) return;
        setReading(result.data);
        setWarning(result.warning);
        setActiveId(null);
        setSelectedAxis(null);
        setStatus("idle");
        lastEvaluated.current = trimmed;
      } catch (err) {
        if (controller.signal.aborted) return;
        if (requestId !== requestRef.current) return;
        setStatus("error");
        setError(
          err instanceof ReadingError
            ? err.message
            : "The reading failed. Try again in a moment.",
        );
      }
    },
    [health, settings],
  );

  useEffect(() => {
    if (!hydrated || !auto) return;
    if (!health?.live && !settings.apiKey.trim()) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    if (trimmed === lastEvaluated.current) return;
    if (trimmed.length > TEXT_LIMIT) {
      setStatus("error");
      setError(
        `Keep it under ${TEXT_LIMIT.toLocaleString("en-US")} characters in the Studio. The Reading Room handles longer texts.`,
      );
      return;
    }

    const timer = window.setTimeout(() => {
      void evaluate(trimmed);
    }, 850);

    return () => window.clearTimeout(timer);
  }, [text, auto, hydrated, evaluate, health?.live, settings.apiKey]);

  const vector = vectorFromReading(reading);
  const form = vectorToForm(vector, seedFromString(reading.id));
  const confidence = averageConfidence(reading.axes);

  const handleTextChange = (value: string) => {
    setText(value);
    setActiveId(null);
    setWarning(null);
    setError("");
    if (value.trim() !== lastEvaluated.current) setStatus("idle");
  };

  const handleInterpret = () => {
    void evaluate(text);
  };

  const handleClear = () => {
    setText("");
    setActiveId(null);
    setSelectedAxis(null);
    setWarning(null);
    setError("");
    setStatus("idle");
  };

  const handleSelectAxis = (axis: Axis) => {
    setSelectedAxis((current) => (current === axis ? null : axis));
  };

  const handleCard = async () => {
    setCardBusy(true);
    try {
      await downloadSpecimenCard({
        reading,
        stageCanvas: getStageCanvas(),
      });
    } catch {
      setWarning("The card could not be exported in this browser.");
    } finally {
      setCardBusy(false);
    }
  };

  const handleShare = async () => {
    const url = shareUrl({ text, mode: "single" });
    const ok = await copyToClipboard(url);
    if (!ok) {
      setWarning(
        "Could not copy the link. Your browser may block clipboard access.",
      );
      return;
    }
    setShared(true);
    window.setTimeout(() => setShared(false), 1600);
  };

    const evidence = selectedAxis
    ? reading.evidence.filter((item) => item.axis === selectedAxis)
    : reading.evidence;

  const traceItems: Array<[string, string]> = [
    ["id", reading.id],
    ["model", reading.trace.model],
    ["provider", reading.trace.provider],
    ["prompt", reading.trace.promptVersion],
    ["latency", `${reading.trace.latencyMs} ms`],
    ["tokens", `${reading.trace.tokensIn} in / ${reading.trace.tokensOut} out`],
    [
      "cost",
      reading.trace.costUsd > 0
        ? `$${reading.trace.costUsd.toFixed(4)}`
        : "—",
    ],
    ["route", reading.trace.route],
    ["cached", reading.trace.cached ? "yes" : "no"],
    ["repaired", reading.trace.repaired ? "yes" : "no"],
  ];

  return (
    <div className="studio-grid">
      <Card className="composer-card">
        <CardHeader
          icon="beaker"
          title="Compose"
          hint="type, paste, or pick a specimen"
        />
        <Composer
          text={text}
          onTextChange={handleTextChange}
          onInterpret={handleInterpret}
          onClear={handleClear}
          onLoadSample={(value) => {
            const curated = CURATED_SPECIMENS.find(
              (specimen) => specimen.text.trim() === value.trim(),
            );
            if (curated) {
              applySpecimen(curated);
              return;
            }
            setText(value);
            setActiveId(null);
            setWarning(null);
            setError("");
          }}
          samples={SAMPLE_TEXTS}
          status={status}
          limit={TEXT_LIMIT}
          auto={auto}
          onAutoChange={setAuto}
        />
        {error ? (
          <p className="inline-alert" role="alert">
            {error}
          </p>
        ) : null}
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          hydrated={hydrated}
          health={health}
        />
      </Card>

      <StageCard
        vector={vector}
        seed={seedFromString(reading.id)}
        showCage={cage}
        headerLeft={
          <>
            <span className="stage-card-kicker">specimen</span>
            <span className="stage-card-id">{reading.id}</span>
            <SourceBadge source={reading.source} />
          </>
        }
        headerRight={
          <span className="stage-card-conf">
            conf {formatConfidence(confidence)}
          </span>
        }
        footerLeft={`${reading.language.toUpperCase()} · ${reading.version} · drag to rotate`}
        actions={
          <>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setCage((value) => !value)}
              aria-pressed={cage}
            >
              <Icon name="cube" size={14} />
              {cage ? "cage on" : "cage off"}
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={handleCard}
              disabled={cardBusy}
            >
              <Icon name="download" size={14} />
              {cardBusy ? "saving…" : "card"}
            </button>
            <button type="button" className="btn btn--ghost" onClick={handleShare}>
              <Icon name={shared ? "check" : "share"} size={14} />
              {shared ? "copied" : "share"}
            </button>
          </>
        }
      />

      <div className="reading-panels">
        <Card className="reading-summary-card">
          <CardHeader
            icon="spark"
            title="Reading"
            hint={reading.version}
            action={
              <CopyButton
                value={JSON.stringify(reading, null, 2)}
                label="json"
                copiedLabel="copied"
              />
            }
          />
          <div className="reading-summary-top">
            <div className="reading-summary-copy">
              <div className="reading-summary-meta">
                <SourceBadge source={reading.source} />
                <span>{reading.language.toUpperCase()}</span>
              </div>
              <h2 className="reading-label">{LABEL_COPY[reading.label]}</h2>
              <p className="reading-text">{reading.summary}</p>
            </div>
            <ProgressRing
              value={confidence}
              size={96}
              stroke={7}
              label={`${Math.round(confidence * 100)}%`}
              sublabel="confidence"
            />
          </div>
          {reading.ambiguity ? (
            <p className="inline-note">ambiguity · {reading.ambiguity}</p>
          ) : null}
          {warning ? <p className="inline-alert">{warning}</p> : null}
          <p className="reading-why">{describeForm(form)}</p>
        </Card>

        <Card className="axes-card">
          <CardHeader
            icon="grid"
            title="Six axes"
            hint={
              selectedAxis
                ? `filter · ${AXIS_META[selectedAxis].label}`
                : "click to filter evidence"
            }
            action={
              selectedAxis ? (
                <button
                  type="button"
                  className="link-button"
                  onClick={() => setSelectedAxis(null)}
                >
                  clear
                </button>
              ) : null
            }
          />
          <AxisRings
            axes={reading.axes}
            selectedAxis={selectedAxis}
            onSelect={handleSelectAxis}
          />
        </Card>

        <Card className="evidence-card">
          <CardHeader
            icon="beaker"
            title="Evidence"
            hint={`${evidence.length} ${
              evidence.length === 1 ? "quote" : "quotes"
            }`}
          />
          {evidence.length > 0 ? (
            <div className="evidence-list">
              {evidence.map((item, index) => (
                <div
                  className="evidence-item"
                  key={`${item.axis}-${index}`}
                  data-selected={selectedAxis === item.axis}
                >
                  <p className="evidence-quote">“{item.quote}”</p>
                  <p className="evidence-why">
                    <span style={{ color: AXIS_META[item.axis].color }}>
                      {AXIS_META[item.axis].label}
                    </span>{" "}
                    · {item.why}
                    {item.anchored === false ? " · unanchored" : ""}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted-text">
              No anchored quote for this axis. The value still stands; the
              lower confidence is the honest signal.
            </p>
          )}
        </Card>
      </div>

      <Card className="trace-card">
        <CardHeader
          icon="settings"
          title="Instrument log"
          hint={reading.trace.cached ? "cached" : "fresh"}
          action={<span className="micro-pill">{reading.trace.model}</span>}
        />
        <div className="trace-grid">
          {traceItems.map(([label, value]) => (
            <div className="trace-item" key={label}>
              <span>{label}</span>
              <span>{value}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="rail-card">
        <CardHeader icon="cube" title="Specimens" hint="curated readings" />
        <SpecimenRail
          specimens={CURATED_SPECIMENS}
          activeId={activeId}
          onSelect={applySpecimen}
        />
      </Card>
    </div>
  );
}

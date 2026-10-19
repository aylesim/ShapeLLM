"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardHeader } from "@/app/components/ui/card";
import { Icon } from "@/app/components/ui/icons";
import { ProgressRing } from "@/app/components/ui/progress-ring";
import { SourceBadge } from "@/app/components/ui/source-badge";
import { SettingsPanel } from "@/app/components/studio/settings-panel";
import { BeatBlock } from "./beat-block";
import { ReadingArc } from "./arc";
import { StageCard } from "@/app/components/studio/stage-card";
import { formatTime, usePerformancePlayer } from "./use-performance-player";
import {
  fetchHealth,
  interpretPerformance,
  ReadingError,
  type Health,
} from "@/lib/reading/client";
import { downloadSpecimenCard, getStageCanvas } from "@/lib/reading/card";
import { CURATED_PERFORMANCE } from "@/lib/reading/fixtures";
import { seedFromString } from "@/lib/reading/form";
import { affectToCss } from "@/lib/reading/palette";
import { useLlmSettings } from "@/lib/reading/settings";
import {
  copyToClipboard,
  readShareFromLocation,
  shareUrl,
} from "@/lib/reading/share";
import { truncateWords } from "@/lib/reading/anchor";
import {
  LABEL_COPY,
  averageConfidence,
  vectorFromBeat,
  vectorFromReading,
  type Performance,
} from "@/lib/reading/types";

const TEXT_LIMIT = 6000;
const countFormat = new Intl.NumberFormat("en-US");

export default function ReadingShell() {
  const { settings, setSettings, hydrated } = useLlmSettings();
  const [health, setHealth] = useState<Health | null>(null);
  const [performance, setPerformance] = useState<Performance>(CURATED_PERFORMANCE);
  const [pasteText, setPasteText] = useState("");
  const [status, setStatus] = useState<"idle" | "reading" | "error">("idle");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState<string | null>(null);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [cardBusy, setCardBusy] = useState(false);
  const [shared, setShared] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const restoredShare = useRef(false);

  const player = usePerformancePlayer(performance.beats);
  const activeBeat = performance.beats[player.activeIndex] ?? performance.beats[0];
  const activeVector = useMemo(() => {
    if (!activeBeat) return vectorFromReading(performance.document);
    if (player.ended) return vectorFromReading(performance.document);
    return vectorFromBeat(activeBeat);
  }, [activeBeat, performance.document, player.ended]);

  const confidence = activeBeat
    ? averageConfidence(activeBeat.axes)
    : averageConfidence(performance.document.axes);

  useEffect(() => {
    const controller = new AbortController();
    void fetchHealth(controller.signal).then((value) => setHealth(value));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!player.playing) {
      setVoiceLevel(0);
      return;
    }
    setVoiceLevel(0.72);
    const timer = window.setTimeout(() => setVoiceLevel(0.12), 120);
    return () => window.clearTimeout(timer);
  }, [player.currentWord, player.playing]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const buildReading = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      if (trimmed.length > TEXT_LIMIT) {
        setStatus("error");
        setError(
          `Keep it under ${countFormat.format(TEXT_LIMIT)} characters for one reading.`,
        );
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStatus("reading");
      setError("");
      setWarning(null);

      try {
        const result = await interpretPerformance(trimmed, settings, {
          live: Boolean(health?.live),
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setPerformance(result.data);
        setWarning(result.warning);
        setStatus("idle");
      } catch (err) {
        if (controller.signal.aborted) return;
        setStatus("error");
        setError(
          err instanceof ReadingError
            ? err.message
            : "The reading could not be built. Try again.",
        );
      }
    },
    [health, settings],
  );

  useEffect(() => {
    if (!hydrated || restoredShare.current) return;
    restoredShare.current = true;
    const share = readShareFromLocation();
    if (!share || share.mode !== "reading") return;
    if (share.text.trim() === CURATED_PERFORMANCE.text.trim()) return;
    setPasteText(share.text);
    void buildReading(share.text);
  }, [hydrated, buildReading]);

  const handleBuild = () => {
    void buildReading(pasteText);
  };

  const handleRestore = () => {
    player.stop();
    setPerformance(CURATED_PERFORMANCE);
    setPasteText("");
    setWarning(null);
    setError("");
    setStatus("idle");
  };

  const handleCard = async () => {
    setCardBusy(true);
    try {
      await downloadSpecimenCard({
        reading: performance.document,
        performance,
        stageCanvas: getStageCanvas(),
      });
    } catch {
      setWarning("The card could not be exported in this browser.");
    } finally {
      setCardBusy(false);
    }
  };

  const handleShare = async () => {
    const ok = await copyToClipboard(
      shareUrl({ text: performance.text, mode: "reading" }),
    );
    if (!ok) {
      setWarning("Could not copy the link. Your browser may block clipboard access.");
      return;
    }
    setShared(true);
    window.setTimeout(() => setShared(false), 1600);
  };

  const overLimit = pasteText.length > TEXT_LIMIT;
  const buildDisabled =
    status === "reading" || overLimit || pasteText.trim().length === 0;
  const currentQuote = activeBeat
    ? truncateWords(activeBeat.quote, 26)
    : performance.document.summary;

  const performanceTitle =
    performance.id === "read-reservation" ? "The Reservation" : "Your reading";
  const activeColor = activeBeat
    ? affectToCss(activeBeat.axes.valence.value, activeBeat.axes.arousal.value)
    : "var(--accent)";

  return (
    <div className="reading-grid">
      <Card className="performance-card">
        <CardHeader
          icon="volume"
          title="Performance"
          hint={`${LABEL_COPY[performance.document.label]} · ${performance.language.toUpperCase()}`}
          action={<SourceBadge source={performance.source} />}
        />

        <div className="performance-head">
          <div>
            <h2 className="performance-title">{performanceTitle}</h2>
            <p className="performance-summary">{performance.document.summary}</p>
          </div>
          <div className="performance-time-block">
            <span className="performance-time">{formatTime(player.totalMs)}</span>
            <span className="performance-time-label">total</span>
          </div>
        </div>

        <details className="reading-paste">
          <summary>Read your own text</summary>
          <div className="reading-paste-body">
            <textarea
              className="field"
              value={pasteText}
              onChange={(event) => {
                setPasteText(event.target.value);
                if (status === "error") {
                  setStatus("idle");
                  setError("");
                }
              }}
              rows={4}
              placeholder="Paste a letter, a review, a scene, a message. It becomes a score."
              aria-label="Text to perform"
            />
            <div className="composer-row">
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleBuild}
                disabled={buildDisabled}
                aria-busy={status === "reading"}
              >
                <Icon name="beaker" size={14} />
                {status === "reading" ? "building…" : "build the reading"}
              </button>
              <button type="button" className="btn" onClick={handleRestore}>
                curated performance
              </button>
              <span className="composer-count" data-over={overLimit}>
                {countFormat.format(pasteText.length)} /{" "}
                {countFormat.format(TEXT_LIMIT)}
              </span>
            </div>
            {error ? (
              <p className="inline-alert" role="alert">
                {error}
              </p>
            ) : null}
            {warning ? <p className="inline-alert">{warning}</p> : null}
          </div>
        </details>

        <div className="reading-controls" aria-label="Performance controls">
          <div className="reading-progress" aria-hidden="true">
            <div
              className="reading-progress-bar"
              style={{ width: `${Math.round(player.overallProgress * 100)}%` }}
            />
          </div>
          <div className="reading-now">
            <span className="reading-now-label">
              {player.playing
                ? "now reading"
                : player.ended
                  ? "finished"
                  : "selected"}
            </span>
            <span className="reading-now-quote">
              {activeBeat
                ? `“${truncateWords(activeBeat.quote, 26)}”`
                : performance.document.summary}
            </span>
          </div>

          <div className="player">
            <button
              type="button"
              className="btn btn--primary player-play"
              onClick={player.toggle}
              aria-label={player.playing ? "Pause reading" : "Play reading"}
            >
              <Icon name={player.playing ? "pause" : "play"} size={14} />
              {player.playing ? "pause" : player.ended ? "replay" : "play"}
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={player.restart}
              aria-label="Restart from the beginning"
            >
              <Icon name="restart" size={14} />
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={player.stop}
              aria-label="Stop and reset"
            >
              <Icon name="stop" size={14} />
            </button>
            <button
              type="button"
              className="btn"
              data-active={player.voiceOn}
              onClick={() => player.setVoiceOn(!player.voiceOn)}
              aria-pressed={player.voiceOn}
              title={
                player.supported
                  ? "Toggle the browser voice"
                  : "No browser voice available"
              }
            >
              <Icon name={player.voiceOn ? "volume" : "mute"} size={14} />
              {player.voiceOn ? "voice" : "silent"}
            </button>
            <select
              className="field select player-select"
              value={String(player.rate)}
              onChange={(event) => player.setRate(Number(event.target.value))}
              aria-label="Playback speed"
            >
              <option value="0.85">0.85×</option>
              <option value="1">1.00×</option>
              <option value="1.15">1.15×</option>
            </select>
            <select
              className="field select player-select"
              value={player.voiceURI ?? ""}
              onChange={(event) => player.setVoiceURI(event.target.value)}
              disabled={!player.supported || !player.voiceOn}
              aria-label="Voice"
            >
              {player.voices.length === 0 ? (
                <option value="">No voices</option>
              ) : null}
              {player.voices.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn"
              data-active={player.loop}
              onClick={player.toggleLoop}
              aria-pressed={player.loop}
            >
              loop
            </button>
            <span className="player-time">
              {formatTime(player.elapsedMs)} / {formatTime(player.totalMs)}
            </span>
          </div>

          {player.voiceError ? (
            <p className="inline-alert">{player.voiceError}</p>
          ) : null}
          {!player.supported ? (
            <p className="inline-note">
              This browser has no speech synthesis. The reading still plays in
              silent mode.
            </p>
          ) : null}
        </div>

        <ReadingArc
          beats={performance.beats}
          activeIndex={player.activeIndex}
          progress={player.progress}
          arc={performance.arc}
          onSeek={player.seek}
        />
      </Card>

      <StageCard
        vector={activeVector}
        voiceLevel={voiceLevel}
        seed={seedFromString(performance.id)}
        showCage
        className="reading-stage-card"
        headerLeft={
          <>
            <span className="stage-card-kicker">specimen</span>
            <span className="stage-card-id">{performance.id}</span>
            <SourceBadge source={performance.source} />
          </>
        }
        headerRight={
          <span className="stage-card-conf">
            beat {player.activeIndex + 1} / {performance.beats.length}
          </span>
        }
        footerLeft={
          player.playing
            ? `performing ${LABEL_COPY[activeBeat?.label ?? "neutral"].toLowerCase()}`
            : player.ended
              ? "curtain"
              : "press play to perform"
        }
        actions={
          <>
            <button type="button" className="btn btn--ghost" onClick={player.toggle}>
              <Icon name={player.playing ? "pause" : "play"} size={14} />
              {player.playing ? "pause" : "play"}
            </button>
            <button type="button" className="btn btn--ghost" onClick={handleCard}>
              <Icon name="download" size={14} />
              card
            </button>
          </>
        }
      />

      <Card className="score-card">
        <CardHeader
          icon="grid"
          title="Score"
          hint={`${performance.beats.length} beats`}
        />
        <div className="beats">
          {performance.beats.map((beat, index) => (
            <BeatBlock
              key={beat.id}
              beat={beat}
              index={index}
              total={performance.beats.length}
              active={index === player.activeIndex}
              past={index < player.activeIndex}
              currentWord={
                index === player.activeIndex ? player.currentWord : -1
              }
              onSeek={player.seek}
            />
          ))}
        </div>
      </Card>

      <Card className="now-card">
        <CardHeader
          icon="spark"
          title="Now reading"
          hint={
            player.playing ? "playing" : player.ended ? "finished" : "selected"
          }
          action={
            <span className="performance-time">
              {formatTime(player.elapsedMs)}
            </span>
          }
        />
        <div className="now-top">
          <ProgressRing
            value={activeBeat?.confidence ?? 0}
            size={84}
            stroke={8}
            color={activeColor}
            label={`${Math.round((activeBeat?.confidence ?? 0) * 100)}%`}
            sublabel="conf"
          />
          <div className="now-copy">
            <span className="now-label">
              {LABEL_COPY[activeBeat?.label ?? "neutral"]}
            </span>
            <p className="now-quote">
              “
              {activeBeat
                ? truncateWords(activeBeat.quote, 24)
                : performance.document.summary}
              ”
            </p>
          </div>
        </div>
      </Card>

      <Card className="settings-card">
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          hydrated={hydrated}
          health={health}
        />
      </Card>
    </div>
  );
}

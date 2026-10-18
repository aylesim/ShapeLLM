"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { wordIndexAtChar } from "@/lib/reading/anchor";
import type { Beat } from "@/lib/reading/types";

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function estimateDuration(text: string, rate: number): number {
  const words = countWords(text);
  const seconds = words / (2.55 * Math.max(0.5, rate)) + 0.35;
  return Math.round(seconds * 1000);
}

function getSynth(): SpeechSynthesis | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  return window.speechSynthesis;
}

export type PerformancePlayer = {
  playing: boolean;
  activeIndex: number;
  currentWord: number;
  progress: number;
  elapsedMs: number;
  totalMs: number;
  overallProgress: number;
  ended: boolean;
  voiceOn: boolean;
  supported: boolean;
  voices: SpeechSynthesisVoice[];
  voiceURI: string | null;
  rate: number;
  loop: boolean;
  voiceError: string | null;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  stop: () => void;
  restart: () => void;
  seek: (index: number) => void;
  playFrom: (index: number) => void;
  setVoiceOn: (value: boolean) => void;
  setRate: (value: number) => void;
  setVoiceURI: (value: string) => void;
  toggleLoop: () => void;
};

export function usePerformancePlayer(beats: Beat[]): PerformancePlayer {
  const [playing, setPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [currentWord, setCurrentWord] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [ended, setEnded] = useState(false);
  const [voiceOn, setVoiceOnState] = useState(true);
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURIState] = useState<string | null>(null);
  const [rate, setRateState] = useState(1);
  const [loop, setLoop] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const beatsRef = useRef(beats);
  const playingRef = useRef(false);
  const activeIndexRef = useRef(0);
  const progressRef = useRef(0);
  const voiceOnRef = useRef(true);
  const voiceURIRef = useRef<string | null>(null);
  const rateRef = useRef(1);
  const loopRef = useRef(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const runBeatRef = useRef<(index: number, useVoice: boolean) => void>(() => {});

  const clearTimers = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const cancelSpeech = useCallback(() => {
    const synth = getSynth();
    if (synth) synth.cancel();
  }, []);

  const setActive = useCallback((index: number) => {
    activeIndexRef.current = index;
    setActiveIndex(index);
  }, []);

  const setProgressValue = useCallback((value: number) => {
    progressRef.current = value;
    setProgress(value);
  }, []);

  useEffect(() => {
    setSupported(Boolean(getSynth()));

    const synth = getSynth();
    if (!synth) return;

    const load = () => {
      const all = synth.getVoices();
      const novelty =
        /^(Bells|Boing|Bubbles|Cellos|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Bad News|Good News|Bahh|Fred|Junior|Ralph|Albert|Kathy|Grandma|Grandpa)/i;
      const filtered = all
        .filter((voice) => /^(en|it)/i.test(voice.lang) && !novelty.test(voice.name))
        .sort(
          (a, b) =>
            a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name),
        );
      const final = filtered.length > 0 ? filtered : all;
      voicesRef.current = final;
      setVoices(final);
      if (!voiceURIRef.current && final[0]) {
        voiceURIRef.current = final[0].voiceURI;
        setVoiceURIState(final[0].voiceURI);
      }
    };

    load();
    synth.onvoiceschanged = load;
    return () => {
      synth.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    beatsRef.current = beats;
    playingRef.current = false;
    setPlaying(false);
    clearTimers();
    cancelSpeech();
    setActive(0);
    setProgressValue(0);
    setCurrentWord(-1);
    setEnded(false);
  }, [beats, clearTimers, cancelSpeech, setActive, setProgressValue]);

  useEffect(() => {
    return () => {
      playingRef.current = false;
      clearTimers();
      cancelSpeech();
    };
  }, [clearTimers, cancelSpeech]);

  const runBeat = useCallback(
    (index: number, useVoice: boolean) => {
      const list = beatsRef.current;
      clearTimers();
      cancelSpeech();

      if (index < 0 || index >= list.length) {
        playingRef.current = false;
        setPlaying(false);
        return;
      }

      const beat = list[index];
      const wordCount = countWords(beat.quote);
      const duration = estimateDuration(beat.quote, rateRef.current);
      const started = performance.now();

      playingRef.current = true;
      setPlaying(true);
      setEnded(false);
      setActive(index);
      setProgressValue(0);
      setCurrentWord(-1);

      let done = false;
      let boundarySeen = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimers();
        if (index >= list.length - 1) {
          if (loopRef.current) {
            runBeatRef.current(0, useVoice);
            return;
          }
          playingRef.current = false;
          setPlaying(false);
          setProgressValue(1);
          setEnded(true);
          return;
        }
        timeoutRef.current = window.setTimeout(() => {
          runBeatRef.current(index + 1, voiceOnRef.current);
        }, 240);
      };

      const tick = () => {
        if (!playingRef.current) return;
        const elapsed = performance.now() - started;
        const value = Math.min(1, elapsed / duration);
        setProgressValue(value);
        if (!useVoice || !boundarySeen) {
          setCurrentWord(Math.min(wordCount - 1, Math.floor(value * wordCount)));
        }
        if (value < 1 && rafRef.current !== null) {
          rafRef.current = requestAnimationFrame(tick);
        }
      };
      rafRef.current = requestAnimationFrame(tick);

      const synth = getSynth();
      if (useVoice && synth) {
        const utterance = new SpeechSynthesisUtterance(beat.quote);
        utterance.rate = rateRef.current;
        utterance.pitch = 1;
        const voice = voicesRef.current.find(
          (item) => item.voiceURI === voiceURIRef.current,
        );
        if (voice) utterance.voice = voice;

        utterance.onboundary = (event) => {
          if (event.name && event.name !== "word") return;
          boundarySeen = true;
          const charIndex = event.charIndex ?? 0;
          setCurrentWord(wordIndexAtChar(beat.quote, charIndex));
        };
        utterance.onend = finish;
        utterance.onerror = (event) => {
          if (event.error === "interrupted" || event.error === "canceled") return;
          setVoiceError("The browser voice failed. Continuing in silent mode.");
          setVoiceOnState(false);
          voiceOnRef.current = false;
          runBeatRef.current(index, false);
        };

        synth.speak(utterance);
        timeoutRef.current = window.setTimeout(finish, duration + 1800);
      } else {
        timeoutRef.current = window.setTimeout(finish, duration);
      }
    },
    [cancelSpeech, clearTimers, setActive, setProgressValue],
  );

  useEffect(() => {
    runBeatRef.current = runBeat;
  }, [runBeat]);

  const play = useCallback(() => {
    if (playingRef.current) return;
    const index =
      activeIndexRef.current >= beatsRef.current.length ? 0 : activeIndexRef.current;
    runBeat(index, voiceOnRef.current);
  }, [runBeat]);

  const pause = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    clearTimers();
    cancelSpeech();
  }, [cancelSpeech, clearTimers]);

  const toggle = useCallback(() => {
    if (playingRef.current) pause();
    else play();
  }, [pause, play]);

  const stop = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    clearTimers();
    cancelSpeech();
    setActive(0);
    setProgressValue(0);
    setCurrentWord(-1);
    setEnded(false);
  }, [cancelSpeech, clearTimers, setActive, setProgressValue]);

  const restart = useCallback(() => {
    runBeat(0, voiceOnRef.current);
  }, [runBeat]);

  const seek = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(beatsRef.current.length - 1, index));
      setActive(clamped);
      setProgressValue(0);
      setCurrentWord(-1);
      setEnded(false);
      if (playingRef.current) {
        runBeat(clamped, voiceOnRef.current);
      }
    },
    [runBeat, setActive, setProgressValue],
  );

  const playFrom = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(beatsRef.current.length - 1, index));
      setActive(clamped);
      setProgressValue(0);
      setEnded(false);
      runBeat(clamped, voiceOnRef.current);
    },
    [runBeat, setActive, setProgressValue],
  );

  const setVoiceOn = useCallback(
    (value: boolean) => {
      setVoiceOnState(value);
      voiceOnRef.current = value;
      if (value) setVoiceError(null);
      if (playingRef.current) {
        runBeat(activeIndexRef.current, value);
      }
    },
    [runBeat],
  );

  const setRate = useCallback(
    (value: number) => {
      setRateState(value);
      rateRef.current = value;
      if (playingRef.current) {
        runBeat(activeIndexRef.current, voiceOnRef.current);
      }
    },
    [runBeat],
  );

  const setVoiceURI = useCallback(
    (value: string) => {
      setVoiceURIState(value);
      voiceURIRef.current = value;
    },
    [],
  );

  const toggleLoop = useCallback(() => {
    const next = !loopRef.current;
    loopRef.current = next;
    setLoop(next);
  }, []);

  const totalMs = useMemo(
    () =>
      beats.reduce(
        (sum, beat) => sum + estimateDuration(beat.quote, rate),
        0,
      ),
    [beats, rate],
  );

  const elapsedMs = useMemo(() => {
    const before = beats
      .slice(0, activeIndex)
      .reduce((sum, beat) => sum + estimateDuration(beat.quote, rate), 0);
    const currentBeat = beats[activeIndex];
    const current = currentBeat
      ? estimateDuration(currentBeat.quote, rate) * progress
      : 0;
    return Math.min(totalMs, before + current);
  }, [activeIndex, beats, progress, rate, totalMs]);

  return {
    playing,
    activeIndex,
    currentWord,
    progress,
    elapsedMs,
    totalMs,
    overallProgress: totalMs > 0 ? elapsedMs / totalMs : 0,
    ended,
    voiceOn,
    supported,
    voices,
    voiceURI,
    rate,
    loop,
    voiceError,
    play,
    pause,
    toggle,
    stop,
    restart,
    seek,
    playFrom,
    setVoiceOn,
    setRate,
    setVoiceURI,
    toggleLoop,
  };
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

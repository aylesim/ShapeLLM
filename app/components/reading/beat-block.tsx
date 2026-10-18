"use client";

import { affectToCss } from "@/lib/reading/palette";
import { LABEL_COPY, type Beat } from "@/lib/reading/types";

type BeatBlockProps = {
  beat: Beat;
  index: number;
  total: number;
  active: boolean;
  past: boolean;
  currentWord: number;
  onSeek: (index: number) => void;
};

export function BeatBlock({
  beat,
  index,
  total,
  active,
  past,
  currentWord,
  onSeek,
}: BeatBlockProps) {
  const color = affectToCss(beat.axes.valence.value, beat.axes.arousal.value);
  const rawTokens = beat.quote.split(/(\s+)/);
  const tokens = rawTokens.map((token, tokenIndex) => ({
    token,
    word: /^\s+$/.test(token)
      ? -1
      : rawTokens
          .slice(0, tokenIndex)
          .filter((item) => !/^\s+$/.test(item)).length,
  }));

  return (
    <button
      type="button"
      className="beat"
      data-active={active}
      data-past={past}
      style={{ borderLeftColor: active ? "var(--accent)" : color }}
      onClick={() => onSeek(index)}
      aria-current={active ? "true" : undefined}
      aria-label={`Beat ${index + 1} of ${total}: ${LABEL_COPY[beat.label]}`}
    >
      <span className="beat-meta">
        <span className="beat-index">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span
          className="beat-label-dot"
          style={{ color }}
          aria-hidden="true"
        />
        <span className="beat-label" style={{ color }}>
          {LABEL_COPY[beat.label]}
        </span>
        <span>·</span>
        <span>{Math.round(beat.confidence * 100)}% conf</span>
      </span>
      <span className="beat-text">
        {tokens.map(({ token, word }, tokenIndex) => {
          if (word < 0) {
            return token;
          }
          const highlighted = active && word === currentWord;
          return (
            <span
              key={`${tokenIndex}-${token}`}
              className={highlighted ? "word-active" : undefined}
            >
              {token}
            </span>
          );
        })}
      </span>
      {beat.note ? <span className="beat-note">{beat.note}</span> : null}
    </button>
  );
}

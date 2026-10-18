"use client";

import { Icon } from "@/app/components/ui/icons";

const countFormat = new Intl.NumberFormat("en-US");

type ComposerProps = {
  text: string;
  onTextChange: (value: string) => void;
  onInterpret: () => void;
  onClear: () => void;
  onLoadSample: (value: string) => void;
  samples: Array<{ label: string; text: string }>;
  status: "idle" | "reading" | "error";
  limit: number;
  auto: boolean;
  onAutoChange: (value: boolean) => void;
};

export function Composer({
  text,
  onTextChange,
  onInterpret,
  onClear,
  onLoadSample,
  samples,
  status,
  limit,
  auto,
  onAutoChange,
}: ComposerProps) {
  const overLimit = text.length > limit;
  const disabled = status === "reading" || overLimit || !text.trim();

  return (
    <div className="composer">
      <div className="composer-toolbar">
        <span className="composer-label">text</span>
        <label className="composer-toggle" title="Read automatically after you pause">
          <input
            type="checkbox"
            checked={auto}
            onChange={(event) => onAutoChange(event.target.checked)}
          />
          auto
        </label>
      </div>

      <textarea
        className="composer-textarea"
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            if (!disabled) onInterpret();
          }
        }}
        rows={7}
        spellCheck
        placeholder="Write a sentence. Or paste something that already has a temperature…"
        aria-label="Text to interpret"
      />

      <div className="composer-row">
        <button
          type="button"
          className="btn btn--primary btn--lg"
          onClick={onInterpret}
          disabled={disabled}
          aria-busy={status === "reading"}
        >
          {status === "reading" ? (
            <>
              <span className="source-dot" style={{ background: "var(--accent)" }} />
              Reading…
            </>
          ) : (
            <>
              Interpret
              <Icon name="arrow" size={14} />
            </>
          )}
        </button>
        <button type="button" className="btn" onClick={onClear} disabled={!text}>
          Clear
        </button>
        <span className="composer-count" data-over={overLimit}>
          {countFormat.format(text.length)} / {countFormat.format(limit)}
        </span>
      </div>

      <div className="sample-row" aria-label="Sample texts">
        {samples.map((sample) => (
          <button
            key={sample.label}
            type="button"
            className="sample-chip"
            onClick={() => onLoadSample(sample.text)}
          >
            {sample.label}
          </button>
        ))}
      </div>
    </div>
  );
}

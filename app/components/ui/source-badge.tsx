import type { Source } from "@/lib/reading/types";

const COPY: Record<Source, { label: string; tone: string }> = {
  llm: { label: "LLM", tone: "live" },
  heuristic: { label: "Local preview", tone: "local" },
  curated: { label: "Curated", tone: "curated" },
};

export function SourceBadge({
  source,
  className = "",
}: {
  source: Source;
  className?: string;
}) {
  const item = COPY[source];
  return (
    <span className={`source-badge source-badge--${item.tone} ${className}`}>
      <span className="source-dot" aria-hidden="true" />
      {item.label}
    </span>
  );
}

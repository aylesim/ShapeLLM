"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SpecimenGlyph } from "@/app/components/ui/glyph";
import { Icon } from "@/app/components/ui/icons";
import { MiniAxes } from "@/app/components/ui/mini-axes";
import { CURATED_SPECIMENS } from "@/lib/reading/fixtures";
import { LABEL_COPY, type ReadingLabel } from "@/lib/reading/types";
import { encodeShare } from "@/lib/reading/share";

const FILTERS: Array<{ label: string; value: ReadingLabel | "all" }> = [
  { label: "All", value: "all" },
  { label: "Serene", value: "serene" },
  { label: "Warm", value: "warm" },
  { label: "Ironic", value: "ironic" },
  { label: "Tense", value: "tense" },
  { label: "Furious", value: "furious" },
  { label: "Melancholy", value: "melancholy" },
];

export function SpecimensGrid() {
  const [filter, setFilter] = useState<ReadingLabel | "all">("all");
  const specimens = useMemo(
    () =>
      filter === "all"
        ? CURATED_SPECIMENS
        : CURATED_SPECIMENS.filter(
            (specimen) => specimen.reading.label === filter,
          ),
    [filter],
  );

  return (
    <div className="specimens-page">
      <div className="list-toolbar">
        <div className="filter-row" role="group" aria-label="Filter specimens">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              className="filter-chip"
              data-active={filter === item.value}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <span className="list-count">
          {specimens.length} {specimens.length === 1 ? "specimen" : "specimens"}
        </span>
      </div>

      {specimens.length > 0 ? (
        <div className="specimen-grid">
          {specimens.map((specimen) => (
            <Link
              key={specimen.id}
              href={`/?s=${encodeShare({ text: specimen.text, mode: "single" })}`}
              className="specimen-card card"
            >
              <div className="specimen-card-top">
                <div className="specimen-card-copy">
                  <span className="specimen-label">
                    {LABEL_COPY[specimen.reading.label]} ·{" "}
                    {specimen.reading.language.toUpperCase()}
                  </span>
                  <h3 className="specimen-title">{specimen.title}</h3>
                </div>
                <SpecimenGlyph
                  reading={specimen.reading}
                  size={62}
                  showGrid={false}
                />
              </div>

              <p className="specimen-text">
                “{specimen.text.length > 200
                  ? `${specimen.text.slice(0, 198)}…`
                  : specimen.text}”
              </p>

              <div className="specimen-card-foot">
                <MiniAxes axes={specimen.reading.axes} />
                <span className="specimen-card-id">
                  {specimen.reading.id.replace(/^spec-/, "")}
                </span>
                <span className="specimen-card-open">
                  open
                  <Icon name="arrow" size={12} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No specimen with this label.</p>
          <button type="button" className="link-button" onClick={() => setFilter("all")}>
            reset filter
          </button>
        </div>
      )}
    </div>
  );
}

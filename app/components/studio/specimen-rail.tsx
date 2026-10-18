"use client";

import { SpecimenGlyph } from "@/app/components/ui/glyph";
import { Icon } from "@/app/components/ui/icons";
import type { CuratedSpecimen } from "@/lib/reading/fixtures";
import { LABEL_COPY } from "@/lib/reading/types";

type SpecimenRailProps = {
  specimens: CuratedSpecimen[];
  activeId?: string | null;
  onSelect: (specimen: CuratedSpecimen) => void;
};

export function SpecimenRail({ specimens, activeId, onSelect }: SpecimenRailProps) {
  return (
    <div className="specimen-list">
      {specimens.map((specimen) => (
        <button
          key={specimen.id}
          type="button"
          className="specimen-list-item"
          data-active={activeId === specimen.id}
          onClick={() => onSelect(specimen)}
        >
          <SpecimenGlyph reading={specimen.reading} size={32} showGrid={false} />
          <span className="specimen-list-copy">
            <span className="specimen-list-title">{specimen.title}</span>
            <span className="specimen-list-label">
              {LABEL_COPY[specimen.reading.label]} ·{" "}
              {specimen.reading.language.toUpperCase()}
            </span>
          </span>
          <Icon name="arrow" size={13} />
        </button>
      ))}
    </div>
  );
}

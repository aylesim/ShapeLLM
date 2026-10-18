import type { ReactNode } from "react";
import SpecimenStage from "@/app/components/stage/specimen-stage";
import type { AffectVector } from "@/lib/reading/types";

type StageCardProps = {
  vector: AffectVector;
  seed: number;
  voiceLevel?: number;
  headerLeft: ReactNode;
  headerRight?: ReactNode;
  footerLeft?: ReactNode;
  actions?: ReactNode;
  showCage?: boolean;
  className?: string;
};

export function StageCard({
  vector,
  seed,
  voiceLevel = 0,
  headerLeft,
  headerRight,
  footerLeft,
  actions,
  showCage = true,
  className = "",
}: StageCardProps) {
  return (
    <section className={`card stage-card ${className}`}>
      <div className="stage-card-head">
        <div className="stage-card-meta">{headerLeft}</div>
        {headerRight ? <div className="stage-card-right">{headerRight}</div> : null}
      </div>
      <div className="stage-viewport">
        <SpecimenStage
          vector={vector}
          seed={seed}
          voiceLevel={voiceLevel}
          showCage={showCage}
        />
      </div>
      <div className="stage-card-foot">
        <span className="stage-card-note">{footerLeft}</span>
        <div className="stage-card-actions">{actions}</div>
      </div>
    </section>
  );
}

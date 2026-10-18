import type { ReactNode } from "react";

export function SectionLabel({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="section-label">
      <span className="section-label-text">{children}</span>
      <span className="section-label-line" aria-hidden="true" />
      {action ? <span className="section-label-action">{action}</span> : null}
    </div>
  );
}

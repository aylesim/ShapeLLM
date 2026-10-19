import type { HTMLAttributes, ReactNode } from "react";
import type { IconName } from "./icons";

type CardProps = HTMLAttributes<HTMLElement> & {
  flush?: boolean;
};

export function Card({ children, className = "", flush = false, ...props }: CardProps) {
  return (
    <section className={`card ${flush ? "card--flush" : ""} ${className}`} {...props}>
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  hint,
  action,
}: {
  icon?: IconName;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card-header">
      <div className="card-title-copy">
        <h2 className="card-title">{title}</h2>
        {hint ? <p className="card-hint">{hint}</p> : null}
      </div>
      {action ? <div className="card-action">{action}</div> : null}
    </div>
  );
}

import type { HTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./icons";

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
  icon,
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
      <div className="card-title-row">
        {icon ? (
          <span className="card-icon" aria-hidden="true">
            <Icon name={icon} size={15} />
          </span>
        ) : null}
        <div className="card-title-copy">
          <h2 className="card-title">{title}</h2>
          {hint ? <p className="card-hint">{hint}</p> : null}
        </div>
      </div>
      {action ? <div className="card-action">{action}</div> : null}
    </div>
  );
}

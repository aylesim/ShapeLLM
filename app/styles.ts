const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]";

const FOCUS_RING_COMPACT =
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--border-strong)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg)]";

export const FIELD_CLASS = `w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2.5 text-sm text-[var(--fg)] transition-colors placeholder:text-[var(--fg-subtle)] focus-visible:border-[var(--border-strong)] ${FOCUS_RING}`;

export const FIELD_COMPACT_CLASS = `w-full rounded border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-1.5 text-xs text-[var(--fg)] transition-colors placeholder:text-[var(--fg-subtle)] focus-visible:border-[var(--border-strong)] ${FOCUS_RING_COMPACT}`;

export const BUTTON_PRIMARY_CLASS = `rounded-lg border border-[var(--border-strong)] bg-[var(--inverse-bg)] px-4 py-2.5 text-sm font-medium text-[var(--inverse-fg)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35 ${FOCUS_RING}`;

export const BUTTON_PRIMARY_COMPACT_CLASS = `rounded border border-[var(--border-strong)] bg-[var(--inverse-bg)] px-2.5 py-1 text-xs font-medium text-[var(--inverse-fg)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35 ${FOCUS_RING_COMPACT}`;

export const BUTTON_SECONDARY_CLASS = `rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-xs text-[var(--fg-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--fg)] disabled:opacity-35 ${FOCUS_RING}`;

export const BUTTON_SECONDARY_COMPACT_CLASS = `rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-[var(--fg-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--fg)] disabled:opacity-35 ${FOCUS_RING_COMPACT}`;

export const PANEL_CLASS =
  "rounded border border-[var(--border)] bg-[var(--surface)] p-2.5";

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import ThemeToggle from "./theme-toggle";
import { StatusPill } from "./status-pill";
import { Icon, type IconName } from "./ui/icons";
import { SpecimenGlyph } from "./ui/glyph";
import { CURATED_SPECIMENS } from "@/lib/reading/fixtures";

const NAV: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/", label: "Studio", icon: "grid" },
  { href: "/reading", label: "Reading Room", icon: "volume" },
  { href: "/specimens", label: "Specimens", icon: "cube" },
  { href: "/lab", label: "Lab", icon: "beaker" },
];

const PAGES: Record<
  string,
  { label: string; title: string; subtitle: string }
> = {
  "/": {
    label: "Studio",
    title: "Studio",
    subtitle: "Read a text, inspect the evidence, and grow a specimen.",
  },
  "/reading": {
    label: "Reading Room",
    title: "Reading Room",
    subtitle: "A text is not a point. It's a trajectory.",
  },
  "/specimens": {
    label: "Specimens",
    title: "Specimens",
    subtitle: "A cabinet of readings: six texts, six bodies.",
  },
  "/lab": {
    label: "Lab",
    title: "Lab",
    subtitle: "Does it actually read? The method, the baseline, the failures.",
  },
};

const SIDEBAR_SPECIMEN = CURATED_SPECIMENS[0];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname === "/studio";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const page = PAGES[pathname] ?? PAGES["/"];

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link href="/" className="sidebar-brand" aria-label="ShapeLLM home">
          <span className="sidebar-logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
              <path d="m4 7.5 8 4.5 8-4.5" />
              <path d="M12 12v9" />
            </svg>
          </span>
          <span className="sidebar-brand-copy">
            <span className="sidebar-name">ShapeLLM</span>
            <span className="sidebar-tagline">affective instrument</span>
          </span>
          <span className="sidebar-version">v2</span>
        </Link>

        <div className="sidebar-section">
          <p className="sidebar-label">Workspace</p>
          <nav className="sidebar-nav" aria-label="Main">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="sidebar-link"
                data-active={isActive(pathname, item.href)}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
              >
                <span className="sidebar-icon" aria-hidden="true">
                  <Icon name={item.icon} size={16} />
                </span>
                <span>{item.label}</span>
                <span className="sidebar-arrow" aria-hidden="true">
                  <Icon name="chevron" size={12} />
                </span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="sidebar-instrument">
          <div className="sidebar-instrument-head">
            <span>instrument</span>
            <span className="sidebar-instrument-tag">6 axes</span>
          </div>
          <SpecimenGlyph
            reading={SIDEBAR_SPECIMEN.reading}
            size={92}
            className="sidebar-glyph"
          />
          <p className="sidebar-instrument-title">{SIDEBAR_SPECIMEN.title}</p>
          <p className="sidebar-instrument-note">A reading is a specimen.</p>
        </div>

        <div className="sidebar-bottom">
          <a
            href="https://github.com/aylesim"
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-profile"
          >
            <span className="sidebar-avatar" aria-hidden="true">
              AM
            </span>
            <span className="sidebar-profile-copy">
              <span className="sidebar-profile-name">Alessandro</span>
              <span className="sidebar-profile-role">author</span>
            </span>
            <Icon name="arrow" size={13} />
          </a>
          <p className="sidebar-note">
            Readings are interpretations, not diagnoses.
          </p>
        </div>
      </aside>

      <main className="app-main">
        <header className="app-topbar">
          <div className="app-topbar-copy">
            <p className="app-kicker">workspace / {page.label.toLowerCase()}</p>
            <h1 className="app-title">{page.title}</h1>
            <p className="app-sub">{page.subtitle}</p>
          </div>
          <div className="app-topbar-actions">
            <StatusPill />
            <ThemeToggle />
            <a
              href="https://github.com/aylesim/ShapeLLM"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--icon"
              aria-label="ShapeLLM on GitHub"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34a2.65 2.65 0 0 0-1.11-1.46c-.91-.62.07-.61.07-.61a2.1 2.1 0 0 1 1.53 1.03 2.13 2.13 0 0 0 2.91.83 2.13 2.13 0 0 1 .63-1.34c-2.22-.25-4.55-1.11-4.55-4.94a3.87 3.87 0 0 1 1.03-2.69 3.6 3.6 0 0 1 .1-2.65s.84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02a3.6 3.6 0 0 1 .1 2.65 3.87 3.87 0 0 1 1.03 2.69c0 3.84-2.34 4.69-4.57 4.94a2.39 2.39 0 0 1 .68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
              </svg>
            </a>
          </div>
        </header>
        <div className="app-content">{children}</div>
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { fetchHealth } from "@/lib/reading/client";

export function StatusPill() {
  const [status, setStatus] = useState<"checking" | "live" | "local">("checking");

  useEffect(() => {
    let active = true;
    void fetchHealth().then((health) => {
      if (!active) return;
      setStatus(health?.live ? "live" : "local");
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <span className="status-pill" data-status={status}>
      <span className="status-dot" aria-hidden="true" />
      {status === "checking"
        ? "checking"
        : status === "live"
          ? "live model"
          : "local engine"}
    </span>
  );
}

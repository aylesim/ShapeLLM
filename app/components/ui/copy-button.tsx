"use client";

import { useState } from "react";
import { copyToClipboard } from "@/lib/reading/share";
import { Icon } from "./icons";

type CopyButtonProps = {
  value: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  icon?: boolean;
};

export function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  className = "",
  icon = true,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={`btn btn--ghost ${className}`}
      onClick={async () => {
        const ok = await copyToClipboard(value);
        if (!ok) return;
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }}
    >
      {icon ? <Icon name={copied ? "check" : "copy"} size={14} /> : null}
      {copied ? copiedLabel : label}
    </button>
  );
}

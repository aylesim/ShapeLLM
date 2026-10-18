export type SharePayload = {
  text: string;
  mode: "single" | "reading";
};

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    value.length + ((4 - (value.length % 4)) % 4),
    "=",
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new TextDecoder().decode(bytes);
}

export function encodeShare(payload: SharePayload): string {
  return toBase64Url(JSON.stringify(payload));
}

export function decodeShare(value: string): SharePayload | null {
  try {
    const parsed = JSON.parse(fromBase64Url(value)) as Partial<SharePayload>;
    if (typeof parsed.text !== "string" || !parsed.text.trim()) return null;
    if (parsed.mode !== "single" && parsed.mode !== "reading") return null;
    return { text: parsed.text, mode: parsed.mode };
  } catch {
    return null;
  }
}

export function readShareFromLocation(): SharePayload | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get("s");
  return encoded ? decodeShare(encoded) : null;
}

export function shareUrl(payload: SharePayload): string {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("s", encodeShare(payload));
  return url.toString();
}

export async function copyToClipboard(value: string): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

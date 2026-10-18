import type { Beat, Evidence } from "./types";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function quotePattern(quote: string): RegExp | null {
  const tokens = quote
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(escapeRegExp);
  if (tokens.length === 0) return null;
  return new RegExp(tokens.join("\\s+"), "i");
}

export type Anchor = {
  start: number;
  end: number;
  anchored: boolean;
};

export function anchorQuote(text: string, quote: string, from = 0): Anchor {
  const clean = quote.trim();
  if (!clean) return { start: from, end: from, anchored: false };

  const exact = text.indexOf(clean, Math.max(0, from));
  if (exact !== -1) {
    return { start: exact, end: exact + clean.length, anchored: true };
  }

  const pattern = quotePattern(clean);
  if (pattern) {
    const slice = text.slice(Math.max(0, from));
    const match = pattern.exec(slice);
    if (match && match.index !== undefined) {
      const start = Math.max(0, from) + match.index;
      return { start, end: start + match[0].length, anchored: true };
    }
    const globalMatch = pattern.exec(text);
    if (globalMatch && globalMatch.index !== undefined) {
      return {
        start: globalMatch.index,
        end: globalMatch.index + globalMatch[0].length,
        anchored: true,
      };
    }
  }

  return { start: Math.max(0, from), end: Math.max(0, from), anchored: false };
}

export function anchorEvidence(text: string, evidence: Evidence[]): Evidence[] {
  return evidence.map((item) => {
    const anchor = anchorQuote(text, item.quote);
    return {
      ...item,
      start: anchor.start,
      end: anchor.end,
      anchored: anchor.anchored,
    };
  });
}

export function anchorBeats(
  text: string,
  quotes: string[],
): Array<{ quote: string; start: number; end: number; anchored: boolean }> {
  let cursor = 0;
  return quotes.map((quote) => {
    const anchor = anchorQuote(text, quote, cursor);
    if (anchor.anchored) cursor = anchor.end;
    return { quote, ...anchor };
  });
}

export function beatCoverage(text: string, beats: Beat[]): number {
  const total = text.replace(/\s+/g, "").length;
  if (total === 0) return 0;
  const covered = beats.reduce((sum, beat) => {
    if (beat.end <= beat.start) return sum;
    return sum + text.slice(beat.start, beat.end).replace(/\s+/g, "").length;
  }, 0);
  return Math.min(1, covered / total);
}

export function wordStarts(text: string): number[] {
  const starts: number[] = [];
  const pattern = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    starts.push(match.index);
  }
  return starts;
}

export function wordIndexAtChar(text: string, charIndex: number): number {
  const starts = wordStarts(text);
  if (starts.length === 0) return 0;
  let index = 0;
  for (let cursor = 0; cursor < starts.length; cursor += 1) {
    if (starts[cursor] <= charIndex) index = cursor;
    else break;
  }
  return index;
}

export function truncateWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text.trim();
  return `${words.slice(0, maxWords).join(" ")}…`;
}

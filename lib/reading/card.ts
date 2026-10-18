import { truncateWords } from "./anchor";
import { affectToCss, affectToRgb, formatConfidence, formatValue } from "./palette";
import {
  AXES,
  AXIS_META,
  type Axis,
  type Performance,
  type Reading,
} from "./types";

const WIDTH = 1080;
const HEIGHT = 1350;

type CardOptions = {
  reading: Reading;
  performance?: Performance;
  stageCanvas?: HTMLCanvasElement | null;
};

function getFontFamily(variable: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim();
  return value || fallback;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const imageRatio = image.width / image.height;
  const targetRatio = width / height;
  let sourceWidth = image.width;
  let sourceHeight = image.height;
  let sourceX = 0;
  let sourceY = 0;

  if (imageRatio > targetRatio) {
    sourceWidth = image.height * targetRatio;
    sourceX = (image.width - sourceWidth) / 2;
  } else {
    sourceHeight = image.width / targetRatio;
    sourceY = (image.height - sourceHeight) / 2;
  }

  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height,
  );
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
): number {
  const words = text.split(/\s+/);
  let line = "";
  let lines = 0;
  let cursorY = y;

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = word;
      cursorY += lineHeight;
      lines += 1;
      if (lines >= maxLines) {
        ctx.fillText("…", x + ctx.measureText(line).width + 6, cursorY - lineHeight);
        return cursorY;
      }
    } else {
      line = candidate;
    }
  }

  if (line) {
    ctx.fillText(line, x, cursorY);
    cursorY += lineHeight;
  }
  return cursorY;
}

function drawGlyph(
  ctx: CanvasRenderingContext2D,
  reading: Reading,
  cx: number,
  cy: number,
  radius: number,
) {
  const values = AXES.map((axis) => reading.axes[axis].value);
  const angleFor = (index: number) => -Math.PI / 2 + (index * Math.PI * 2) / 6;

  ctx.save();
  ctx.translate(cx, cy);

  for (const ring of [0.33, 0.66, 1]) {
    ctx.beginPath();
    for (let index = 0; index < 6; index += 1) {
      const angle = angleFor(index);
      const x = Math.cos(angle) * radius * ring;
      const y = Math.sin(angle) * radius * ring;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = "rgba(242,238,230,0.12)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  for (let index = 0; index < 6; index += 1) {
    const angle = angleFor(index);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    ctx.strokeStyle = "rgba(242,238,230,0.08)";
    ctx.stroke();
  }

  ctx.beginPath();
  values.forEach((value, index) => {
    const angle = angleFor(index);
    const x = Math.cos(angle) * radius * Math.max(0.08, value);
    const y = Math.sin(angle) * radius * Math.max(0.08, value);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  const [r, g, b] = affectToRgb(reading.axes.valence.value, reading.axes.arousal.value);
  ctx.fillStyle = `rgba(${r},${g},${b},0.18)`;
  ctx.fill();
  ctx.strokeStyle = affectToCss(reading.axes.valence.value, reading.axes.arousal.value);
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

function drawAxes(
  ctx: CanvasRenderingContext2D,
  reading: Reading,
  mono: string,
  x: number,
  y: number,
) {
  const rowHeight = 27;
  const labelWidth = 148;
  const barWidth = 300;

  AXES.forEach((axis: Axis, index) => {
    const meta = AXIS_META[axis];
    const value = reading.axes[axis].value;
    const rowY = y + index * rowHeight;

    ctx.font = `11px ${mono}`;
    ctx.fillStyle = "rgba(185,178,166,0.85)";
    ctx.fillText(meta.label.toUpperCase(), x, rowY + 10);

    ctx.fillStyle = "rgba(242,238,230,0.1)";
    ctx.fillRect(x + labelWidth, rowY + 2, barWidth, 5);
    ctx.fillStyle = meta.color;
    ctx.fillRect(x + labelWidth, rowY + 2, barWidth * value, 5);

    ctx.fillStyle = "rgba(242,238,230,0.9)";
    ctx.font = `12px ${mono}`;
    ctx.fillText(formatValue(value), x + labelWidth + barWidth + 16, rowY + 10);
    ctx.fillStyle = "rgba(125,119,110,0.8)";
    ctx.font = `9px ${mono}`;
    ctx.fillText(
      formatConfidence(reading.axes[axis].confidence),
      x + labelWidth + barWidth + 58,
      rowY + 10,
    );
  });
}

export async function renderSpecimenCard(options: CardOptions): Promise<HTMLCanvasElement> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // continue with fallbacks
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");

  const serif = getFontFamily("--font-geist-mono", "monospace");
  const mono = getFontFamily("--font-geist-mono", "ui-monospace, monospace");

  ctx.fillStyle = "#060606";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = "rgba(237,237,237,0.035)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= WIDTH; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y <= HEIGHT; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(237,237,237,0.2)";
  ctx.strokeRect(40, 40, WIDTH - 80, HEIGHT - 80);

  ctx.fillStyle = "#ededed";
  ctx.font = `18px ${mono}`;
  ctx.fillText("SHAPELLM", 64, 86);
  ctx.fillStyle = "#6b6b6b";
  ctx.font = `11px ${mono}`;
  ctx.fillText("A READING, NOT A DIAGNOSIS", 64, 108);
  ctx.textAlign = "right";
  ctx.fillStyle = "#a3a3a3";
  ctx.fillText(`SPECIMEN ${options.reading.id.replace(/^spec-|^read-/, "").toUpperCase()}`, WIDTH - 64, 86);
  ctx.fillText(`${options.reading.language.toUpperCase()} · ${options.reading.version}`, WIDTH - 64, 108);
  ctx.textAlign = "left";

  const imageX = 64;
  const imageY = 140;
  const imageW = WIDTH - 128;
  const imageH = 560;

  ctx.save();
  roundedRect(ctx, imageX, imageY, imageW, imageH, 4);
  ctx.clip();
  if (options.stageCanvas) {
    drawCover(ctx, options.stageCanvas, imageX, imageY, imageW, imageH);
  } else {
    const gradient = ctx.createRadialGradient(
      WIDTH / 2,
      imageY + imageH / 2,
      20,
      WIDTH / 2,
      imageY + imageH / 2,
      imageW / 2,
    );
    gradient.addColorStop(0, "rgba(216,178,94,0.18)");
    gradient.addColorStop(1, "rgba(8,8,10,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(imageX, imageY, imageW, imageH);
    drawGlyph(ctx, options.reading, WIDTH / 2, imageY + imageH / 2, 170);
  }
  ctx.restore();

  ctx.strokeStyle = "rgba(242,238,230,0.16)";
  roundedRect(ctx, imageX, imageY, imageW, imageH, 4);
  ctx.stroke();

  const label = options.reading.label.toUpperCase();
  ctx.fillStyle = "#b8f36b";
  ctx.font = `11px ${mono}`;
  ctx.fillText(
    options.performance
      ? `A READING IN ${options.performance.beats.length} BEATS · ${options.performance.arc.toUpperCase()}`
      : "SIX AXES · ONE READING",
    64,
    752,
  );

  ctx.fillStyle = "#f2eee6";
  ctx.font = `500 86px ${serif}`;
  ctx.fillText(label, 60, 848);

  ctx.fillStyle = "#a3a3a3";
  ctx.font = `18px ${mono}`;
  wrapText(ctx, options.reading.summary, 64, 892, WIDTH - 128, 28, 3);

  ctx.fillStyle = "#ededed";
  ctx.font = `23px ${mono}`;
  const quoteSource =
    options.performance?.beats.find((beat) => beat.label === "furious")?.quote ??
    options.reading.text;
  const quote = truncateWords(quoteSource.trim(), 26);
  wrapText(ctx, `“${quote}”`, 64, 1002, WIDTH - 128, 30, 3);

  drawAxes(ctx, options.reading, mono, 64, 1112);
  drawGlyph(ctx, options.reading, 888, 1194, 92);

  ctx.fillStyle = "#b8f36b";
  ctx.font = `11px ${mono}`;
  ctx.fillText("TEXT, WITH A BODY.", 64, 1300);
  ctx.textAlign = "right";
  ctx.fillText(
    options.performance
      ? `A READING IN ${options.performance.beats.length} BEATS`
      : "A READING IN SIX AXES",
    WIDTH - 64,
    1300,
  );
  ctx.textAlign = "left";

  return canvas;
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve();
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      resolve();
    }, "image/png");
  });
}

export function getStageCanvas(): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLCanvasElement>("[data-specimen-stage] canvas");
}

export async function downloadSpecimenCard(options: CardOptions): Promise<void> {
  const canvas = await renderSpecimenCard(options);
  await downloadCanvas(
    canvas,
    `shapellm-${options.reading.id.replace(/^spec-|^read-/, "")}.png`,
  );
}

import { createCompatibleCanvas } from './canvasUtils';
import type { PlaceTextStyle } from '@/types';

// Cache for auto text color results
const colorCache = new Map<string, string>();
const MAX_CACHE_SIZE = 100;

/**
 * Wraps text into multiple lines based on max width.
 * Limits to 4 lines and adds ellipsis if truncated.
 */
export const wrapText = (text: string, maxWidth: number, ctx: CanvasRenderingContext2D): string[] => {
  if (!text) return [];

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = words[0];
  const maxLines = 4;

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width;

    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;

      if (lines.length >= maxLines) {
        // Truncate last line
        const lastLine = lines[maxLines - 1];
        lines[maxLines - 1] = lastLine + '...';
        return lines;
      }
    }
  }
  lines.push(currentLine);

  if (lines.length > maxLines) {
     const lastLine = lines[maxLines - 1];
     lines[maxLines - 1] = lastLine + '...';
     return lines.slice(0, maxLines);
  }

  return lines;
};

export const measureTextBounds = (
  lines: string[],
  fontSize: number,
  fontFamily: string,
  ctx: CanvasRenderingContext2D
): { width: number, height: number } => {
  ctx.font = `${fontSize}px ${fontFamily}`; // Ensure font is set
  let maxWidth = 0;
  lines.forEach(line => {
    const w = ctx.measureText(line).width;
    if (w > maxWidth) maxWidth = w;
  });

  const lineHeight = fontSize * 1.2;
  const height = lines.length * lineHeight;

  return { width: maxWidth, height };
};

export const getAutoTextColor = async (
  lat: number,
  lon: number,
  zoom: number,
  tileLayerUrl: string
): Promise<string> => {
  const cacheKey = `${lat}-${lon}-${zoom}-${tileLayerUrl}`;
  if (colorCache.has(cacheKey)) {
    return colorCache.get(cacheKey)!;
  }

  // Implementation of tile coordinate calculation
  const n = Math.pow(2, zoom);
  const latRad = lat * Math.PI / 180;
  const xtile = Math.floor(n * ((lon + 180) / 360));
  const ytile = Math.floor(n * (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2);

  const url = tileLayerUrl
    .replace('{z}', zoom.toString())
    .replace('{x}', xtile.toString())
    .replace('{y}', ytile.toString())
    .replace('{s}', 'a');

  try {
    // We rely on global Image which exists in JSDOM and browser
    const img = new Image();
    img.crossOrigin = 'Anonymous';

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });

    const canvas = createCompatibleCanvas(1, 1);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No context');

    // Draw only the relevant pixel
    const pixelX = (n * ((lon + 180) / 360) * 256) % 256;
    const pixelY = (n * (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * 256) % 256;

    // Draw the image shifted so the pixel is at 0,0
    ctx.drawImage(img, -pixelX, -pixelY);

    const data = ctx.getImageData(0, 0, 1, 1).data;
    const brightness = (0.299 * data[0] + 0.587 * data[1] + 0.114 * data[2]);

    const color = brightness > 128 ? '#000000' : '#ffffff';

    if (colorCache.size >= MAX_CACHE_SIZE) {
        const first = colorCache.keys().next().value;
        if (first) colorCache.delete(first);
    }
    colorCache.set(cacheKey, color);
    return color;
  } catch (e) {
    return '#000000';
  }
};

export const renderTextStroke = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  strokeColor: string,
  strokeWidth: number
) => {
  if (strokeWidth <= 0) return;

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = strokeWidth * 2; // Stroke is centered, so *2 to get desired outer width?
  // Standard implementation: lineWidth is total width. Half outside, half inside.
  // To get a halo of `strokeWidth`, we need lineWidth = strokeWidth * 2.
  ctx.strokeText(text, x, y);
  ctx.restore();
};

export const renderTextWithEffects = (
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  style: PlaceTextStyle
) => {
  const lineHeight = style.fontSize * 1.2;

  ctx.font = `${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`;
  ctx.textAlign = 'center'; // Assuming center alignment for now, or based on position logic
  // The plan said "Determine text position (left or right of icon)".
  // The renderer here just draws at x,y. The caller controls x,y and alignment.
  // But wrapText/measureText assumes alignment might matter? No.
  // Let's assume x,y is the anchor point for the text block.

  // Apply text effects
  const applyEffects = (renderFn: () => void) => {
    ctx.save();

    // Glow
    if (style.glowColor && style.glowBlur && style.glowBlur > 0) {
       ctx.shadowColor = style.glowColor;
       ctx.shadowBlur = style.glowBlur;
       // Render multiple times for stronger glow?
       renderFn();
       renderFn();
    }

    // Drop shadow
    if (style.strokeColor && (!style.glowBlur || style.glowBlur === 0)) {
        // Using stroke as shadow/halo
    }

    ctx.restore();
  };

  // Render loop
  lines.forEach((line, index) => {
    const lineY = y + index * lineHeight;

    // 1. Stroke/Halo
    if (style.strokeColor && style.strokeWidth) {
      renderTextStroke(ctx, line, x, lineY, style.strokeColor, style.strokeWidth);
    }

    // 2. Glow (via shadow)
    if (style.glowColor && style.glowBlur && style.glowBlur > 0) {
      ctx.save();
      ctx.shadowColor = style.glowColor;
      ctx.shadowBlur = style.glowBlur;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = style.color === 'auto' ? '#000000' : style.color; // Fallback
      ctx.fillText(line, x, lineY);
      ctx.restore();
    }

    // 3. Main Text
    ctx.fillStyle = style.color === 'auto' ? '#000000' : style.color;
    ctx.fillText(line, x, lineY);
  });
};

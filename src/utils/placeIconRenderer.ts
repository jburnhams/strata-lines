import type { PlaceIconStyle } from '@/types';
import { createCompatibleCanvas } from './canvasUtils';

// Cache for rendered icons to improve performance
const iconCache = new Map<string, HTMLCanvasElement>();
const MAX_CACHE_SIZE = 50;

const getCacheKey = (style: PlaceIconStyle, size: number, color: string): string => {
  return `${style}-${size}-${color}`;
};

const addToCache = (key: string, canvas: HTMLCanvasElement) => {
  if (iconCache.size >= MAX_CACHE_SIZE) {
    const firstKey = iconCache.keys().next().value;
    if (firstKey) iconCache.delete(firstKey);
  }
  iconCache.set(key, canvas);
};

export const resetIconCache = () => {
  iconCache.clear();
};

export const renderPinIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
  const headRadius = size * 0.4;
  const headCy = y - size + headRadius;

  ctx.beginPath();
  ctx.fillStyle = color;

  // Draw pin shape
  // Arc from roughly 4 o'clock to 8 o'clock (going counter-clockwise/over the top)
  const startAngle = Math.PI / 4; // 45 deg (bottom right)
  const endAngle = Math.PI * 3 / 4; // 135 deg (bottom left)

  ctx.arc(x, headCy, headRadius, startAngle, endAngle, true);

  ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();

  // Highlight (reflection)
  ctx.beginPath();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.arc(x - headRadius * 0.3, headCy - headRadius * 0.3, headRadius * 0.3, 0, Math.PI * 2);
  ctx.fill();
};

export const renderDotIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
  const r = size / 2;
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // White border
  ctx.lineWidth = Math.max(1, size * 0.15);
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
};

export const renderCircleIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
  const r = size / 2;
  ctx.beginPath();
  ctx.fillStyle = '#ffffff'; // White fill
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // Colored stroke
  ctx.lineWidth = Math.max(2, size * 0.2);
  ctx.strokeStyle = color;
  ctx.stroke();
};

export const renderMarkerIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
  // Square-ish marker with rounded corners and point
  const w = size * 0.8;
  const h = size * 0.8;
  const topY = y - size;
  const r = w * 0.2;

  ctx.beginPath();
  ctx.fillStyle = color;

  // Top left
  ctx.moveTo(x - w/2 + r, topY);
  ctx.lineTo(x + w/2 - r, topY);
  ctx.quadraticCurveTo(x + w/2, topY, x + w/2, topY + r);
  ctx.lineTo(x + w/2, topY + h - r);
  ctx.quadraticCurveTo(x + w/2, topY + h, x + w/2 - r, topY + h);

  ctx.lineTo(x, y);

  ctx.lineTo(x - w/2 + r, topY + h);
  ctx.quadraticCurveTo(x - w/2, topY + h, x - w/2, topY + h - r);

  ctx.lineTo(x - w/2, topY + r);
  ctx.quadraticCurveTo(x - w/2, topY, x - w/2 + r, topY);

  ctx.fill();

  // Inner dot
  ctx.beginPath();
  ctx.fillStyle = '#ffffff';
  ctx.arc(x, topY + h/2, w * 0.25, 0, Math.PI * 2);
  ctx.fill();
};

export const renderFlagIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
  const poleH = size;
  const flagW = size * 0.8;
  const flagH = size * 0.5;

  // Pole
  ctx.beginPath();
  ctx.strokeStyle = '#333333';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1, size * 0.1);
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - poleH);
  ctx.stroke();

  // Flag
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.moveTo(x, y - poleH);
  ctx.lineTo(x + flagW, y - poleH + flagH / 2);
  ctx.lineTo(x, y - poleH + flagH);
  ctx.lineTo(x, y - poleH + flagH); // Back to pole
  ctx.fill();
};

export const renderStarIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
  const outerRadius = size / 2;
  const innerRadius = size / 4;
  const spikes = 5;

  let rot = Math.PI / 2 * 3; // Start at top
  let cx = x;
  let cy = y;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);

  for (let i = 0; i < spikes; i++) {
    cx = x + Math.cos(rot) * outerRadius;
    cy = y + Math.sin(rot) * outerRadius;
    ctx.lineTo(cx, cy);
    rot += step;

    cx = x + Math.cos(rot) * innerRadius;
    cy = y + Math.sin(rot) * innerRadius;
    ctx.lineTo(cx, cy);
    rot += step;
  }
  ctx.lineTo(x, y - outerRadius);
  ctx.closePath();

  ctx.fillStyle = color;
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1, size * 0.05);
  ctx.stroke();
};

export const renderIconShadow = (ctx: CanvasRenderingContext2D, style: PlaceIconStyle, x: number, y: number, size: number) => {
  // Only for 3D-ish styles
  if (['pin', 'marker', 'flag'].includes(style)) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.3); // Flatten to create oval
    ctx.beginPath();
    // Shadow size relative to icon size
    ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    if (ctx.filter !== undefined) {
      ctx.filter = 'blur(2px)';
    }
    ctx.fill();
    ctx.restore();
  }
};

/**
 * Renders an icon of the specified style.
 * Uses caching to improve performance for repeated calls with same parameters.
 */
export const renderIcon = (
  ctx: CanvasRenderingContext2D,
  style: PlaceIconStyle,
  x: number,
  y: number,
  size: number,
  color: string
) => {
  // Shadow is rendered directly on destination context because it blends with background
  renderIconShadow(ctx, style, x, y, size);

  const cacheKey = getCacheKey(style, size, color);
  const cached = iconCache.get(cacheKey);

  if (cached) {
    // Draw from cache
    // The cache canvas was created with size * 2
    // The icon is centered at (size, size) in the cache canvas
    // We want to draw it centered at x,y
    const cx = cached.width / 2;
    const cy = cached.height / 2;
    ctx.drawImage(cached, x - cx, y - cy);
    return;
  }

  // Create cache canvas
  const canvasSize = Math.ceil(size * 2);
  const cacheCanvas = createCompatibleCanvas(canvasSize, canvasSize);
  const cacheCtx = cacheCanvas.getContext('2d');

  if (!cacheCtx) return;

  const cx = canvasSize / 2;
  const cy = canvasSize / 2;

  switch (style) {
    case 'pin':
      renderPinIcon(cacheCtx, cx, cy, size, color);
      break;
    case 'dot':
      renderDotIcon(cacheCtx, cx, cy, size, color);
      break;
    case 'circle':
      renderCircleIcon(cacheCtx, cx, cy, size, color);
      break;
    case 'marker':
      renderMarkerIcon(cacheCtx, cx, cy, size, color);
      break;
    case 'flag':
      renderFlagIcon(cacheCtx, cx, cy, size, color);
      break;
    case 'star':
      renderStarIcon(cacheCtx, cx, cy, size, color);
      break;
    default:
      renderPinIcon(cacheCtx, cx, cy, size, color);
  }

  addToCache(cacheKey, cacheCanvas);

  // Draw the newly cached icon
  ctx.drawImage(cacheCanvas, x - cx, y - cy);
};

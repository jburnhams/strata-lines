const SAMPLE_GRID_SIZE = 48;

type RGBA = [number, number, number, number];

type PixelPredicate = (pixel: RGBA) => boolean;

export type LineContentSamplePoint = { x: number; y: number };

export type LineContentSampleGroup = {
    id: string;
    label?: string;
    samplePoints: LineContentSamplePoint[];
    radius?: number;
};

const parseHexColor = (hex: string): [number, number, number] => {
    const normalized = hex.startsWith('#') ? hex.slice(1) : hex;
    if (normalized.length !== 6 || /[^a-fA-F0-9]/.test(normalized)) {
        throw new Error(`Invalid hex color provided: ${hex}`);
    }
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return [r, g, b];
};

const sampleCanvas = (canvas: HTMLCanvasElement, predicate: PixelPredicate): boolean => {
    const width = canvas.width;
    const height = canvas.height;

    if (width === 0 || height === 0) {
        return false;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Canvas 2D context is not available for export validation.');
    }

    const stepX = Math.max(1, Math.floor(width / SAMPLE_GRID_SIZE));
    const stepY = Math.max(1, Math.floor(height / SAMPLE_GRID_SIZE));

    const sampledPoints: Set<string> = new Set();

    const addPoint = (x: number, y: number) => {
        const clampedX = Math.min(Math.max(Math.floor(x), 0), width - 1);
        const clampedY = Math.min(Math.max(Math.floor(y), 0), height - 1);
        const key = `${clampedX},${clampedY}`;
        if (sampledPoints.has(key)) {
            return false;
        }
        sampledPoints.add(key);
        const data = ctx.getImageData(clampedX, clampedY, 1, 1).data;
        return predicate([data[0], data[1], data[2], data[3]]);
    };

    for (let y = 0; y < height; y += stepY) {
        for (let x = 0; x < width; x += stepX) {
            if (addPoint(x, y)) {
                return true;
            }
        }
    }

    // Always sample center and bottom-right corners to catch thin content.
    if (addPoint(width / 2, height / 2)) {
        return true;
    }
    if (addPoint(width - 1, height - 1)) {
        return true;
    }

    return false;
};

const hasOpaquePixelsNear = (
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    point: LineContentSamplePoint,
    radius: number
): boolean => {
    const startX = Math.max(0, Math.floor(point.x - radius));
    const endX = Math.min(canvasWidth - 1, Math.ceil(point.x + radius));
    const startY = Math.max(0, Math.floor(point.y - radius));
    const endY = Math.min(canvasHeight - 1, Math.ceil(point.y + radius));

    if (startX > endX || startY > endY) {
        return false;
    }

    for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            if (pixel[3] > 0) {
                return true;
            }
        }
    }

    return false;
};

export const assertCanvasHasLineContent = (
    canvas: HTMLCanvasElement,
    sampleGroups: LineContentSampleGroup[],
    fallbackRadius: number = 2
): void => {
    if (sampleGroups.length === 0) {
        throw new Error('Export failed: tracks were not rendered before capture.');
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Canvas 2D context is not available for export validation.');
    }

    const { width, height } = canvas;

    const missingGroups: LineContentSampleGroup[] = sampleGroups.filter(group => {
        const radius = group.radius ?? fallbackRadius;
        return !group.samplePoints.some(point => hasOpaquePixelsNear(ctx, width, height, point, radius));
    });

    if (missingGroups.length > 0) {
        const missingLabels = missingGroups.map(group => group.label ?? group.id).join(', ');
        throw new Error(
            missingLabels.length > 0
                ? `Export failed: tracks were not rendered before capture (missing content for: ${missingLabels}).`
                : 'Export failed: tracks were not rendered before capture.'
        );
    }
};

export const assertCanvasHasMapTiles = (canvas: HTMLCanvasElement, backgroundColor: string): void => {
    const [r, g, b] = parseHexColor(backgroundColor);
    const hasNonBackgroundPixel = sampleCanvas(
        canvas,
        ([red, green, blue]) => red !== r || green !== g || blue !== b
    );

    if (!hasNonBackgroundPixel) {
        throw new Error('Export failed: base map tiles were not rendered before capture.');
    }
};

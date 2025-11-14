import type { Track } from '@/types';
import { hexToRgb, rgbToHsv, hsvToRgb, rgbToHex } from '@/services/utils';

/**
 * Calculate perceptual color distance in HSV space
 * This gives a rough approximation of how different two colors appear to human eyes
 */
export const colorDistance = (color1: string, color2: string): number => {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);

    if (!rgb1 || !rgb2) return 0;

    const hsv1 = rgbToHsv(rgb1.r, rgb1.g, rgb1.b);
    const hsv2 = rgbToHsv(rgb2.r, rgb2.g, rgb2.b);

    // Weight hue differences more heavily for perceptual distance
    // Hue wraps around at 360, so we need to calculate the shortest distance
    let hueDiff = Math.abs(hsv1.h - hsv2.h);
    if (hueDiff > 180) {
        hueDiff = 360 - hueDiff;
    }

    // Normalize hue to 0-1 range for comparison with s and v
    const hueDistance = hueDiff / 180;
    const satDistance = Math.abs(hsv1.s - hsv2.s);
    const valDistance = Math.abs(hsv1.v - hsv2.v);

    // Weight hue more heavily (3x) for better perceptual separation
    return Math.sqrt(
        Math.pow(hueDistance * 3, 2) +
        Math.pow(satDistance, 2) +
        Math.pow(valDistance, 2)
    );
};

/**
 * Generate evenly distributed colors across a hue range
 */
export const generateColorPalette = (
    hexStart: string,
    hexEnd: string,
    count: number
): string[] => {
    const rgbStart = hexToRgb(hexStart);
    const rgbEnd = hexToRgb(hexEnd);

    if (!rgbStart || !rgbEnd || count <= 0) return [];

    const hsvStart = rgbToHsv(rgbStart.r, rgbStart.g, rgbStart.b);
    const hsvEnd = rgbToHsv(rgbEnd.r, rgbEnd.g, rgbEnd.b);

    const colors: string[] = [];

    // Calculate hue range, handling wrap-around
    const h1 = hsvStart.h;
    const h2 = hsvEnd.h;
    const hueDiff = Math.abs(h1 - h2);
    const useWrappedRange = hueDiff > 180;

    // Generate colors evenly distributed across the hue range
    // We add some variation in saturation and value for more diversity
    for (let i = 0; i < count; i++) {
        const ratio = count === 1 ? 0.5 : i / (count - 1);

        // Calculate hue
        let h: number;
        if (useWrappedRange) {
            const rangeStart = Math.max(h1, h2);
            const rangeSize = 360 - hueDiff;
            h = (rangeStart + ratio * rangeSize) % 360;
        } else {
            h = h1 + ratio * (h2 - h1);
        }

        // Add slight variation to saturation and value for more color diversity
        // Use a sine wave pattern to create variation
        const sBase = hsvStart.s + ratio * (hsvEnd.s - hsvStart.s);
        const vBase = hsvStart.v + ratio * (hsvEnd.v - hsvStart.v);

        const variation = Math.sin(i * 2.5) * 0.1; // ±10% variation
        const s = Math.max(0, Math.min(1, sBase + variation));
        const v = Math.max(0, Math.min(1, vBase - variation)); // Inverse variation for value

        const rgb = hsvToRgb(h, s, v);
        colors.push(rgbToHex(rgb.r, rgb.g, rgb.b));
    }

    return colors;
};

/**
 * Find the color from availableColors that is furthest from all nearbyColors
 */
const findFurthestColor = (
    availableColors: string[],
    nearbyColors: string[]
): { color: string; index: number } => {
    if (availableColors.length === 0) {
        return { color: '#ff4500', index: -1 }; // fallback
    }

    if (nearbyColors.length === 0) {
        // No nearby colors to compare against, just return the first one
        return { color: availableColors[0], index: 0 };
    }

    let maxMinDistance = -1;
    let bestColor = availableColors[0];
    let bestIndex = 0;

    // For each available color, find the minimum distance to any nearby color
    // Then choose the color with the maximum of these minimum distances
    for (let i = 0; i < availableColors.length; i++) {
        const color = availableColors[i];

        let minDistanceToNearby = Infinity;
        for (const nearbyColor of nearbyColors) {
            const dist = colorDistance(color, nearbyColor);
            minDistanceToNearby = Math.min(minDistanceToNearby, dist);
        }

        if (minDistanceToNearby > maxMinDistance) {
            maxMinDistance = minDistanceToNearby;
            bestColor = color;
            bestIndex = i;
        }
    }

    return { color: bestColor, index: bestIndex };
};

/**
 * Assign colors to tracks using an improved algorithm that minimizes adjacent color similarity
 *
 * Algorithm:
 * 1. Generate 2x as many colors as tracks
 * 2. For each track in order:
 *    - Look at colors of nearby tracks (within 3 positions)
 *    - From remaining colors, pick the one furthest from nearby colors
 *
 * @param tracks - Array of tracks to assign colors to
 * @param hexStart - Starting color in hex format
 * @param hexEnd - Ending color in hex format
 * @param neighborRadius - How many tracks before/after to consider as neighbors (default: 3)
 * @returns Array of tracks with color property assigned
 */
export const assignTrackColors = <T extends Track>(
    tracks: T[],
    hexStart: string,
    hexEnd: string,
    neighborRadius: number = 3
): (T & { color: string })[] => {
    if (tracks.length === 0) return [];

    // Generate 2x as many colors as we have tracks for better selection
    const paletteSize = Math.max(tracks.length * 2, 10);
    const availableColors = generateColorPalette(hexStart, hexEnd, paletteSize);
    const remainingColors = [...availableColors];

    const coloredTracks: (T & { color: string })[] = [];

    for (let i = 0; i < tracks.length; i++) {
        // Get colors of nearby tracks
        const nearbyColors: string[] = [];

        for (let j = Math.max(0, i - neighborRadius); j < i; j++) {
            nearbyColors.push(coloredTracks[j].color);
        }

        // Find the color from remaining colors that's furthest from nearby colors
        const { color, index } = findFurthestColor(remainingColors, nearbyColors);

        // Assign this color to the track
        coloredTracks.push({
            ...tracks[i],
            color
        });

        // Remove the used color from available colors (if it was in the list)
        if (index >= 0) {
            remainingColors.splice(index, 1);
        }

        // If we run out of colors, regenerate the palette
        if (remainingColors.length === 0) {
            remainingColors.push(...availableColors);
        }
    }

    return coloredTracks;
};

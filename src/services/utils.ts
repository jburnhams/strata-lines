import L from 'leaflet';
import type { Track, UnprocessedTrack } from '@/types';

// Color utility functions
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
          }
        : null;
};

export const rgbToHsv = (r: number, g: number, b: number): { h: number; s: number; v: number } => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s, v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max !== min) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s, v };
};

export const hsvToRgb = (h: number, s: number, v: number): { r: number; g: number; b: number } => {
    let r = 0, g = 0, b = 0;
    const i = Math.floor((h / 360) * 6);
    const f = (h / 360) * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
};

export const rgbToHex = (r: number, g: number, b: number): string => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).padStart(6, '0');
};

export const getRandomColorInRange = (hexStart: string, hexEnd: string): string => {
    const rgbStart = hexToRgb(hexStart);
    const rgbEnd = hexToRgb(hexEnd);
    if (!rgbStart || !rgbEnd) return '#ff4500'; // fallback

    const hsvStart = rgbToHsv(rgbStart.r, rgbStart.g, rgbStart.b);
    const hsvEnd = rgbToHsv(rgbEnd.r, rgbEnd.g, rgbEnd.b);
    
    const sMin = Math.min(hsvStart.s, hsvEnd.s);
    const sMax = Math.max(hsvStart.s, hsvEnd.s);
    const vMin = Math.min(hsvStart.v, hsvEnd.v);
    const vMax = Math.max(hsvStart.v, hsvEnd.v);

    const randomS = Math.random() * (sMax - sMin) + sMin;
    const randomV = Math.random() * (vMax - vMin) + vMin;
    
    let randomH: number;
    const h1 = hsvStart.h, h2 = hsvEnd.h;
    const hueDiff = Math.abs(h1 - h2);

    if (hueDiff <= 180) { // Standard range
        randomH = Math.random() * hueDiff + Math.min(h1, h2);
    } else { // Wrapped range
        const rangeStart = Math.max(h1, h2);
        const rangeSize = (360 - hueDiff);
        const rand = Math.random() * rangeSize;
        randomH = (rangeStart + rand) % 360;
    }
    
    const finalRgb = hsvToRgb(randomH, randomS, randomV);
    return rgbToHex(finalRgb.r, finalRgb.g, finalRgb.b);
};

export const getTracksBounds = (tracks: (Track | UnprocessedTrack)[]): L.LatLngBounds | null => {
    if (tracks.length === 0) {
        return null;
    }
    const points: L.LatLng[] = [];
    for (const track of tracks) {
        for (const p of track.points) {
            points.push(L.latLng(p[0], p[1]));
        }
    }
    if (points.length === 0) {
        return null;
    }
    return L.latLngBounds(points);
};

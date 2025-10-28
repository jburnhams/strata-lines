import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock Leaflet for tests
vi.mock('leaflet', () => {
  const createLatLng = (lat: number, lng: number) => ({
    lat,
    lng,
    distanceTo: (other: { lat: number; lng: number }) => {
      // Simple distance calculation for testing
      const R = 6371000; // Earth radius in meters
      const dLat = ((other.lat - lat) * Math.PI) / 180;
      const dLon = ((other.lng - lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat * Math.PI) / 180) *
          Math.cos((other.lat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
  });

  const createLatLngBounds = (sw?: any, ne?: any) => {
    const southWest = sw || { lat: 51.5, lng: -0.2 };
    const northEast = ne || { lat: 51.6, lng: -0.1 };
    return {
      isValid: () => true,
      getNorthEast: () => northEast,
      getSouthWest: () => southWest,
      getNorth: () => northEast.lat,
      getSouth: () => southWest.lat,
      getEast: () => northEast.lng,
      getWest: () => southWest.lng,
      getCenter: () => ({
        lat: (southWest.lat + northEast.lat) / 2,
        lng: (southWest.lng + northEast.lng) / 2,
      }),
    };
  };

  return {
    default: {
      latLng: createLatLng,
      latLngBounds: createLatLngBounds,
      divIcon: vi.fn((options: any) => ({
        options,
        createIcon: vi.fn(),
      })),
      DomEvent: {
        stopPropagation: vi.fn(),
      },
    },
    latLng: createLatLng,
    latLngBounds: createLatLngBounds,
  };
});

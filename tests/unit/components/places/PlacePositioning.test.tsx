
import React from 'react';
import { render, act } from '@testing-library/react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { PlaceCanvasOverlay } from '@/components/places/PlaceCanvasOverlay';
import * as titlePositioningService from '@/services/titlePositioningService';
import { Place, PlaceTitlePosition } from '@/types';
import L from 'leaflet';

// Mock Leaflet's size behavior
jest.mock('react-leaflet', () => {
  const original = jest.requireActual('react-leaflet');
  const L = jest.requireActual('leaflet');
  return {
    ...original,
    useMap: () => ({
      getBounds: () => L.latLngBounds([0, 0], [1, 1]),
      getZoom: () => 10,
      getSize: () => L.point(800, 600),
      getContainer: () => ({ appendChild: () => {}, removeChild: () => {} }),
      on: jest.fn(),
      off: jest.fn(),
      latLngToLayerPoint: jest.fn().mockReturnValue(L.point(0, 0)),
      layerPointToLatLng: jest.fn().mockReturnValue(L.latLng(0, 0)),
      containerPointToLatLng: jest.fn(),
      latLngToContainerPoint: jest.fn(),
    }),
  };
});

// Mock calculateOptimalPositions directly
// Note: When spying on an ESM export, we might encounter issues depending on how it's imported.
// But here we are using `import * as titlePositioningService`.
// If the original function is reassigned, it might fail.
// Let's ensure we are spying correctly.

// Mock HTMLCanvasElement.getContext to return a full mock context
const originalGetContext = HTMLCanvasElement.prototype.getContext;
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn((contextId: string) => {
    if (contextId === '2d') {
      return {
        save: jest.fn(),
        restore: jest.fn(),
        translate: jest.fn(),
        rotate: jest.fn(),
        scale: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        closePath: jest.fn(),
        fill: jest.fn(),
        stroke: jest.fn(),
        arc: jest.fn(),
        rect: jest.fn(),
        fillRect: jest.fn(),
        strokeRect: jest.fn(),
        clearRect: jest.fn(),
        fillText: jest.fn(),
        strokeText: jest.fn(),
        measureText: jest.fn(() => ({ width: 10, height: 10 })),
        setTransform: jest.fn(),
        resetTransform: jest.fn(),
        drawImage: jest.fn(),
        createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
        canvas: document.createElement('canvas'),
        getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
        putImageData: jest.fn(),
        shadowColor: '',
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        font: '',
        textAlign: '',
        textBaseline: '',
        globalAlpha: 1,
        lineJoin: '',
        miterLimit: 0,
      } as unknown as CanvasRenderingContext2D;
    }
    return null;
  }) as any;
});

afterAll(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext;
});

describe('PlacePositioning Integration', () => {
  const mockPlaces: Place[] = [
    {
      id: 'p1',
      title: 'Place 1',
      latitude: 0.5,
      longitude: 0.5,
      createdAt: Date.now(),
      source: 'manual',
      isVisible: true,
      showIcon: true,
      iconStyle: 'pin',
    },
  ];

  let calculateOptimalPositionsSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    calculateOptimalPositionsSpy = jest.spyOn(titlePositioningService, 'calculateOptimalPositions');
  });

  afterEach(() => {
      calculateOptimalPositionsSpy.mockRestore();
  });

  it('calculates positions on mount', async () => {
    await act(async () => {
      render(
        <MapContainer center={[0, 0]} zoom={10}>
             <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="OSM" />
             <PlaceCanvasOverlay places={mockPlaces} />
        </MapContainer>
      );
    });

    expect(calculateOptimalPositionsSpy).toHaveBeenCalled();
  });

  it('caches positions and does not recalculate on same zoom/places/settings', async () => {
    const { rerender } = render(
        <MapContainer center={[0, 0]} zoom={10}>
            <PlaceCanvasOverlay places={mockPlaces} />
        </MapContainer>
    );

    // Initial call
    expect(calculateOptimalPositionsSpy).toHaveBeenCalledTimes(1);

    // Rerender with same props
    rerender(
        <MapContainer center={[0, 0]} zoom={10}>
            <PlaceCanvasOverlay places={mockPlaces} />
        </MapContainer>
    );

    // Should still be 1 (cache hit)
    expect(calculateOptimalPositionsSpy).toHaveBeenCalledTimes(1);
  });

  it('recalculates positions when places change', async () => {
    const { rerender } = render(
        <MapContainer center={[0, 0]} zoom={10}>
            <PlaceCanvasOverlay places={mockPlaces} />
        </MapContainer>
    );

    expect(calculateOptimalPositionsSpy).toHaveBeenCalledTimes(1);

    const newPlaces = [
        ...mockPlaces,
        {
            id: 'p2',
            title: 'Place 2',
            latitude: 0.6,
            longitude: 0.6,
            createdAt: Date.now(),
            source: 'manual',
            isVisible: true,
            showIcon: true,
            iconStyle: 'pin',
        } as Place
    ];

    rerender(
        <MapContainer center={[0, 0]} zoom={10}>
            <PlaceCanvasOverlay places={newPlaces} />
        </MapContainer>
    );

    expect(calculateOptimalPositionsSpy).toHaveBeenCalledTimes(2);
  });
});

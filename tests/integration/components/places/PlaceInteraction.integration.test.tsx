
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { Place, TileLayerDefinition } from '@/types';
import * as db from '@/services/db';
import { MapComponent } from '@/components/MapComponent';
import L from 'leaflet';

// Mock DB
jest.mock('@/services/db');
// Mock IndexedDB
jest.mock('fake-indexeddb/auto');

// We need a stable place ID
const PLACE_ID = 'place1';
const PLACE_TITLE = 'Test Place';

const mockPlace: Place = {
  id: PLACE_ID,
  latitude: 51.505,
  longitude: -0.09,
  title: PLACE_TITLE,
  createdAt: Date.now(),
  source: 'manual',
  isVisible: true,
  showIcon: true,
  iconStyle: 'pin'
};

const mockTileLayer: TileLayerDefinition = {
    key: 'osm',
    name: 'OpenStreetMap',
    layers: [
        {
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: 'OpenStreetMap'
        }
    ]
};

describe('Place Interaction (Leaflet-Node)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (db.getAllPlacesFromDb as jest.Mock).mockResolvedValue([mockPlace]);
    (db.getTracks as jest.Mock).mockResolvedValue([]);
    (db.getTracksByActivityType as jest.Mock).mockResolvedValue([]);

    // Mock requestAnimationFrame to prevent infinite loops if any
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        return setTimeout(cb, 0);
    });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
        clearTimeout(id);
    });
  });

  afterEach(() => {
      jest.restoreAllMocks();
  });

  it('opens edit overlay when clicking a place', async () => {
    const onPlaceUpdate = jest.fn();
    const onPlaceDelete = jest.fn();

    render(<MapComponent
        tracks={[]}
        places={[mockPlace]}
        onPlaceUpdate={onPlaceUpdate}
        onPlaceDelete={onPlaceDelete}
        placeTextStyle={undefined}
        onUserMove={jest.fn()}
        center={new L.LatLng(51.505, -0.09)}
        zoom={13}
        lineThickness={2}
        exportBounds={null}
        onExportBoundsChange={jest.fn()}
        boundsToFit={null}
        onBoundsFitted={jest.fn()}
        tileLayer={mockTileLayer}
        labelDensity={1}
        highlightedTrackId={null}
        exportSubdivisions={[]}
        currentExportSubdivisionIndex={-1}
        completedSubdivisions={new Set()}
        subdivisionProgress={new Map()}
    />);

    // Wait a bit for things to settle
    await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
    });

    const canvas = document.querySelector('canvas');
    if (!canvas) {
        throw new Error('Canvas not found');
    }

    // Mock getBoundingClientRect
    jest.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
        x: 0, y: 0, width: 1024, height: 1024, top: 0, left: 0, right: 1024, bottom: 1024,
        toJSON: () => {}
    });

    // Simulate click at center
    const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: 512,
        clientY: 512
    });

    await act(async () => {
        canvas.dispatchEvent(clickEvent);
    });

    // Check if the overlay opened.
    const titleInput = await screen.findByDisplayValue(PLACE_TITLE, {}, { timeout: 2000 });
    expect(titleInput).toBeInTheDocument();

    // Now try to update the title
    fireEvent.change(titleInput, { target: { value: 'New Title' } });

    // The input has an onBlur handler that calls onUpdate.
    // So we need to trigger blur.
    fireEvent.blur(titleInput);

    // Check if update was called
    expect(onPlaceUpdate).toHaveBeenCalledWith(PLACE_ID, expect.objectContaining({ title: 'New Title' }));
  });
});

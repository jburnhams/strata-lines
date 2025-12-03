import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '@/App';
import * as db from '@/services/db';

// Mock DB
jest.mock('@/services/db');

// Mock MapComponent to verify props passed to it
jest.mock('@/components/MapComponent', () => ({
  MapComponent: ({ places }: { places: any[] }) => (
    <div data-testid="map-component">
      Map
      <div data-testid="map-places-count">{places ? places.length : 0}</div>
      <div data-testid="map-places-visible-count">{places ? places.filter((p: any) => p.isVisible).length : 0}</div>
    </div>
  )
}));

// Mock URL.createObjectURL
if (typeof URL.createObjectURL === 'undefined') {
  URL.createObjectURL = jest.fn();
}

describe('Places Workflow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (db.getTracks as jest.Mock).mockResolvedValue([]);
    (db.getAllPlacesFromDb as jest.Mock).mockResolvedValue([]);
    (db.savePlaceToDb as jest.Mock).mockResolvedValue(undefined);
    (db.updatePlaceInDb as jest.Mock).mockImplementation((id, updates) => Promise.resolve({ id, ...updates }));
    (db.deletePlaceFromDb as jest.Mock).mockResolvedValue(undefined);
  });

  it('initializes and renders places section', async () => {
    render(<App />);

    await waitFor(() => {
        const placesElements = screen.getAllByText('Places');
        expect(placesElements.length).toBeGreaterThan(0);
    });
  });

  it('displays places loaded from DB', async () => {
    const mockPlace = {
        id: 'p1',
        title: 'DB Place',
        source: 'manual',
        isVisible: true,
        latitude: 50,
        longitude: 0,
        createdAt: 1000,
        showIcon: true,
        iconStyle: 'pin'
    };
    (db.getAllPlacesFromDb as jest.Mock).mockResolvedValue([mockPlace]);

    render(<App />);

    await waitFor(() => {
        expect(screen.getByText('DB Place')).toBeInTheDocument();
    });
  });

  it('toggles place visibility', async () => {
    const mockPlace = {
        id: 'p1',
        title: 'Toggle Place',
        source: 'manual',
        isVisible: true,
        latitude: 50,
        longitude: 0,
        createdAt: 1000,
        showIcon: true,
        iconStyle: 'pin'
    };
    (db.getAllPlacesFromDb as jest.Mock).mockResolvedValue([mockPlace]);

    render(<App />);

    await waitFor(() => {
        expect(screen.getByText('Toggle Place')).toBeInTheDocument();
    });

    const eyeButton = screen.getByLabelText('Hide place');
    fireEvent.click(eyeButton);

    await waitFor(() => {
        expect(db.updatePlaceInDb).toHaveBeenCalledWith('p1', { isVisible: false });
    });
  });

  it('passes places to map component', async () => {
    const mockPlace = {
        id: 'p1',
        title: 'Map Place',
        source: 'manual',
        isVisible: true,
        latitude: 50,
        longitude: 0,
        createdAt: 1000,
        showIcon: true,
        iconStyle: 'pin'
    };
    (db.getAllPlacesFromDb as jest.Mock).mockResolvedValue([mockPlace]);

    render(<App />);

    await waitFor(() => {
        expect(screen.getByTestId('map-places-count')).toHaveTextContent('1');
        expect(screen.getByTestId('map-places-visible-count')).toHaveTextContent('1');
    });

    // Toggle visibility
    const eyeButton = screen.getByLabelText('Hide place');
    fireEvent.click(eyeButton);

    await waitFor(() => {
        // App state should update, passing updated places to MapComponent
        expect(screen.getByTestId('map-places-visible-count')).toHaveTextContent('0');
    });
  });
});

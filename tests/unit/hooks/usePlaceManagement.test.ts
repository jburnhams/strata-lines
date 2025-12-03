import { renderHook, act, waitFor } from '@testing-library/react';
import { usePlaceManagement } from '@/hooks/usePlaceManagement';
import * as db from '@/services/db';
import type { Place } from '@/types';
import L from 'leaflet';

// Mock dependencies
jest.mock('@/services/db');
jest.mock('leaflet', () => ({
  latLng: jest.fn((lat, lng) => ({
    distanceTo: jest.fn(() => 100), // Default distance > 10m
    lat,
    lng
  })),
}));

describe('usePlaceManagement', () => {
  const mockPlace: Place = {
    id: 'place-1',
    latitude: 51.505,
    longitude: -0.09,
    title: 'Test Place',
    createdAt: 1000,
    source: 'manual',
    isVisible: true,
    showIcon: true,
    iconStyle: 'pin'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (db.getAllPlacesFromDb as jest.Mock).mockResolvedValue([]);
    (db.savePlaceToDb as jest.Mock).mockResolvedValue(undefined);
    (db.updatePlaceInDb as jest.Mock).mockImplementation((id, updates) => Promise.resolve({ ...mockPlace, ...updates }));
    (db.deletePlaceFromDb as jest.Mock).mockResolvedValue(undefined);
  });

  it('loads places on mount', async () => {
    (db.getAllPlacesFromDb as jest.Mock).mockResolvedValue([mockPlace]);

    const { result } = renderHook(() => usePlaceManagement());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
        expect(result.current.places).toEqual([mockPlace]);
        expect(result.current.isLoading).toBe(false);
    });
  });

  it('adds a place', async () => {
    const { result } = renderHook(() => usePlaceManagement());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addPlace(mockPlace);
    });

    expect(db.savePlaceToDb).toHaveBeenCalledWith(mockPlace);
    expect(result.current.places).toContainEqual(mockPlace);
    expect(result.current.notification?.type).toBe('info');
  });

  it('prevents adding duplicate place within 10 meters', async () => {
    (db.getAllPlacesFromDb as jest.Mock).mockResolvedValue([mockPlace]);

    // Mock distanceTo to return 5 meters
    const mockLatLng = {
      distanceTo: jest.fn(() => 5),
      lat: 51.505,
      lng: -0.09
    };
    (L.latLng as jest.Mock).mockReturnValue(mockLatLng);

    const { result } = renderHook(() => usePlaceManagement());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const duplicatePlace = { ...mockPlace, id: 'place-2' };

    await act(async () => {
      await result.current.addPlace(duplicatePlace);
    });

    expect(db.savePlaceToDb).not.toHaveBeenCalled();
    expect(result.current.notification?.type).toBe('error');
    expect(result.current.places).toHaveLength(1);
  });

  it('updates a place', async () => {
    (db.getAllPlacesFromDb as jest.Mock).mockResolvedValue([mockPlace]);
    const { result } = renderHook(() => usePlaceManagement());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const updates = { title: 'Updated Title' };

    await act(async () => {
      await result.current.updatePlace(mockPlace.id, updates);
    });

    expect(db.updatePlaceInDb).toHaveBeenCalledWith(mockPlace.id, updates);
    expect(result.current.places[0].title).toBe('Updated Title');
  });

  it('deletes a place', async () => {
    (db.getAllPlacesFromDb as jest.Mock).mockResolvedValue([mockPlace]);
    const { result } = renderHook(() => usePlaceManagement());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.deletePlace(mockPlace.id);
    });

    expect(db.deletePlaceFromDb).toHaveBeenCalledWith(mockPlace.id);
    expect(result.current.places).toHaveLength(0);
  });

  it('toggles place visibility', async () => {
    (db.getAllPlacesFromDb as jest.Mock).mockResolvedValue([mockPlace]);
    const { result } = renderHook(() => usePlaceManagement());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.togglePlaceVisibility(mockPlace.id);
    });

    expect(db.updatePlaceInDb).toHaveBeenCalledWith(mockPlace.id, { isVisible: false });
    expect(result.current.places[0].isVisible).toBe(false);
  });

  it('toggles all places visibility', async () => {
    const place2 = { ...mockPlace, id: 'place-2', isVisible: true };
    (db.getAllPlacesFromDb as jest.Mock).mockResolvedValue([mockPlace, place2]);
    const { result } = renderHook(() => usePlaceManagement());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.toggleAllPlacesVisibility(false);
    });

    expect(db.updatePlaceInDb).toHaveBeenCalledTimes(2);
    expect(result.current.places.every(p => !p.isVisible)).toBe(true);
  });
});

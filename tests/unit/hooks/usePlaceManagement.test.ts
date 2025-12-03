import { renderHook, act, waitFor } from '@testing-library/react';
import { usePlaceManagement } from '@/hooks/usePlaceManagement';
import * as db from '@/services/db';
import { jest } from '@jest/globals';
import type { Place } from '@/types';

// Mock db service
jest.mock('@/services/db');

// Mock Leaflet
jest.mock('leaflet', () => ({
  latLng: (lat: number, lng: number) => ({
    distanceTo: (other: any) => {
      // Simple distance calculation for mock
      const dx = lat - other.lat;
      const dy = lng - other.lng;
      // Very rough approximation, just to test the logic
      // 1 degree ~ 111km = 111000m
      return Math.sqrt(dx * dx + dy * dy) * 111000;
    },
    lat,
    lng
  }),
}));

describe('usePlaceManagement', () => {
  const mockPlaces: Place[] = [
    {
      id: '1',
      title: 'Place 1',
      latitude: 10,
      longitude: 10,
      createdAt: 1000,
      source: 'manual',
      isVisible: true,
      showIcon: true,
      iconStyle: 'pin'
    },
    {
      id: '2',
      title: 'Place 2',
      latitude: 20,
      longitude: 20,
      createdAt: 2000,
      source: 'manual',
      isVisible: false, // Hidden
      showIcon: true,
      iconStyle: 'pin'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (db.getAllPlacesFromDb as any).mockResolvedValue([...mockPlaces]);
    (db.savePlaceToDb as any).mockResolvedValue(undefined);
    (db.deletePlaceFromDb as any).mockResolvedValue(undefined);
    (db.updatePlaceInDb as any).mockResolvedValue(undefined);
  });

  it('loads places on mount', async () => {
    const { result } = renderHook(() => usePlaceManagement());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.places).toEqual(mockPlaces);
    expect(db.getAllPlacesFromDb).toHaveBeenCalledTimes(1);
  });

  it('adds a place', async () => {
    const { result } = renderHook(() => usePlaceManagement());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const newPlace: Place = {
      id: '3',
      title: 'Place 3',
      latitude: 30,
      longitude: 30,
      createdAt: 3000,
      source: 'manual',
      isVisible: true,
      showIcon: true,
      iconStyle: 'pin'
    };

    await act(async () => {
      await result.current.addPlace(newPlace);
    });

    expect(result.current.places).toHaveLength(3);
    expect(result.current.places[0]).toEqual(newPlace); // Prepend
    expect(db.savePlaceToDb).toHaveBeenCalledWith(newPlace);
    expect(result.current.notification?.type).toBe('info');
  });

  it('prevents adding duplicate place (same location)', async () => {
      const { result } = renderHook(() => usePlaceManagement());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const duplicatePlace: Place = {
        id: '4',
        title: 'Duplicate',
        latitude: 10, // Same as Place 1
        longitude: 10,
        createdAt: 4000,
        source: 'manual',
        isVisible: true,
        showIcon: true,
        iconStyle: 'pin'
      };

      await act(async () => {
        await result.current.addPlace(duplicatePlace);
      });

      expect(result.current.places).toHaveLength(2); // No change
      expect(db.savePlaceToDb).not.toHaveBeenCalledWith(duplicatePlace);
      expect(result.current.notification?.type).toBe('error');
      expect(result.current.notification?.message).toContain('already exists');
  });

  it('deletes a place', async () => {
      const { result } = renderHook(() => usePlaceManagement());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
          await result.current.deletePlace('1');
      });

      expect(result.current.places).toHaveLength(1);
      expect(result.current.places[0].id).toBe('2');
      expect(db.deletePlaceFromDb).toHaveBeenCalledWith('1');
  });

  it('toggles visibility', async () => {
      const { result } = renderHook(() => usePlaceManagement());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
          // @ts-ignore - implementation returns promise
          await result.current.togglePlaceVisibility('1');
      });

      expect(result.current.places.find(p => p.id === '1')?.isVisible).toBe(false); // Toggled from true
      expect(db.updatePlaceInDb).toHaveBeenCalledWith('1', { isVisible: false });
  });

  it('toggles all visibility', async () => {
      const { result } = renderHook(() => usePlaceManagement());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
          // @ts-ignore - implementation returns promise
          await result.current.toggleAllPlacesVisibility(true);
      });

      expect(result.current.places.every(p => p.isVisible)).toBe(true);
      expect(db.updatePlaceInDb).toHaveBeenCalledTimes(2);
  });

  it('updates a place', async () => {
      const { result } = renderHook(() => usePlaceManagement());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
          await result.current.updatePlace('1', { title: 'Updated Title' });
      });

      expect(result.current.places.find(p => p.id === '1')?.title).toBe('Updated Title');
      expect(db.updatePlaceInDb).toHaveBeenCalledWith('1', { title: 'Updated Title' });
  });
});

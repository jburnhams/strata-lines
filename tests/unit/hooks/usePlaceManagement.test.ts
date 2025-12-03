import { renderHook, act, waitFor } from '@testing-library/react';
import { usePlaceManagement } from '@/hooks/usePlaceManagement';
import * as db from '@/services/db';
import type { Place } from '@/types';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('@/services/db');

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'mock-uuid')
  }
});

describe('usePlaceManagement', () => {
  const mockPlace: Place = {
    id: 'place-1',
    latitude: 10,
    longitude: 20,
    title: 'Test Place',
    createdAt: 1000,
    source: 'manual',
    isVisible: true,
    showIcon: true,
    iconStyle: 'pin'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (db.getAllPlacesFromDb as jest.Mock<any>).mockResolvedValue([]);
    (db.savePlaceToDb as jest.Mock<any>).mockResolvedValue(undefined);
    (db.updatePlaceInDb as jest.Mock<any>).mockImplementation((id: any, updates: any) => Promise.resolve({ ...mockPlace, ...updates }));
    (db.deletePlaceFromDb as jest.Mock<any>).mockResolvedValue(undefined);
  });

  it('loads places from IndexedDB on mount', async () => {
    (db.getAllPlacesFromDb as jest.Mock<any>).mockResolvedValue([mockPlace]);

    const { result } = renderHook(() => usePlaceManagement());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
        expect(result.current.places).toEqual([mockPlace]);
    });

    expect(result.current.isLoading).toBe(false);
    expect(db.getAllPlacesFromDb).toHaveBeenCalled();
  });

  it('adds a place', async () => {
    const { result } = renderHook(() => usePlaceManagement());

    // Wait for initial load
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const newPlaceData = {
        latitude: 15,
        longitude: 25,
        title: 'New Place',
        source: 'manual' as const,
        isVisible: true,
        showIcon: true,
        iconStyle: 'pin' as const
    };

    await act(async () => {
        await result.current.addPlace(newPlaceData);
    });

    expect(db.savePlaceToDb).toHaveBeenCalledWith(expect.objectContaining({
        title: 'New Place',
        id: 'mock-uuid'
    }));

    expect(result.current.places).toHaveLength(1);
    expect(result.current.places[0].title).toBe('New Place');
    expect(result.current.notification?.type).toBe('info');
  });

  it('prevents duplicate places', async () => {
     (db.getAllPlacesFromDb as jest.Mock<any>).mockResolvedValue([mockPlace]);
     const { result } = renderHook(() => usePlaceManagement());
     await waitFor(() => expect(result.current.isLoading).toBe(false));

     const duplicatePlace = {
         latitude: 10.00001, // Very close
         longitude: 20.00001,
         title: 'Duplicate',
         source: 'manual' as const,
         isVisible: true,
         showIcon: true,
         iconStyle: 'pin' as const
     };

     await act(async () => {
         await result.current.addPlace(duplicatePlace);
     });

     expect(db.savePlaceToDb).not.toHaveBeenCalled();
     expect(result.current.notification?.type).toBe('error');
     expect(result.current.notification?.message).toContain('exists');
  });

  it('updates a place', async () => {
    (db.getAllPlacesFromDb as jest.Mock<any>).mockResolvedValue([mockPlace]);
    const { result } = renderHook(() => usePlaceManagement());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
        await result.current.updatePlace('place-1', { title: 'Updated Title' });
    });

    expect(db.updatePlaceInDb).toHaveBeenCalledWith('place-1', { title: 'Updated Title' });
    expect(result.current.places[0].title).toBe('Updated Title');
  });

  it('deletes a place', async () => {
    (db.getAllPlacesFromDb as jest.Mock<any>).mockResolvedValue([mockPlace]);
    const { result } = renderHook(() => usePlaceManagement());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
        await result.current.deletePlace('place-1');
    });

    expect(db.deletePlaceFromDb).toHaveBeenCalledWith('place-1');
    expect(result.current.places).toHaveLength(0);
  });
});

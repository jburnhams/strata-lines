import { renderHook, act, waitFor } from '@testing-library/react';
import { usePlaceManagement } from '@/hooks/usePlaceManagement';
import * as db from '@/services/db';
import { Place } from '@/types';
import L from 'leaflet';

// Mock dependencies
jest.mock('@/services/db');

const mockPlace: Place = {
  id: '1',
  latitude: 51.505,
  longitude: -0.09,
  title: 'Test Place',
  createdAt: 1000,
  source: 'manual',
  isVisible: true,
  showIcon: true,
  iconStyle: 'pin'
};

const mockPlaces = [mockPlace];

describe('usePlaceManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (db.getAllPlacesFromDb as jest.Mock).mockResolvedValue([...mockPlaces]);
    (db.savePlaceToDb as jest.Mock).mockResolvedValue(undefined);
    (db.updatePlaceInDb as jest.Mock).mockImplementation((id, updates) => Promise.resolve({ ...mockPlace, ...updates }));
    (db.deletePlaceFromDb as jest.Mock).mockResolvedValue(undefined);
  });

  it('loads places on mount', async () => {
    const { result } = renderHook(() => usePlaceManagement());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
        expect(result.current.places).toEqual(mockPlaces);
        expect(result.current.isLoading).toBe(false);
    });
  });

  it('adds a place', async () => {
    const { result } = renderHook(() => usePlaceManagement());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const newPlace: Place = { ...mockPlace, id: '2', latitude: 52.0, longitude: 0.1, title: 'New Place' };

    await act(async () => {
      await result.current.addPlace(newPlace);
    });

    expect(db.savePlaceToDb).toHaveBeenCalledWith(newPlace);
    expect(result.current.places).toContainEqual(newPlace);
    expect(result.current.notification).toEqual({ type: 'info', message: 'Place added successfully' });
  });

  it('prevents adding duplicate place within 10 meters', async () => {
     const { result } = renderHook(() => usePlaceManagement());
     await waitFor(() => expect(result.current.isLoading).toBe(false));

     // Same coordinates as mockPlace
     const duplicatePlace: Place = { ...mockPlace, id: '2', title: 'Duplicate Place' };

     await act(async () => {
       await result.current.addPlace(duplicatePlace);
     });

     expect(db.savePlaceToDb).not.toHaveBeenCalled();
     expect(result.current.notification).toEqual({ type: 'error', message: expect.stringContaining('A place already exists within 10 meters') });
  });

  it('updates a place', async () => {
    const { result } = renderHook(() => usePlaceManagement());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.updatePlace('1', { title: 'Updated Title' });
    });

    expect(db.updatePlaceInDb).toHaveBeenCalledWith('1', { title: 'Updated Title' });
    expect(result.current.places[0].title).toBe('Updated Title');
  });

  it('deletes a place', async () => {
    const { result } = renderHook(() => usePlaceManagement());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.deletePlace('1');
    });

    expect(db.deletePlaceFromDb).toHaveBeenCalledWith('1');
    expect(result.current.places).toHaveLength(0);
  });

  it('toggles place visibility', async () => {
    const { result } = renderHook(() => usePlaceManagement());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Reset the mock implementation for updatePlaceInDb to return correct visible state
    (db.updatePlaceInDb as jest.Mock).mockImplementation((id, updates) =>
        Promise.resolve({ ...mockPlace, isVisible: updates.isVisible })
    );

    await act(async () => {
      result.current.togglePlaceVisibility('1');
    });

    expect(db.updatePlaceInDb).toHaveBeenCalledWith('1', { isVisible: false });
    expect(result.current.places[0].isVisible).toBe(false);
  });

  it('toggles all places visibility', async () => {
     const { result } = renderHook(() => usePlaceManagement());
     await waitFor(() => expect(result.current.isLoading).toBe(false));

     await act(async () => {
       result.current.toggleAllPlacesVisibility(false);
     });

     expect(db.updatePlaceInDb).toHaveBeenCalledWith('1', { isVisible: false });
     expect(result.current.places[0].isVisible).toBe(false);
  });
});

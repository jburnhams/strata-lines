import { useState, useCallback, useEffect } from 'react';
import type { Place } from '@/types';
import * as db from '@/services/db';

export interface UsePlaceManagementReturn {
  places: Place[];
  isLoading: boolean;
  addPlace: (place: Omit<Place, 'id' | 'createdAt'>) => Promise<void>;
  updatePlace: (id: string, updates: Partial<Place>) => Promise<void>;
  deletePlace: (id: string) => Promise<void>;
  togglePlaceVisibility: (id: string) => Promise<void>;
  toggleAllPlacesVisibility: (visible: boolean) => Promise<void>;
  getPlaceById: (id: string) => Place | undefined;
  getVisiblePlaces: () => Place[];
  notification: { type: 'error' | 'info'; message: string } | null;
  setNotification: (n: { type: 'error' | 'info'; message: string } | null) => void;
}

export const usePlaceManagement = (): UsePlaceManagementReturn => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<{ type: 'error' | 'info'; message: string } | null>(null);

  // Load places on mount
  useEffect(() => {
    const loadPlaces = async () => {
      setIsLoading(true);
      try {
        const loadedPlaces = await db.getAllPlacesFromDb();
        setPlaces(loadedPlaces);
      } catch (error) {
        console.error('Failed to load places:', error);
        setNotification({ type: 'error', message: 'Failed to load places.' });
      } finally {
        setIsLoading(false);
      }
    };
    loadPlaces();
  }, []);

  const addPlace = useCallback(async (placeData: Omit<Place, 'id' | 'createdAt'>) => {
    // Validation
    if (!placeData.title || placeData.title.trim() === '') {
      setNotification({ type: 'error', message: 'Place title is required.' });
      return;
    }

    // Check for duplicates (within ~10 meters)
    // 0.0001 degrees is roughly 11 meters
    const isDuplicate = places.some(p => {
        return Math.abs(p.latitude - placeData.latitude) < 0.0001 &&
               Math.abs(p.longitude - placeData.longitude) < 0.0001;
    });

    if (isDuplicate) {
        setNotification({ type: 'error', message: 'A place already exists at this location.' });
        return;
    }

    const newPlace: Place = {
      ...placeData,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };

    try {
      await db.savePlaceToDb(newPlace);
      setPlaces(prev => [newPlace, ...prev]);
      setNotification({ type: 'info', message: 'Place added successfully.' });
    } catch (error) {
      console.error('Failed to add place:', error);
      setNotification({ type: 'error', message: 'Failed to save place.' });
    }
  }, [places]);

  const updatePlace = useCallback(async (id: string, updates: Partial<Place>) => {
    if (updates.title !== undefined && updates.title.trim() === '') {
      setNotification({ type: 'error', message: 'Place title cannot be empty.' });
      return;
    }

    try {
      const updatedPlace = await db.updatePlaceInDb(id, updates);
      setPlaces(prev => prev.map(p => p.id === id ? updatedPlace : p));
    } catch (error) {
      console.error('Failed to update place:', error);
      setNotification({ type: 'error', message: 'Failed to update place.' });
    }
  }, []);

  const deletePlace = useCallback(async (id: string) => {
    try {
      await db.deletePlaceFromDb(id);
      setPlaces(prev => prev.filter(p => p.id !== id));
      setNotification({ type: 'info', message: 'Place deleted.' });
    } catch (error) {
      console.error('Failed to delete place:', error);
      setNotification({ type: 'error', message: 'Failed to delete place.' });
    }
  }, []);

  const togglePlaceVisibility = useCallback(async (id: string) => {
    const place = places.find(p => p.id === id);
    if (!place) return;
    await updatePlace(id, { isVisible: !place.isVisible });
  }, [places, updatePlace]);

  const toggleAllPlacesVisibility = useCallback(async (visible: boolean) => {
    // Optimistic update
    setPlaces(prev => prev.map(p => ({ ...p, isVisible: visible })));

    try {
       await Promise.all(places.map(p => db.updatePlaceInDb(p.id, { isVisible: visible })));
    } catch (error) {
        console.error('Failed to toggle all places:', error);
        setNotification({ type: 'error', message: 'Failed to update visibility for all places.' });
        // Reload to ensure state consistency
        const loaded = await db.getAllPlacesFromDb();
        setPlaces(loaded);
    }
  }, [places]);

  const getPlaceById = useCallback((id: string) => {
    return places.find(p => p.id === id);
  }, [places]);

  const getVisiblePlaces = useCallback(() => {
    return places.filter(p => p.isVisible);
  }, [places]);

  return {
    places,
    isLoading,
    addPlace,
    updatePlace,
    deletePlace,
    togglePlaceVisibility,
    toggleAllPlacesVisibility,
    getPlaceById,
    getVisiblePlaces,
    notification,
    setNotification
  };
};

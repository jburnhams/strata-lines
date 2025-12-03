import { useState, useCallback, useEffect } from 'react';
import L from 'leaflet';
import * as db from '@/services/db';
import type { Place, Notification } from '@/types';

export interface UsePlaceManagementReturn {
  places: Place[];
  isLoading: boolean;
  notification: Notification | null;
  setNotification: (n: Notification | null) => void;
  addPlace: (place: Place) => Promise<void>;
  updatePlace: (id: string, updates: Partial<Place>) => Promise<void>;
  deletePlace: (id: string) => Promise<void>;
  togglePlaceVisibility: (id: string) => Promise<void>;
  toggleAllPlacesVisibility: (visible: boolean) => Promise<void>;
  getVisiblePlaces: () => Place[];
  getPlaceById: (id: string) => Place | undefined;
}

export const usePlaceManagement = (): UsePlaceManagementReturn => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<Notification | null>(null);

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

  const getVisiblePlaces = useCallback(() => {
    return places.filter(p => p.isVisible);
  }, [places]);

  const getPlaceById = useCallback((id: string) => {
    return places.find(p => p.id === id);
  }, [places]);

  const addPlace = useCallback(async (place: Place) => {
    // Duplicate check
    const isDuplicate = places.some(existing => {
      const dist = L.latLng(existing.latitude, existing.longitude)
        .distanceTo(L.latLng(place.latitude, place.longitude));
      return dist < 10; // 10 meters
    });

    if (isDuplicate) {
      setNotification({ type: 'error', message: 'A place already exists at this location.' });
      return;
    }

    try {
      await db.savePlaceToDb(place);
      setPlaces(prev => [place, ...prev]);
      setNotification({ type: 'info', message: 'Place added successfully.' });
    } catch (error) {
      console.error('Failed to add place:', error);
      setNotification({ type: 'error', message: 'Failed to add place.' });
    }
  }, [places]);

  const updatePlace = useCallback(async (id: string, updates: Partial<Place>) => {
    if (updates.title !== undefined && updates.title.trim() === '') {
        setNotification({ type: 'error', message: 'Title cannot be empty.' });
        return;
    }

    try {
      const updated = await db.updatePlaceInDb(id, updates);
      setPlaces(prev => prev.map(p => p.id === id ? updated : p));
    } catch (error) {
      console.error('Failed to update place:', error);
      setNotification({ type: 'error', message: 'Failed to update place.' });
    }
  }, []);

  const deletePlace = useCallback(async (id: string) => {
    try {
      await db.deletePlaceFromDb(id);
      setPlaces(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Failed to delete place:', error);
      setNotification({ type: 'error', message: 'Failed to delete place.' });
    }
  }, []);

  const togglePlaceVisibility = useCallback(async (id: string) => {
    const place = places.find(p => p.id === id);
    if (!place) return;

    const newVisibility = !place.isVisible;
    // Optimistic update
    setPlaces(prev => prev.map(p => p.id === id ? { ...p, isVisible: newVisibility } : p));

    try {
      await db.updatePlaceInDb(id, { isVisible: newVisibility });
    } catch (error) {
      console.error('Failed to toggle visibility:', error);
      // Revert
      setPlaces(prev => prev.map(p => p.id === id ? { ...p, isVisible: !newVisibility } : p));
      setNotification({ type: 'error', message: 'Failed to toggle visibility.' });
    }
  }, [places]);

  const toggleAllPlacesVisibility = useCallback(async (visible: boolean) => {
     // Optimistic
     const oldPlaces = [...places];
     setPlaces(prev => prev.map(p => ({ ...p, isVisible: visible })));

     try {
       await Promise.all(places.map(p => db.updatePlaceInDb(p.id, { isVisible: visible })));
     } catch (error) {
       console.error('Failed to toggle all visibility:', error);
       setPlaces(oldPlaces);
       setNotification({ type: 'error', message: 'Failed to update visibility.' });
     }
  }, [places]);

  return {
    places,
    isLoading,
    notification,
    setNotification,
    addPlace,
    updatePlace,
    deletePlace,
    togglePlaceVisibility,
    toggleAllPlacesVisibility,
    getVisiblePlaces,
    getPlaceById
  };
};

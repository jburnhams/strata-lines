import { useState, useEffect, useCallback } from 'react';
import { Place, Notification } from '@/types';
import * as db from '@/services/db';
import L from 'leaflet';

export interface UsePlaceManagementResult {
  places: Place[];
  isLoading: boolean;
  addPlace: (place: Place) => Promise<void>;
  updatePlace: (id: string, updates: Partial<Place>) => Promise<void>;
  deletePlace: (id: string) => Promise<void>;
  togglePlaceVisibility: (id: string) => void;
  toggleAllPlacesVisibility: (visible: boolean) => void;
  getPlaceById: (id: string) => Place | undefined;
  getVisiblePlaces: () => Place[];
  notification: Notification | null;
  setNotification: (n: Notification | null) => void;
}

export const usePlaceManagement = (): UsePlaceManagementResult => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<Notification | null>(null);

  const loadPlaces = async () => {
    setIsLoading(true);
    setNotification(null);
    try {
      const loadedPlaces = await db.getAllPlacesFromDb();
      setPlaces(loadedPlaces);
    } catch (err) {
      console.error('Error loading places:', err);
      setNotification({ type: 'error', message: 'Failed to load places' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlaces();
  }, []);

  const addPlace = useCallback(async (place: Place) => {
    setNotification(null);
    // Duplicate coordinate check (10 meters)
    const duplicate = places.find(p => {
      const dist = L.latLng(p.latitude, p.longitude).distanceTo(L.latLng(place.latitude, place.longitude));
      return dist < 10;
    });

    if (duplicate) {
      setNotification({ type: 'error', message: `A place already exists within 10 meters: ${duplicate.title}` });
      return;
    }

    try {
      await db.savePlaceToDb(place);
      setPlaces(prev => [place, ...prev]);
      setNotification({ type: 'info', message: 'Place added successfully' });
    } catch (err) {
      console.error('Error adding place:', err);
      setNotification({ type: 'error', message: 'Failed to add place' });
    }
  }, [places]);

  const updatePlace = useCallback(async (id: string, updates: Partial<Place>) => {
    setNotification(null);
    if (updates.title !== undefined && updates.title.trim() === '') {
      setNotification({ type: 'error', message: 'Title cannot be empty' });
      return;
    }

    try {
      const updatedPlace = await db.updatePlaceInDb(id, updates);
      setPlaces(prev => prev.map(p => p.id === id ? updatedPlace : p));
    } catch (err) {
      console.error('Error updating place:', err);
      setNotification({ type: 'error', message: 'Failed to update place' });
    }
  }, []);

  const deletePlace = useCallback(async (id: string) => {
    setNotification(null);
    try {
      await db.deletePlaceFromDb(id);
      setPlaces(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error deleting place:', err);
      setNotification({ type: 'error', message: 'Failed to delete place' });
    }
  }, []);

  const togglePlaceVisibility = useCallback(async (id: string) => {
    const place = places.find(p => p.id === id);
    if (place) {
      await updatePlace(id, { isVisible: !place.isVisible });
    }
  }, [places, updatePlace]);

  const toggleAllPlacesVisibility = useCallback(async (visible: boolean) => {
    // Optimistic update
    const previousPlaces = [...places];
    const updatedPlaces = places.map(p => ({ ...p, isVisible: visible }));
    setPlaces(updatedPlaces);

    try {
      await Promise.all(places.map(p => db.updatePlaceInDb(p.id, { isVisible: visible })));
    } catch (err) {
      console.error('Error toggling all places:', err);
      setNotification({ type: 'error', message: 'Failed to update some places' });
      setPlaces(previousPlaces); // Revert on error
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

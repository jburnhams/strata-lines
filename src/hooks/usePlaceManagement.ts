import { useState, useCallback, useEffect } from 'react';
import * as db from '@/services/db';
import type { Place, Notification, PlaceTextStyle } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import L from 'leaflet';

export interface UsePlaceManagementReturn {
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
  refreshPlaces: () => Promise<void>;
  placeTextStyle: PlaceTextStyle;
  setPlaceTextStyle: (style: PlaceTextStyle) => void;
}

const defaultTextStyle: PlaceTextStyle = {
    fontSize: 12,
    fontFamily: 'Noto Sans',
    fontWeight: 'bold',
    color: 'auto',
    strokeColor: '#000000',
    strokeWidth: 0,
    glowColor: '#ffffff',
    glowBlur: 0
};

export const usePlaceManagement = (): UsePlaceManagementReturn => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [placeTextStyle, setPlaceTextStyle] = useLocalStorage<PlaceTextStyle>('placeTextStyle', defaultTextStyle);

  const loadPlaces = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadPlaces();
  }, [loadPlaces]);

  const addPlace = useCallback(async (newPlace: Place) => {
    try {
      // Validate place data
      if (!newPlace.title || newPlace.title.trim() === '') {
          throw new Error('Place title cannot be empty.');
      }

      // Check for duplicate coordinates (within 10 meters)
      const isDuplicate = places.some(p => {
         const d = L.latLng(p.latitude, p.longitude).distanceTo(L.latLng(newPlace.latitude, newPlace.longitude));
         return d < 10;
      });

      if (isDuplicate) {
          throw new Error('A place already exists at this location.');
      }

      await db.savePlaceToDb(newPlace);
      // getAllPlacesFromDb returns sorted by createdAt desc (or we sorted it).
      // Assuming newPlace is the newest, we prepend it.
      setPlaces(prev => [newPlace, ...prev]);

      setNotification({ type: 'info', message: 'Place added successfully.' });
    } catch (error: any) {
      console.error('Failed to add place:', error);
      setNotification({ type: 'error', message: error.message || 'Failed to add place.' });
    }
  }, [places]);

  const updatePlace = useCallback(async (id: string, updates: Partial<Place>) => {
      try {
          if (updates.title !== undefined && updates.title.trim() === '') {
              throw new Error('Place title cannot be empty.');
          }

          await db.updatePlaceInDb(id, updates);

          setPlaces(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      } catch (error: any) {
          console.error('Failed to update place:', error);
          setNotification({ type: 'error', message: error.message || 'Failed to update place.' });
      }
  }, []);

  const deletePlace = useCallback(async (id: string) => {
      try {
          await db.deletePlaceFromDb(id);
          setPlaces(prev => prev.filter(p => p.id !== id));
          setNotification({ type: 'info', message: 'Place deleted.' });
      } catch (error: any) {
          console.error('Failed to delete place:', error);
          setNotification({ type: 'error', message: error.message || 'Failed to delete place.' });
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
          // Revert
          setPlaces(prev => prev.map(p => p.id === id ? { ...p, isVisible: !newVisibility } : p));
           setNotification({ type: 'error', message: 'Failed to update visibility.' });
      }
  }, [places]);

  const toggleAllPlacesVisibility = useCallback(async (visible: boolean) => {
      // Optimistic
      const oldPlaces = [...places];
      setPlaces(prev => prev.map(p => ({ ...p, isVisible: visible })));

      try {
          // Update all in DB
          // This might be slow if there are many places, but for <100 it should be fine.
          // DB service doesn't have bulk update, so we do Promise.all
          await Promise.all(places.map(p => db.updatePlaceInDb(p.id, { isVisible: visible })));
      } catch (error) {
           setPlaces(oldPlaces);
           setNotification({ type: 'error', message: 'Failed to update all places.' });
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
    setNotification,
    refreshPlaces: loadPlaces,
    placeTextStyle,
    setPlaceTextStyle
  };
};

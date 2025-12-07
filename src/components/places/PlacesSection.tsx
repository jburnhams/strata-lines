import React from 'react';
import { Place } from '@/types';
import { PlacesList } from './PlacesList';
import { PlaceControls } from './PlaceControls';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { GeocodingResult } from '../../services/geocoding/GeocodingProvider';

interface PlacesSectionProps {
  places: Place[];
  onAddPlaceClick: (result?: GeocodingResult) => void;
  updatePlace: (id: string, updates: Partial<Place>) => void;
  deletePlace: (id: string) => void;
  togglePlaceVisibility: (id: string) => void;
  toggleAllPlacesVisibility: (visible: boolean) => void;
  onZoomToPlace: (place: Place) => void;
  onExportSuccess?: (message: string) => void;
}

export const PlacesSection: React.FC<PlacesSectionProps> = ({
  places,
  onAddPlaceClick,
  updatePlace,
  deletePlace,
  togglePlaceVisibility,
  toggleAllPlacesVisibility,
  onZoomToPlace,
  onExportSuccess
}) => {
  const [isCollapsed, setIsCollapsed] = useLocalStorage<boolean>('places-collapsed', false);
  const allVisible = places.length > 0 && places.every(p => p.isVisible);

  return (
    <section className="mt-6">
      <h2 className="text-xl font-semibold text-gray-200 mb-3">Places</h2>
      <PlaceControls
        onAddPlace={onAddPlaceClick}
        allPlacesVisible={allVisible}
        onToggleAllVisibility={toggleAllPlacesVisibility}
        placeCount={places.length}
        places={places}
        onDeleteAll={() => {
             places.forEach(p => deletePlace(p.id));
        }}
        onExportSuccess={onExportSuccess}
      />
      <PlacesList
        places={places}
        onToggleVisibility={togglePlaceVisibility}
        onEdit={(place) => {
             const newTitle = window.prompt("Enter new title", place.title);
             if (newTitle !== null) {
                 updatePlace(place.id, { title: newTitle });
             }
        }}
        onDelete={deletePlace}
        onZoomTo={onZoomToPlace}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />
    </section>
  );
};

import React, { useState, useEffect } from 'react';
import { Place } from '@/types';
import { PlaceListItem } from './PlaceListItem';
import { ChevronDownIcon, ChevronUpIcon } from '@/components/Icons';

interface PlacesListProps {
  places: Place[];
  onToggleVisibility: (id: string) => void;
  onEdit: (place: Place) => void;
  onDelete: (id: string) => void;
  onZoomTo: (place: Place) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const PlacesList: React.FC<PlacesListProps> = ({
  places,
  onToggleVisibility,
  onEdit,
  onDelete,
  onZoomTo,
  isCollapsed,
  onToggleCollapse
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    // Clear selection if selected place is removed
    if (selectedId && !places.find(p => p.id === selectedId)) {
      setSelectedId(null);
    }
  }, [places, selectedId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (places.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const index = selectedId ? places.findIndex(p => p.id === selectedId) : -1;
      const nextIndex = index < places.length - 1 ? index + 1 : 0;
      setSelectedId(places[nextIndex].id);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const index = selectedId ? places.findIndex(p => p.id === selectedId) : 0;
      const prevIndex = index > 0 ? index - 1 : places.length - 1;
      setSelectedId(places[prevIndex].id);
    } else if (e.key === 'Enter' && selectedId) {
      const place = places.find(p => p.id === selectedId);
      if (place) onEdit(place);
    } else if (e.key === 'Delete' && selectedId) {
      onDelete(selectedId);
    } else if (e.key === 'Escape') {
      setSelectedId(null);
    }
  };

  return (
    <div className="border rounded-md shadow-sm bg-white overflow-hidden" onKeyDown={handleKeyDown} tabIndex={0}>
      <div
        className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center space-x-2">
           <span className="font-semibold text-gray-700">Places</span>
           <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">
             {places.length}
           </span>
        </div>
        <button className="text-gray-500 focus:outline-none">
          {isCollapsed ? <ChevronDownIcon className="h-5 w-5" /> : <ChevronUpIcon className="h-5 w-5" />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="max-h-60 overflow-y-auto" role="list">
          {places.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No places added yet.
            </div>
          ) : (
            places.map(place => (
              <PlaceListItem
                key={place.id}
                place={place}
                onToggleVisibility={onToggleVisibility}
                onEdit={onEdit}
                onDelete={onDelete}
                onZoomTo={onZoomTo}
                isSelected={selectedId === place.id}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

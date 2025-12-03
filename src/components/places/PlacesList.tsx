import React from 'react';
import { Place } from '@/types';
import { PlaceListItem } from './PlaceListItem';
import { ChevronUpIcon, ChevronDownIcon } from '@/components/Icons';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface PlacesListProps {
  places: Place[];
  onToggleVisibility: (id: string) => void;
  onEdit: (place: Place) => void;
  onDelete: (id: string) => void;
  onZoomTo: (place: Place) => void;
}

export const PlacesList: React.FC<PlacesListProps> = ({
  places,
  onToggleVisibility,
  onEdit,
  onDelete,
  onZoomTo
}) => {
  const [isCollapsed, setIsCollapsed] = useLocalStorage<boolean>('places-collapsed', false);

  const groupedPlaces = React.useMemo(() => {
    const groups: Record<string, Place[]> = {
      'Manual': [],
      'Track': [],
      'Imported': []
    };

    places.forEach(p => {
        if (p.source === 'manual') groups['Manual'].push(p);
        else if (p.source === 'import') groups['Imported'].push(p);
        else groups['Track'].push(p);
    });

    return groups;
  }, [places]);

  const placeCount = places.length;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-4">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 rounded-t-lg hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <h3 className="font-semibold text-gray-700">Places</h3>
          <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-600 rounded-full">
            {placeCount}
          </span>
        </div>
        {isCollapsed ? <ChevronDownIcon className="h-5 w-5 text-gray-400" /> : <ChevronUpIcon className="h-5 w-5 text-gray-400" />}
      </button>

      {!isCollapsed && (
        <div className="p-2 space-y-4">
           {placeCount === 0 && (
               <div className="text-center py-4 text-gray-500 text-sm">
                   No places added yet.
               </div>
           )}

           {Object.entries(groupedPlaces).map(([group, groupPlaces]) => {
               if (groupPlaces.length === 0) return null;
               return (
                   <div key={group}>
                       <h4 className="px-2 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">{group}</h4>
                       <div className="space-y-1">
                           {groupPlaces.map(place => (
                               <PlaceListItem
                                 key={place.id}
                                 place={place}
                                 onToggleVisibility={onToggleVisibility}
                                 onEdit={onEdit}
                                 onDelete={onDelete}
                                 onZoomTo={onZoomTo}
                               />
                           ))}
                       </div>
                   </div>
               );
           })}
        </div>
      )}
    </div>
  );
};

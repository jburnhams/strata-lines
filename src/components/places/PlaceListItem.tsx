import React from 'react';
import { Place } from '@/types';
import { EyeIcon, EyeOffIcon, TrashIcon, EditIcon } from '@/components/Icons';

interface PlaceListItemProps {
  place: Place;
  onToggleVisibility: (id: string) => void;
  onEdit: (place: Place) => void;
  onDelete: (id: string) => void;
  onZoomTo: (place: Place) => void;
}

export const PlaceListItem: React.FC<PlaceListItemProps> = ({
  place,
  onToggleVisibility,
  onEdit,
  onDelete,
  onZoomTo
}) => {
  return (
    <div
      className="flex items-center justify-between p-2 hover:bg-gray-100 rounded cursor-pointer group"
      onDoubleClick={() => onZoomTo(place)}
      role="listitem"
    >
      <div className="flex items-center space-x-2 flex-grow overflow-hidden">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility(place.id);
          }}
          className="text-gray-500 hover:text-gray-700 focus:outline-none"
          title={place.isVisible ? "Hide place" : "Show place"}
          aria-label={place.isVisible ? "Hide place" : "Show place"}
        >
          {place.isVisible ? <EyeIcon className="h-4 w-4" /> : <EyeOffIcon className="h-4 w-4" />}
        </button>

        <div className="flex flex-col overflow-hidden">
           <span className="text-sm font-medium truncate" title={place.title}>
             {place.title}
           </span>
           <span className="text-xs text-gray-400 capitalize">
             {place.source.replace('-', ' ')}
           </span>
        </div>
      </div>

      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(place);
          }}
          className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded"
          title="Edit place"
          aria-label="Edit place"
        >
          <EditIcon className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(place.id);
          }}
          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
          title="Delete place"
          aria-label="Delete place"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

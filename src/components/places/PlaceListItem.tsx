import React from 'react';
import { Place } from '@/types';
import { EditIcon, TrashIcon, EyeIcon, EyeOffIcon } from '@/components/Icons';

interface PlaceListItemProps {
  place: Place;
  onToggleVisibility: (id: string) => void;
  onEdit: (place: Place) => void;
  onDelete: (id: string) => void;
  onZoomTo: (place: Place) => void;
  isSelected?: boolean;
}

export const PlaceListItem: React.FC<PlaceListItemProps> = ({
  place,
  onToggleVisibility,
  onEdit,
  onDelete,
  onZoomTo,
  isSelected = false
}) => {
  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'manual': return 'M';
      case 'track-start': return 'S';
      case 'track-middle': return 'I';
      case 'track-end': return 'E';
      case 'import': return 'Imp';
      default: return '?';
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'manual': return 'bg-blue-100 text-blue-800';
      case 'track-start': return 'bg-green-100 text-green-800';
      case 'track-middle': return 'bg-yellow-100 text-yellow-800';
      case 'track-end': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div
      className={`group flex items-center justify-between p-2 hover:bg-gray-50 border-b border-gray-100 ${isSelected ? 'bg-blue-50' : ''}`}
      role="listitem"
    >
      <div className="flex items-center space-x-3 flex-grow min-w-0">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleVisibility(place.id); }}
          className="text-gray-500 hover:text-gray-700 focus:outline-none"
          title={place.isVisible ? "Hide place" : "Show place"}
        >
          {place.isVisible ? <EyeIcon className="h-4 w-4" /> : <EyeOffIcon className="h-4 w-4 text-gray-400" />}
        </button>

        <span
          className={`text-xs font-medium px-1.5 py-0.5 rounded ${getSourceColor(place.source)}`}
          title={`Source: ${place.source}`}
        >
          {getSourceLabel(place.source)}
        </span>

        <div className="flex-grow min-w-0 flex flex-col cursor-pointer" onDoubleClick={() => onZoomTo(place)}>
             <span className="text-sm font-medium text-gray-900 truncate" title={place.title}>
                {place.title}
             </span>
             {place.trackId && (
                <span className="text-xs text-gray-500 truncate">
                  Linked to track
                </span>
             )}
        </div>
      </div>

      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(place); }}
          className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
          title="Edit place"
        >
          <EditIcon className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(place.id); }}
          className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
          title="Delete place"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

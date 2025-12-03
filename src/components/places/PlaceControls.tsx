import React from 'react';
import { PlusIcon, EyeIcon, EyeOffIcon, TrashIcon } from '@/components/Icons';

interface PlaceControlsProps {
  onAddPlace: () => void;
  allPlacesVisible: boolean;
  onToggleAllVisibility: (visible: boolean) => void;
  placeCount: number;
  onDeleteAll: () => void;
}

export const PlaceControls: React.FC<PlaceControlsProps> = ({
  onAddPlace,
  allPlacesVisible,
  onToggleAllVisibility,
  placeCount,
  onDeleteAll
}) => {
  return (
    <div className="flex items-center space-x-2 mb-2">
      <button
        onClick={onAddPlace}
        className="flex-grow flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors"
        title="Add new place"
      >
        <PlusIcon className="h-5 w-5" />
        <span className="font-medium">Add Place</span>
      </button>

      <div className="flex bg-white rounded-lg shadow-sm border border-gray-200">
        <button
          onClick={() => onToggleAllVisibility(!allPlacesVisible)}
          className={`p-2 rounded-l-lg border-r border-gray-200 hover:bg-gray-50 transition-colors ${!allPlacesVisible ? 'text-gray-400' : 'text-gray-600'}`}
          title={allPlacesVisible ? "Hide all places" : "Show all places"}
          disabled={placeCount === 0}
        >
          {allPlacesVisible ? <EyeIcon className="h-5 w-5" /> : <EyeOffIcon className="h-5 w-5" />}
        </button>

        <button
          onClick={() => {
              if (window.confirm('Are you sure you want to delete ALL places? This cannot be undone.')) {
                  onDeleteAll();
              }
          }}
          className="p-2 rounded-r-lg text-red-500 hover:bg-red-50 transition-colors"
          title="Delete all places"
          disabled={placeCount === 0}
        >
          <TrashIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

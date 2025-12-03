import React, { useState } from 'react';
import { PlusIcon, EyeIcon, EyeOffIcon, TrashIcon } from '@/components/Icons';
import { GeocodingSearchDialog } from './GeocodingSearchDialog';
import { GeocodingResult } from '@/services/geocoding/GeocodingProvider';

interface PlaceControlsProps {
  onAddPlace: (result?: GeocodingResult) => void;
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
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleDeleteAllClick = () => {
    setShowConfirmDelete(true);
  };

  const handleAddPlaceClick = () => {
    setIsSearchOpen(true);
  };

  const handleLocationSelect = (result: GeocodingResult) => {
    onAddPlace(result);
    setIsSearchOpen(false);
  };

  const confirmDeleteAll = () => {
    onDeleteAll();
    setShowConfirmDelete(false);
  };

  return (
    <div className="flex flex-col space-y-2 mb-2">
      <button
        onClick={handleAddPlaceClick}
        className="flex items-center justify-center space-x-2 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
      >
        <PlusIcon className="h-5 w-5" />
        <span className="font-medium">Add Place</span>
      </button>

      <GeocodingSearchDialog
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectLocation={handleLocationSelect}
      />

      <div className="flex items-center space-x-2">
        <button
          onClick={() => onToggleAllVisibility(!allPlacesVisible)}
          className="flex-1 flex items-center justify-center space-x-2 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm"
          title={allPlacesVisible ? "Hide all places" : "Show all places"}
        >
          {allPlacesVisible ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          <span>{allPlacesVisible ? "Hide All" : "Show All"}</span>
        </button>

        <button
          onClick={handleDeleteAllClick}
          disabled={placeCount === 0}
          className={`flex-1 flex items-center justify-center space-x-2 px-3 py-1.5 border border-red-200 text-red-700 rounded text-sm ${placeCount === 0 ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'bg-red-50 hover:bg-red-100'}`}
        >
          <TrashIcon className="h-4 w-4" />
          <span>Clear All</span>
        </button>
      </div>

      {showConfirmDelete && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm">
            <p className="text-red-800 mb-2">Are you sure you want to delete all places?</p>
            <div className="flex space-x-2 justify-end">
                <button
                    onClick={() => setShowConfirmDelete(false)}
                    className="px-2 py-1 bg-white border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
                >
                    Cancel
                </button>
                <button
                    onClick={confirmDeleteAll}
                    className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                >
                    Delete All
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

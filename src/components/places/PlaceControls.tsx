import React, { useState } from 'react';
import { PlusIcon, EyeIcon, EyeOffIcon, TrashIcon, DownloadIcon, ChevronDownIcon } from '@/components/Icons';
import { GeocodingSearchDialog } from './GeocodingSearchDialog';
import { GeocodingResult } from '@/services/geocoding/GeocodingProvider';
import type { Place } from '@/types';
import { downloadPlaces } from '@/services/placeExportService';

interface PlaceControlsProps {
  onAddPlace: (result?: GeocodingResult) => void;
  allPlacesVisible: boolean;
  onToggleAllVisibility: (visible: boolean) => void;
  placeCount: number;
  onDeleteAll: () => void;
  places?: Place[]; // Added to support export
}

export const PlaceControls: React.FC<PlaceControlsProps> = ({
  onAddPlace,
  allPlacesVisible,
  onToggleAllVisibility,
  placeCount,
  onDeleteAll,
  places = []
}) => {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

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

  const handleExport = (format: 'geojson' | 'csv' | 'gpx') => {
      if (places.length === 0) return;
      downloadPlaces(places, format);
      setIsExportMenuOpen(false);
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

      <div className="flex space-x-2">
         {/* Export Button with Dropdown */}
         <div className="relative flex-1">
            <button
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                disabled={placeCount === 0}
                className={`w-full flex items-center justify-center space-x-2 px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-sm ${placeCount === 0 ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'bg-white hover:bg-gray-50'}`}
            >
                <DownloadIcon className="h-4 w-4" />
                <span>Export</span>
                <ChevronDownIcon className="h-3 w-3 ml-1" />
            </button>

            {isExportMenuOpen && (
                <>
                <div className="fixed inset-0 z-10" onClick={() => setIsExportMenuOpen(false)}></div>
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-20 py-1">
                    <button onClick={() => handleExport('gpx')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">GPX (Waypoints)</button>
                    <button onClick={() => handleExport('csv')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">CSV</button>
                    <button onClick={() => handleExport('geojson')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">GeoJSON</button>
                </div>
                </>
            )}
         </div>

        <button
          onClick={() => onToggleAllVisibility(!allPlacesVisible)}
          className="flex-1 flex items-center justify-center space-x-2 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm"
          title={allPlacesVisible ? "Hide all places" : "Show all places"}
        >
          {allPlacesVisible ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          <span>{allPlacesVisible ? "Hide" : "Show"}</span>
        </button>

        <button
          onClick={handleDeleteAllClick}
          disabled={placeCount === 0}
          className={`flex-1 flex items-center justify-center space-x-2 px-3 py-1.5 border border-red-200 text-red-700 rounded text-sm ${placeCount === 0 ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'bg-red-50 hover:bg-red-100'}`}
        >
          <TrashIcon className="h-4 w-4" />
          <span>Clear</span>
        </button>
      </div>

      {showConfirmDelete && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm animate-fade-in">
            <p className="text-red-800 mb-2 font-medium">Delete all places?</p>
            <div className="flex space-x-2 justify-end">
                <button
                    onClick={() => setShowConfirmDelete(false)}
                    className="px-3 py-1 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50 text-xs font-medium"
                >
                    Cancel
                </button>
                <button
                    onClick={confirmDeleteAll}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-medium shadow-sm"
                >
                    Delete All
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { useState } from 'react';
import type { Track, TrackPlaceType } from '@/types';
import { ActivityTypeFilter } from './ActivityTypeFilter';
import { TrackListItem } from '@/components/tracks/TrackListItem';
import { useMultiSelect } from '@/hooks/useMultiSelect';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { TrashIcon } from '@/components/Icons';

interface FilesControlProps {
  tracks: Track[];
  onAddFileClick: () => void;
  removeTrack: (trackId: string) => void;
  removeAllTracks: () => void;
  toggleTrackVisibility: (trackId: string) => void;
  isLoading: boolean;
  minLengthFilter: number;
  setMinLengthFilter: (length: number) => void;
  onTrackHover: (trackId: string | null) => void;
  handleDownloadAllTracks: () => void;
  isDownloading: boolean;
  anyExporting: boolean;
  isAdvancedMode: boolean;
  activityCounts: Record<string, number>;
  hiddenActivityTypes: Set<string>;
  toggleActivityFilter: (type: string) => void;
  createTrackPlace: (id: string, type: TrackPlaceType, useLocality: boolean) => Promise<any>;
  removeTrackPlace: (id: string, type: TrackPlaceType) => Promise<void>;
  createAllTrackPlaces: (id: string, useLocality: boolean) => Promise<any>;
  removeAllTrackPlaces: (id: string) => Promise<void>;
}

export const FilesControl: React.FC<FilesControlProps> = ({
  tracks,
  onAddFileClick,
  removeTrack,
  removeAllTracks,
  toggleTrackVisibility,
  isLoading,
  minLengthFilter,
  setMinLengthFilter,
  onTrackHover,
  handleDownloadAllTracks,
  isDownloading,
  anyExporting,
  isAdvancedMode,
  activityCounts,
  hiddenActivityTypes,
  toggleActivityFilter,
  createTrackPlace,
  removeTrackPlace,
  createAllTrackPlaces,
  removeAllTrackPlaces
}) => {
  const {
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    toggleSelectMode,
    isSelectMode,
    selectionCount
  } = useMultiSelect();

  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const handleBulkDelete = () => {
      selectedIds.forEach(id => removeTrack(id));
      clearSelection();
      setShowBulkDeleteConfirm(false);
  };

  return (
    <section>
        <h2 className="text-xl font-semibold text-gray-200 mb-3">Manage GPX / TCX / FIT Files</h2>
        <div className="grid grid-cols-3 gap-2">
            <button
              onClick={onAddFileClick}
              disabled={isLoading}
              className={`${isAdvancedMode ? 'col-span-2' : 'col-span-3'} w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded transition-colors duration-200 flex items-center justify-center`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : 'Add Files'}
            </button>
             {isAdvancedMode && (
                <div className="col-span-1">
                    <label htmlFor="min-length" className="block text-sm font-medium text-gray-400 text-center">Min Len (km)</label>
                    <input
                        type="number"
                        id="min-length"
                        min="0"
                        value={minLengthFilter}
                        onChange={(e) => setMinLengthFilter(parseInt(e.target.value, 10) || 0)}
                        className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm text-center"
                    />
                </div>
            )}
        </div>

        {tracks.length > 0 && (
            <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-gray-300">Loaded Tracks ({tracks.length})</h3>
                    <button
                        onClick={toggleSelectMode}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${isSelectMode ? 'bg-blue-900/50 border-blue-700 text-blue-300' : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'}`}
                    >
                        {isSelectMode ? 'Cancel' : 'Select'}
                    </button>
                </div>

                {isSelectMode && (
                    <div className="bg-blue-900/30 p-2 flex items-center justify-between border-b border-blue-800 text-sm rounded-t-md mb-0">
                         <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={selectionCount === tracks.length && tracks.length > 0}
                                onChange={() => {
                                    if (selectionCount === tracks.length) {
                                        clearSelection();
                                    } else {
                                        selectAll(tracks.map(t => t.id));
                                    }
                                }}
                                className="rounded border-gray-500 bg-gray-700 text-blue-600 focus:ring-blue-500 h-4 w-4"
                            />
                            <span className="text-blue-300 font-medium">{selectionCount} Selected</span>
                        </div>

                        {selectionCount > 0 && (
                            <button
                                onClick={() => setShowBulkDeleteConfirm(true)}
                                className="flex items-center space-x-1 text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-900/50"
                            >
                                <TrashIcon className="h-4 w-4" />
                                <span>Delete</span>
                            </button>
                        )}
                    </div>
                )}

                {isAdvancedMode && (
                    <ActivityTypeFilter
                        activityCounts={activityCounts}
                        hiddenActivityTypes={hiddenActivityTypes}
                        toggleActivityFilter={toggleActivityFilter}
                    />
                )}

                <div className="bg-gray-900/50 rounded-md max-h-48 overflow-y-auto border border-gray-700">
                    <ul className="">
                        {tracks.map((track) => (
                            <li key={track.id}>
                                <TrackListItem
                                    track={track}
                                    onHover={onTrackHover}
                                    onToggleVisibility={toggleTrackVisibility}
                                    onRemove={removeTrack}
                                    createTrackPlace={createTrackPlace}
                                    removeTrackPlace={removeTrackPlace}
                                    createAllTrackPlaces={createAllTrackPlaces}
                                    removeAllTrackPlaces={removeAllTrackPlaces}
                                    isSelectMode={isSelectMode}
                                    isSelected={isSelected(track.id)}
                                    onSelect={toggleSelection}
                                />
                            </li>
                        ))}
                    </ul>
                </div>
                {isAdvancedMode && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                        <button
                            onClick={handleDownloadAllTracks}
                            className="w-full text-center text-sm text-blue-400 hover:text-blue-300 font-semibold py-2 px-3 rounded hover:bg-blue-500/10 flex items-center justify-center disabled:text-gray-500 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
                            disabled={isDownloading || anyExporting}
                        >
                            {isDownloading ? (
                                <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Zipping...</span>
                                </>
                            ) : (
                                <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                Download All
                                </>
                            )}
                        </button>
                        <button
                            onClick={removeAllTracks}
                            className="w-full text-center text-sm text-red-500 hover:text-red-400 font-semibold py-2 px-3 rounded hover:bg-red-500/10 disabled:text-gray-500 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
                            disabled={isDownloading || anyExporting}
                        >
                            Remove All
                        </button>
                    </div>
                )}
            </div>
        )}

        <ConfirmDialog
            isOpen={showBulkDeleteConfirm}
            title="Delete Selected Tracks"
            message={`Are you sure you want to delete ${selectionCount} tracks? This cannot be undone.`}
            confirmLabel="Delete"
            cancelLabel="Cancel"
            onConfirm={handleBulkDelete}
            onCancel={() => setShowBulkDeleteConfirm(false)}
            variant="danger"
        />
    </section>
  );
};

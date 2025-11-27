import React from 'react';
import type { Track } from '@/types';
import { EyeIcon, EyeOffIcon } from '@/components/Icons';

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
}) => {
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
                <h3 className="text-lg font-semibold text-gray-300 mb-2">Loaded Tracks ({tracks.length})</h3>
                <div className="bg-gray-900/50 rounded-md p-2 max-h-48 overflow-y-auto border border-gray-700">
                    <ul className="divide-y divide-gray-700">
                        {tracks.map((track) => (
                            <li
                              key={track.id}
                              className="flex items-center text-sm text-gray-300 py-2 transition-colors duration-150 hover:bg-gray-700/50"
                              onMouseEnter={() => onTrackHover(track.id)}
                              onMouseLeave={() => onTrackHover(null)}
                            >
                                <span className="flex-1 truncate pr-2 cursor-default" title={track.name}>{track.name}</span>
                                <span className="text-gray-400 font-mono text-right flex-shrink-0 pr-3">{track.length.toFixed(1)} km</span>
                                <button
                                    onClick={() => toggleTrackVisibility(track.id)}
                                    className={`p-1 rounded-full ${track.isVisible ? 'text-gray-400 hover:text-white hover:bg-gray-600' : 'text-gray-600 hover:text-gray-400 hover:bg-gray-600'}`}
                                    title={track.isVisible ? 'Hide track' : 'Show track'}
                                >
                                    {track.isVisible ? <EyeIcon /> : <EyeOffIcon />}
                                </button>
                                <button onClick={() => removeTrack(track.id)} className="text-red-500 hover:text-red-400 font-bold text-xl leading-none flex-shrink-0 w-8 text-center" title="Remove track">
                                    &times;
                                </button>
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
    </section>
  );
};

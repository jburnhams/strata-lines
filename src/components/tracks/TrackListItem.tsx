import React, { useState } from 'react';
import type { Track, TrackPlaceType } from '@/types';
import { EyeIcon, EyeOffIcon, PinIcon } from '@/components/Icons';

interface TrackListItemProps {
  track: Track;
  onHover: (id: string | null) => void;
  onToggleVisibility: (id: string) => void;
  onRemove: (id: string) => void;
  createTrackPlace: (id: string, type: TrackPlaceType, useLocality: boolean) => Promise<any>;
  removeTrackPlace: (id: string, type: TrackPlaceType) => Promise<void>;
  createAllTrackPlaces: (id: string, useLocality: boolean) => Promise<any>;
  removeAllTrackPlaces: (id: string) => Promise<void>;
}

export const TrackListItem: React.FC<TrackListItemProps> = ({
  track,
  onHover,
  onToggleVisibility,
  onRemove,
  createTrackPlace,
  removeTrackPlace,
  createAllTrackPlaces,
  removeAllTrackPlaces
}) => {
  const [showPlaces, setShowPlaces] = useState(false);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const handleCreatePlace = async (type: TrackPlaceType) => {
    setLoading(prev => ({ ...prev, [type]: true }));
    try {
      await createTrackPlace(track.id, type, false); // Default useLocality=false for now
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleRemovePlace = async (type: TrackPlaceType) => {
    setLoading(prev => ({ ...prev, [type]: true }));
    try {
      await removeTrackPlace(track.id, type);
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const hasStart = !!track.startPlaceId;
  const hasMiddle = !!track.middlePlaceId;
  const hasEnd = !!track.endPlaceId;
  const placeCount = (hasStart ? 1 : 0) + (hasMiddle ? 1 : 0) + (hasEnd ? 1 : 0);

  return (
    <div className="border-b border-gray-700 last:border-b-0">
        <div
            className="flex items-center text-sm text-gray-300 py-2 transition-colors duration-150 hover:bg-gray-700/50 px-2"
            onMouseEnter={() => onHover(track.id)}
            onMouseLeave={() => onHover(null)}
        >
            <span className="flex-1 truncate pr-2 cursor-default" title={track.name}>{track.name}</span>
            <span className="text-gray-400 font-mono text-right flex-shrink-0 pr-2">{track.length.toFixed(1)} km</span>

            <button
                onClick={() => setShowPlaces(!showPlaces)}
                className={`p-1 mr-1 rounded-full ${showPlaces || placeCount > 0 ? 'text-orange-400 hover:text-orange-300' : 'text-gray-600 hover:text-gray-400'}`}
                title="Manage Places"
            >
                <PinIcon className="h-4 w-4" />
                {placeCount > 0 && <span className="sr-only">({placeCount})</span>}
            </button>

            <button
                onClick={() => onToggleVisibility(track.id)}
                className={`p-1 rounded-full ${track.isVisible ? 'text-gray-400 hover:text-white hover:bg-gray-600' : 'text-gray-600 hover:text-gray-400 hover:bg-gray-600'}`}
                title={track.isVisible ? 'Hide track' : 'Show track'}
            >
                {track.isVisible ? <EyeIcon /> : <EyeOffIcon />}
            </button>
            <button onClick={() => onRemove(track.id)} className="text-red-500 hover:text-red-400 font-bold text-xl leading-none flex-shrink-0 w-8 text-center" title="Remove track">
                &times;
            </button>
        </div>

        {showPlaces && (
            <div className="bg-gray-800/50 px-2 py-2 text-xs flex justify-between items-center gap-2">
                <div className="flex gap-1 items-center">
                    <span className="text-gray-500 mr-1">Places:</span>
                    <PlaceButton
                        label="S"
                        active={hasStart}
                        loading={loading['start']}
                        onClick={() => hasStart ? handleRemovePlace('start') : handleCreatePlace('start')}
                        title={hasStart ? "Remove Start Place" : "Add Start Place"}
                    />
                    <PlaceButton
                        label="M"
                        active={hasMiddle}
                        loading={loading['middle']}
                        onClick={() => hasMiddle ? handleRemovePlace('middle') : handleCreatePlace('middle')}
                        title={hasMiddle ? "Remove Middle Place" : "Add Middle Place"}
                    />
                    <PlaceButton
                        label="E"
                        active={hasEnd}
                        loading={loading['end']}
                        onClick={() => hasEnd ? handleRemovePlace('end') : handleCreatePlace('end')}
                        title={hasEnd ? "Remove End Place" : "Add End Place"}
                    />
                </div>
                <div className="flex gap-1">
                     <button
                        onClick={async () => {
                            setLoading(prev => ({ ...prev, allAdd: true }));
                            try { await createAllTrackPlaces(track.id, false); }
                            finally { setLoading(prev => ({ ...prev, allAdd: false })); }
                        }}
                        disabled={loading['allAdd']}
                        className="text-orange-400 hover:text-orange-300 px-1 hover:bg-gray-700 rounded disabled:text-gray-600"
                        title="Add All"
                     >
                        {loading['allAdd'] ? '...' : '+All'}
                     </button>
                     <button
                        onClick={async () => {
                             setLoading(prev => ({ ...prev, allRem: true }));
                             try { await removeAllTrackPlaces(track.id); }
                             finally { setLoading(prev => ({ ...prev, allRem: false })); }
                        }}
                        disabled={loading['allRem']}
                        className="text-red-400 hover:text-red-300 px-1 hover:bg-gray-700 rounded disabled:text-gray-600"
                        title="Remove All"
                     >
                        {loading['allRem'] ? '...' : '-All'}
                     </button>
                </div>
            </div>
        )}
    </div>
  );
};

const PlaceButton: React.FC<{ label: string; active: boolean; loading: boolean; onClick: () => void; title: string }> = ({ label, active, loading, onClick, title }) => (
    <button
        onClick={onClick}
        disabled={loading}
        className={`w-6 h-6 rounded flex items-center justify-center font-bold border transition-colors ${active ? 'bg-orange-600 border-orange-600 text-white' : 'border-gray-600 text-gray-400 hover:border-gray-400 hover:bg-gray-700'}`}
        title={title}
    >
        {loading ? <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"/> : label}
    </button>
);

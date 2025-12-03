import React, { useState, useEffect, useRef } from 'react';
import type { GeocodingResult } from '@/services/geocoding/GeocodingProvider';
import { getGeocodingService } from '@/services/geocodingService';
import { XIcon } from '@/components/Icons';

interface GeocodingSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (result: GeocodingResult) => void;
}

export const GeocodingSearchDialog: React.FC<GeocodingSearchDialogProps> = ({
  isOpen,
  onClose,
  onSelectLocation
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
        // Small delay to allow render before focusing
        const timer = setTimeout(() => {
            inputRef.current?.focus();
        }, 50);
        return () => clearTimeout(timer);
    } else {
        setQuery('');
        setResults([]);
        setSelectedIndex(-1);
        setError(null);
    }
  }, [isOpen]);

  // Search effect with debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
        if (query.trim().length > 2) {
            setLoading(true);
            setError(null);
            try {
                const service = getGeocodingService();
                const searchResults = await service.searchPlaces(query);
                setResults(searchResults);
                setSelectedIndex(-1);
            } catch (err) {
                console.error(err);
                setError('Failed to search locations');
                setResults([]);
            } finally {
                setLoading(false);
            }
        } else {
            setResults([]);
        }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
            onSelectLocation(results[selectedIndex]);
            onClose();
        } else if (results.length > 0) {
             // Optional: Select first result on Enter if none selected?
             // For now, require explicit selection
        }
    } else if (e.key === 'Escape') {
        onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md border border-gray-700 flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-bold text-orange-400">Search Location</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close">
                <XIcon className="w-5 h-5" />
            </button>
        </div>

        <div className="p-4">
            <input
                ref={inputRef}
                type="text"
                className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                placeholder="Type to search (min 3 chars)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
            />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 px-4 pb-4">
            {loading && <div className="text-gray-400 text-center py-4">Searching...</div>}

            {error && <div className="text-red-400 text-center py-4">{error}</div>}

            {!loading && !error && query.length > 2 && results.length === 0 && (
                <div className="text-gray-500 text-center py-4">No results found</div>
            )}

            <ul className="space-y-2">
                {results.map((result, index) => (
                    <li
                        key={`${result.latitude}-${result.longitude}-${index}`}
                        className={`p-3 rounded cursor-pointer border transition-colors ${
                            index === selectedIndex
                                ? 'bg-orange-900/30 border-orange-500/50'
                                : 'bg-gray-700/50 border-transparent hover:bg-gray-700'
                        }`}
                        onClick={() => {
                            onSelectLocation(result);
                            onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(index)}
                    >
                        <div className="font-medium text-gray-200">{result.displayName.split(',')[0]}</div>
                        <div className="text-xs text-gray-400 truncate">{result.displayName}</div>
                    </li>
                ))}
            </ul>
        </div>
      </div>
    </div>
  );
};

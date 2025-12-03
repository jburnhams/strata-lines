import React, { useState, useEffect, useRef } from 'react';
import { geocodingService } from '../../services/geocodingService';
import { GeocodingResult } from '../../services/geocoding/GeocodingProvider';

interface GeocodingSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (result: GeocodingResult) => void;
}

const GeocodingSearchDialog: React.FC<GeocodingSearchDialogProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setError(null);
      setSelectedIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.trim().length > 2) {
        setIsLoading(true);
        setError(null);
        try {
          const searchResults = await geocodingService.searchPlaces(query);
          setResults(searchResults);
          setSelectedIndex(-1);
          if (searchResults.length === 0) {
            setError('No results found.');
          }
        } catch (err) {
            console.error(err);
            setError('Failed to search.');
        } finally {
          setIsLoading(false);
        }
      } else {
        setResults([]);
        if (query.trim().length > 0) {
            // keep previous error if any or just nothing
        } else {
             setError(null);
        }
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      setSelectedIndex((prev) =>
        prev < results.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        onSelectLocation(results[selectedIndex]);
        onClose();
      } else if (results.length > 0) {
          // If none selected but enter pressed, select first?
          // Or strictly require selection. Let's select first if available.
          onSelectLocation(results[0]);
          onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleSelect = (result: GeocodingResult) => {
    onSelectLocation(result);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
          Add Manual Place
        </h2>

        <div className="mb-4">
          <input
            ref={inputRef}
            type="text"
            className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            placeholder="Search for a location..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {isLoading && (
            <div className="py-4 text-center text-gray-500 dark:text-gray-400">
                Searching...
            </div>
        )}

        {error && !isLoading && (
            <div className="py-4 text-center text-red-500">
                {error}
            </div>
        )}

        <ul className="max-h-60 overflow-y-auto">
          {results.map((result, index) => (
            <li
              key={`${result.latitude}-${result.longitude}-${index}`}
              className={`cursor-pointer rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                index === selectedIndex ? 'bg-blue-100 dark:bg-blue-900' : ''
              }`}
              onClick={() => handleSelect(result)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="font-medium text-gray-900 dark:text-white">
                {result.displayName.split(',')[0]}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {result.displayName}
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex justify-end gap-2">
          <button
            className="rounded-md px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeocodingSearchDialog;

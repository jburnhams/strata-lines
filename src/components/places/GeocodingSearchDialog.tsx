import React, { useState, useEffect, useRef } from 'react';
import { geocodingService } from '@/services/geocodingService';
import { GeocodingResult } from '@/services/geocoding/GeocodingProvider';

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
    const timer = setTimeout(() => {
      if (query.length > 2) {
        handleSearch();
      } else {
        setResults([]);
        setError(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await geocodingService.searchPlaces(query);
      setResults(data);
      setSelectedIndex(-1);
      if (data.length === 0) {
        setError('No results found.');
      }
    } catch (err) {
      setError('Failed to search locations.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && results[selectedIndex]) {
        onSelectLocation(results[selectedIndex]);
      } else {
        handleSearch();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black bg-opacity-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 outline-none text-lg"
            placeholder="Search for a location..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading && (
            <div className="p-4 text-center text-gray-500">Searching...</div>
          )}

          {!isLoading && error && (
            <div className="p-4 text-center text-red-500">{error}</div>
          )}

          {!isLoading && results.length > 0 && (
            <ul className="divide-y divide-gray-100">
              {results.map((result, index) => (
                <li
                  key={`${result.latitude}-${result.longitude}-${index}`}
                  className={`p-3 cursor-pointer hover:bg-gray-50 ${index === selectedIndex ? 'bg-blue-50' : ''}`}
                  onClick={() => onSelectLocation(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="font-medium text-gray-900">{result.displayName.split(',')[0]}</div>
                  <div className="text-sm text-gray-500 truncate">{result.displayName}</div>
                </li>
              ))}
            </ul>
          )}

          {!isLoading && !error && results.length === 0 && query.length > 2 && (
             <div className="p-4 text-center text-gray-400 text-sm">No results found</div>
          )}
        </div>

        <div className="p-3 bg-gray-50 text-right border-t border-gray-200">
             <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
             >
                Cancel
             </button>
        </div>
      </div>
    </div>
  );
};

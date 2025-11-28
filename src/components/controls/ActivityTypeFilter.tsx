import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@/components/Icons';

interface ActivityTypeFilterProps {
  activityCounts: Record<string, number>;
  hiddenActivityTypes: Set<string>;
  toggleActivityFilter: (type: string) => void;
}

export const ActivityTypeFilter: React.FC<ActivityTypeFilterProps> = ({
  activityCounts,
  hiddenActivityTypes,
  toggleActivityFilter,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sort types alphabetically, but maybe put 'Unknown' last?
  // Standard alphabetical is usually fine.
  const types = Object.keys(activityCounts).sort();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (types.length === 0) return null;

  return (
    <div className="relative mb-4" ref={dropdownRef}>
        <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full bg-gray-700 text-white p-2 rounded flex justify-between items-center hover:bg-gray-600 transition-colors border border-gray-600"
            aria-haspopup="true"
            aria-expanded={isOpen}
        >
            <span className="font-semibold text-sm">Filter Activity Types</span>
            {isOpen ? <ChevronUpIcon className="h-4 w-4 text-gray-400" /> : <ChevronDownIcon className="h-4 w-4 text-gray-400" />}
        </button>

        {isOpen && (
            <div className="absolute top-full left-0 w-full bg-gray-800 border border-gray-600 mt-1 rounded shadow-lg z-50 max-h-60 overflow-y-auto">
                {types.map(type => {
                    const count = activityCounts[type];
                    const isVisible = !hiddenActivityTypes.has(type);
                    return (
                        <label key={type} className="flex items-center p-2 hover:bg-gray-700 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={isVisible}
                                onChange={() => toggleActivityFilter(type)}
                                className="mr-2 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-500 rounded bg-gray-700"
                            />
                            <span className="flex-1 text-sm text-gray-300">{type}</span>
                            <span className="text-xs text-gray-400 bg-gray-900 px-2 py-0.5 rounded-full">{count}</span>
                        </label>
                    );
                })}
            </div>
        )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Place } from '@/types';
import { PlaceListItem } from './PlaceListItem';
import { ChevronDownIcon, ChevronUpIcon, TrashIcon } from '@/components/Icons';
import { useMultiSelect } from '@/hooks/useMultiSelect';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface PlacesListProps {
  places: Place[];
  onToggleVisibility: (id: string) => void;
  onEdit: (place: Place) => void;
  onDelete: (id: string) => void;
  onZoomTo: (place: Place) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const PlacesList: React.FC<PlacesListProps> = ({
  places,
  onToggleVisibility,
  onEdit,
  onDelete,
  onZoomTo,
  isCollapsed,
  onToggleCollapse
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
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

  useEffect(() => {
    if (!isSelectMode) {
        clearSelection();
    }
  }, [isSelectMode, clearSelection]);

  const handleBulkDelete = () => {
      selectedIds.forEach(id => onDelete(id));
      clearSelection();
      setShowBulkDeleteConfirm(false);
      // Optional: Exit select mode after delete?
      // toggleSelectMode();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (places.length === 0) return;

    // Keyboard navigation (up/down) logic to set activeId (focus)
    // Simplified for now as it conflicts with multi-select logic slightly without robust focus management
  };

  return (
    <div className="border rounded-md shadow-sm bg-white overflow-hidden" onKeyDown={handleKeyDown} tabIndex={0}>
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-100">
        <div
            className="flex items-center space-x-2 cursor-pointer"
            onClick={onToggleCollapse}
        >
           <span className="font-semibold text-gray-700">Places</span>
           <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">
             {places.length}
           </span>
        </div>

        <div className="flex items-center space-x-2">
            {/* Multi-select Toggle */}
            <button
                onClick={toggleSelectMode}
                className={`text-xs px-2 py-1 rounded border transition-colors ${isSelectMode ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
            >
                {isSelectMode ? 'Cancel' : 'Select'}
            </button>

            <button className="text-gray-500 focus:outline-none" onClick={onToggleCollapse}>
                {isCollapsed ? <ChevronDownIcon className="h-5 w-5" /> : <ChevronUpIcon className="h-5 w-5" />}
            </button>
        </div>
      </div>

      {isSelectMode && !isCollapsed && (
          <div className="bg-blue-50 p-2 flex items-center justify-between border-b border-blue-100 text-sm">
              <div className="flex items-center space-x-2">
                  <input
                      type="checkbox"
                      data-testid="select-all-places"
                      checked={selectionCount === places.length && places.length > 0}
                      onChange={() => {
                          if (selectionCount === places.length) {
                              clearSelection();
                          } else {
                              selectAll(places.map(p => p.id));
                          }
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span className="text-blue-800 font-medium">{selectionCount} Selected</span>
              </div>

              {selectionCount > 0 && (
                  <button
                      onClick={() => setShowBulkDeleteConfirm(true)}
                      className="flex items-center space-x-1 text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-100"
                  >
                      <TrashIcon className="h-4 w-4" />
                      <span>Delete</span>
                  </button>
              )}
          </div>
      )}

      {!isCollapsed && (
        <div className="max-h-60 overflow-y-auto relative" role="list">
          {places.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No places added yet.
            </div>
          ) : (
            places.map(place => (
              <PlaceListItem
                key={place.id}
                place={place}
                onToggleVisibility={onToggleVisibility}
                onEdit={onEdit}
                onDelete={onDelete}
                onZoomTo={onZoomTo}
                isSelectMode={isSelectMode}
                isSelected={isSelected(place.id)}
                onSelect={toggleSelection}
              />
            ))
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={showBulkDeleteConfirm}
        title="Delete Selected Places"
        message={`Are you sure you want to delete ${selectionCount} places? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkDeleteConfirm(false)}
        variant="danger"
      />
    </div>
  );
};

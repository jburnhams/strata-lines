import { useState, useCallback } from 'react';

export interface UseMultiSelectReturn {
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  toggleSelectMode: () => void;
  isSelectMode: boolean;
  selectionCount: number;
}

export const useMultiSelect = (): UseMultiSelectReturn => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback((id: string) => {
    return selectedIds.has(id);
  }, [selectedIds]);

  const toggleSelectMode = useCallback(() => {
    setIsSelectMode(prev => {
      const next = !prev;
      if (!next) {
        setSelectedIds(new Set()); // Clear selection when exiting select mode
      }
      return next;
    });
  }, []);

  return {
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    toggleSelectMode,
    isSelectMode,
    selectionCount: selectedIds.size
  };
};

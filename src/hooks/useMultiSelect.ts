import { useState, useCallback } from 'react';

export interface UseMultiSelectReturn {
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  hasSelection: boolean;
  selectionCount: number;
  isSelectMode: boolean;
  toggleSelectMode: () => void;
  setSelectMode: (enabled: boolean) => void;
}

export const useMultiSelect = (): UseMultiSelectReturn => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
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
    setIsSelectMode(prev => !prev);
    if (isSelectMode) {
        // If turning off, clear selection? Or keep it?
        // Usually turning off select mode clears selection.
        // But doing it in effect in component is safer.
        // Let's just toggle here.
    }
  }, [isSelectMode]);

  const setSelectMode = useCallback((enabled: boolean) => {
      setIsSelectMode(enabled);
  }, []);

  return {
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    hasSelection: selectedIds.size > 0,
    selectionCount: selectedIds.size,
    isSelectMode,
    toggleSelectMode,
    setSelectMode
  };
};

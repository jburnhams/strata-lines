import { renderHook, act } from '@testing-library/react';
import { useMultiSelect } from '@/hooks/useMultiSelect';

describe('useMultiSelect', () => {
  it('should initialize with empty selection', () => {
    const { result } = renderHook(() => useMultiSelect());
    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.hasSelection).toBe(false);
    expect(result.current.selectionCount).toBe(0);
  });

  it('should toggle selection', () => {
    const { result } = renderHook(() => useMultiSelect());

    act(() => {
      result.current.toggleSelection('1');
    });

    expect(result.current.isSelected('1')).toBe(true);
    expect(result.current.selectionCount).toBe(1);

    act(() => {
      result.current.toggleSelection('1');
    });

    expect(result.current.isSelected('1')).toBe(false);
    expect(result.current.selectionCount).toBe(0);
  });

  it('should select all', () => {
    const { result } = renderHook(() => useMultiSelect());
    const ids = ['1', '2', '3'];

    act(() => {
      result.current.selectAll(ids);
    });

    expect(result.current.selectionCount).toBe(3);
    expect(result.current.isSelected('1')).toBe(true);
    expect(result.current.isSelected('2')).toBe(true);
    expect(result.current.isSelected('3')).toBe(true);
  });

  it('should clear selection', () => {
    const { result } = renderHook(() => useMultiSelect());
    const ids = ['1', '2'];

    act(() => {
      result.current.selectAll(ids);
    });

    expect(result.current.hasSelection).toBe(true);

    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.hasSelection).toBe(false);
    expect(result.current.selectionCount).toBe(0);
  });
});

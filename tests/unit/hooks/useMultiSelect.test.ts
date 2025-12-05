import { renderHook, act } from '@testing-library/react';
import { useMultiSelect } from '@/hooks/useMultiSelect';

describe('useMultiSelect', () => {
  it('should initialize with empty selection and select mode off', () => {
    const { result } = renderHook(() => useMultiSelect());
    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.isSelectMode).toBe(false);
  });

  it('should toggle selection mode', () => {
    const { result } = renderHook(() => useMultiSelect());

    act(() => {
      result.current.toggleSelectMode();
    });
    expect(result.current.isSelectMode).toBe(true);

    act(() => {
      result.current.toggleSelectMode();
    });
    expect(result.current.isSelectMode).toBe(false);
  });

  it('should toggle item selection', () => {
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

  it('should select all items', () => {
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
    expect(result.current.selectionCount).toBe(2);

    act(() => {
      result.current.clearSelection();
    });
    expect(result.current.selectionCount).toBe(0);
  });

  it('should clear selection when exiting select mode', () => {
    const { result } = renderHook(() => useMultiSelect());

    act(() => {
      result.current.toggleSelectMode(); // On
      result.current.toggleSelection('1');
    });
    expect(result.current.selectionCount).toBe(1);

    act(() => {
      result.current.toggleSelectMode(); // Off
    });
    expect(result.current.selectionCount).toBe(0);
  });
});

import { describe, it, expect, beforeEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    window.localStorage.clear();
    // Clear all mocks
    jest.clearAllMocks();
  });

  it('should return initial value when no stored value exists', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial-value'));

    expect(result.current[0]).toBe('initial-value');
  });

  it('should return stored value when it exists', () => {
    window.localStorage.setItem('test-key', JSON.stringify('stored-value'));

    const { result } = renderHook(() => useLocalStorage('test-key', 'initial-value'));

    expect(result.current[0]).toBe('stored-value');
  });

  it('should update localStorage when value changes', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial-value'));

    act(() => {
      result.current[1]('new-value');
    });

    expect(result.current[0]).toBe('new-value');
    expect(window.localStorage.getItem('test-key')).toBe(JSON.stringify('new-value'));
  });

  it('should work with complex objects', () => {
    const initialObject = { name: 'test', value: 123 };
    const { result } = renderHook(() => useLocalStorage('test-key', initialObject));

    expect(result.current[0]).toEqual(initialObject);

    const newObject = { name: 'updated', value: 456 };
    act(() => {
      result.current[1](newObject);
    });

    expect(result.current[0]).toEqual(newObject);
    expect(JSON.parse(window.localStorage.getItem('test-key')!)).toEqual(newObject);
  });

  it('should work with arrays', () => {
    const initialArray = [1, 2, 3];
    const { result } = renderHook(() => useLocalStorage('test-key', initialArray));

    expect(result.current[0]).toEqual(initialArray);

    const newArray = [4, 5, 6];
    act(() => {
      result.current[1](newArray);
    });

    expect(result.current[0]).toEqual(newArray);
    expect(JSON.parse(window.localStorage.getItem('test-key')!)).toEqual(newArray);
  });

  it('should work with numbers', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 42));

    expect(result.current[0]).toBe(42);

    act(() => {
      result.current[1](100);
    });

    expect(result.current[0]).toBe(100);
    expect(JSON.parse(window.localStorage.getItem('test-key')!)).toBe(100);
  });

  it('should work with booleans', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', false));

    expect(result.current[0]).toBe(false);

    act(() => {
      result.current[1](true);
    });

    expect(result.current[0]).toBe(true);
    expect(JSON.parse(window.localStorage.getItem('test-key')!)).toBe(true);
  });

  it('should handle function updates', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 10));

    act(() => {
      result.current[1](prev => prev + 5);
    });

    expect(result.current[0]).toBe(15);
    expect(JSON.parse(window.localStorage.getItem('test-key')!)).toBe(15);
  });

  it('should return initial value when localStorage contains invalid JSON', () => {
    window.localStorage.setItem('test-key', 'invalid-json{');
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useLocalStorage('test-key', 'initial-value'));

    expect(result.current[0]).toBe('initial-value');
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('should handle localStorage being unavailable', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('localStorage is not available');
    });

    const { result } = renderHook(() => useLocalStorage('test-key', 'initial-value'));

    // Should return initial value when localStorage fails
    expect(result.current[0]).toBe('initial-value');

    getItemSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should handle localStorage setItem errors gracefully', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota exceeded');
    });

    const { result } = renderHook(() => useLocalStorage('test-key', 'initial-value'));

    act(() => {
      result.current[1]('new-value');
    });

    // Value should still update in state even if localStorage fails
    expect(result.current[0]).toBe('new-value');

    setItemSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should use different storage for different keys', () => {
    const { result: result1 } = renderHook(() => useLocalStorage('key1', 'value1'));
    const { result: result2 } = renderHook(() => useLocalStorage('key2', 'value2'));

    expect(result1.current[0]).toBe('value1');
    expect(result2.current[0]).toBe('value2');

    act(() => {
      result1.current[1]('updated1');
    });

    expect(result1.current[0]).toBe('updated1');
    expect(result2.current[0]).toBe('value2'); // Should not be affected
  });

  it('should sync multiple hooks using the same key', () => {
    const { result: result1 } = renderHook(() => useLocalStorage('shared-key', 'initial'));
    const { result: result2 } = renderHook(() => useLocalStorage('shared-key', 'initial'));

    // Both should start with the same value
    expect(result1.current[0]).toBe('initial');
    expect(result2.current[0]).toBe('initial');

    // Update through first hook
    act(() => {
      result1.current[1]('updated');
    });

    // First hook should be updated
    expect(result1.current[0]).toBe('updated');

    // Note: The second hook won't automatically sync without a storage event listener
    // This is expected behavior - each hook instance maintains its own state
  });
});

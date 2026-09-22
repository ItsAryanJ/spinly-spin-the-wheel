import { useState, useEffect, useCallback } from 'react';

/**
 * Persist state to localStorage. Safe for SSR (though we're SPA-only).
 * Falls back to defaultValue on parse errors or missing keys.
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        return JSON.parse(stored) as T;
      }
    } catch {
      // Corrupted data — fall through
    }
    return defaultValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or unavailable — silently ignore
    }
  }, [key, value]);

  const setStoredValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      setValue(newValue);
    },
    [],
  );

  return [value, setStoredValue];
}

import { useEffect, useCallback, useRef } from 'react';

interface AutoSaveOptions {
  key: string;        // localStorage key prefix
  debounceMs?: number; // debounce delay (default 500ms)
}

/**
 * Auto-save state to localStorage. Returns { restore, clear } helpers.
 *
 * Usage:
 *   const { save, restore, clear } = useAutoSave({ key: 'prelab_flow' });
 *   // Call save(state) in useEffect when state changes
 *   // Call restore() on mount to check for saved progress
 *   // Call clear() when done
 */
export function useAutoSave<T extends Record<string, unknown>>(options: AutoSaveOptions) {
  const { key, debounceMs = 500 } = options;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageKey = `autosave_${key}`;

  // Save with debounce
  const save = useCallback(
    (data: T) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              data,
              timestamp: Date.now(),
            }),
          );
        } catch {
          // localStorage full or unavailable — silently ignore
        }
      }, debounceMs);
    },
    [storageKey, debounceMs],
  );

  // Restore saved state
  const restore = useCallback((): { data: T; timestamp: number } | null => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.data) return null;
      return parsed;
    } catch {
      return null;
    }
  }, [storageKey]);

  // Clear saved state
  const clear = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [storageKey]);

  // Flush pending saves on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { save, restore, clear };
}

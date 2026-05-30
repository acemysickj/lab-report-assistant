import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

/**
 * Warn the user before leaving the page if there are unsaved changes.
 * Uses both `beforeunload` (tab close/refresh) and `useBlocker` (in-app navigation).
 *
 * @param hasUnsaved - whether there are unsaved changes
 * @param message - custom message for the browser dialog (some browsers ignore this)
 */
export function useUnsavedWarning(hasUnsaved: boolean, message?: string) {
  // Browser tab close / refresh
  useEffect(() => {
    if (!hasUnsaved) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message || '您有未保存的更改，确定离开吗？';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsaved, message]);

  // In-app navigation (React Router)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsaved && currentLocation.pathname !== nextLocation.pathname,
  );

  return blocker;
}

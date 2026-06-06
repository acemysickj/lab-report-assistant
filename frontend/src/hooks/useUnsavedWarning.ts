import { useEffect } from 'react';

/**
 * Warn the user before leaving the page if there are unsaved changes.
 * Uses `beforeunload` (tab close/refresh).
 *
 * NOTE: In-app navigation blocking requires a data router (createBrowserRouter).
 * Currently using <BrowserRouter> which doesn't support useBlocker.
 * When migrating to createBrowserRouter, re-enable useBlocker for in-app warnings.
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

  // Return a dummy blocker for API compatibility.
  // In-app navigation is NOT blocked until we migrate to createBrowserRouter.
  return { state: 'unblocked' as string, proceed: undefined as (() => void) | undefined, reset: undefined as (() => void) | undefined };
}

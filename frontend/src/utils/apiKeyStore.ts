const API_KEY_STORAGE = 'lab_assistant_api_key';

export function getApiKey(): string {
  try {
    return localStorage.getItem(API_KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function setApiKey(key: string) {
  try {
    localStorage.setItem(API_KEY_STORAGE, key.trim());
  } catch { /* ignore */ }
}

export function clearApiKey() {
  try {
    localStorage.removeItem(API_KEY_STORAGE);
  } catch { /* ignore */ }
}

export function hasApiKey(): boolean {
  return getApiKey().length > 0;
}

/**
 * Storage adapter for Zustand `persist`.
 *
 * Zustand's `createJSONStorage` expects a synchronous-or-async StateStorage
 * with getItem/setItem/removeItem. Web injects `localStorage`; mobile injects
 * an AsyncStorage-backed implementation.
 *
 * Each app registers its storage ONCE at startup via `setStorage`. Core stores
 * read it lazily through `getStorage()` so registration order does not matter
 * as long as it happens before the store is first hydrated.
 */

export interface StorageAdapter {
  getItem: (name: string) => string | null | Promise<string | null>;
  setItem: (name: string, value: string) => void | Promise<void>;
  removeItem: (name: string) => void | Promise<void>;
}

let storage: StorageAdapter | null = null;

export function setStorage(adapter: StorageAdapter): void {
  storage = adapter;
}

/**
 * Returns the registered storage adapter, or a no-op in-memory fallback if none
 * was set (e.g. SSR / tests). The fallback keeps stores functional without
 * persistence rather than throwing during render.
 */
export function getStorage(): StorageAdapter {
  if (storage) return storage;
  return memoryFallback;
}

const memoryMap = new Map<string, string>();
const memoryFallback: StorageAdapter = {
  getItem: (name) => memoryMap.get(name) ?? null,
  setItem: (name, value) => {
    memoryMap.set(name, value);
  },
  removeItem: (name) => {
    memoryMap.delete(name);
  },
};

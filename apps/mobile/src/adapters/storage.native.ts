import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StorageAdapter } from '@easyeng/core/adapters';

/**
 * Native StorageAdapter backed by AsyncStorage. The async API satisfies
 * @easyeng/core's StorageAdapter (which already allows Promise returns) and
 * Zustand's persist middleware.
 */
export const nativeStorage: StorageAdapter = {
  getItem: (name) => AsyncStorage.getItem(name),
  setItem: (name, value) => AsyncStorage.setItem(name, value),
  removeItem: (name) => AsyncStorage.removeItem(name),
};

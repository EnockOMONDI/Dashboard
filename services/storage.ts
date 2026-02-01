
import { Entity } from '../types';

/**
 * ThinkStack Persistent Storage
 * Uses localStorage to ensure that a user's Strategic OS data 
 * persists across sessions, refreshes, and browser restarts.
 */

const STORAGE_KEY = 'thinkstack_os_data';

export const storage = {
  saveEntities: (entities: Entity[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entities));
    } catch (e) {
      console.error('Failed to persist to local storage:', e);
    }
  },
  
  loadEntities: (): Entity[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to load from local storage:', e);
      return [];
    }
  },

  clear: () => {
    localStorage.removeItem(STORAGE_KEY);
  }
};

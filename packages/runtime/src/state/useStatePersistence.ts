/**
 * useStatePersistence — hook for syncing dashboard state to a chosen storage.
 * Returns save/load/clear functions. The host app calls these as needed.
 */
import { useCallback, useRef } from 'react';
import type { DashboardState } from './StatePersistence';
import {
  serializeState,
  deserializeState,
  stateToUrlParams,
  stateFromUrlParams,
} from './StatePersistence';

export interface StatePersistenceOptions {
  storage?: 'url' | 'sessionStorage' | 'localStorage' | 'none';
  key?: string;
}

export interface StatePersistenceResult {
  save: (state: DashboardState) => void;
  load: () => DashboardState | null;
  clear: () => void;
}

export function useStatePersistence(
  options: StatePersistenceOptions = {},
): StatePersistenceResult {
  const { storage = 'none', key = 'supersubset-state' } = options;
  const storageRef = useRef(storage);
  const keyRef = useRef(key);
  storageRef.current = storage;
  keyRef.current = key;

  const save = useCallback((state: DashboardState) => {
    switch (storageRef.current) {
      case 'localStorage':
        try {
          localStorage.setItem(keyRef.current, serializeState(state));
        } catch {
          /* storage full or unavailable */
        }
        break;
      case 'sessionStorage':
        try {
          sessionStorage.setItem(keyRef.current, serializeState(state));
        } catch {
          /* storage full or unavailable */
        }
        break;
      case 'url': {
        const params = stateToUrlParams(state);
        const url = new URL(window.location.href);
        url.search = params.toString();
        window.history.replaceState(null, '', url.toString());
        break;
      }
      case 'none':
      default:
        break;
    }
  }, []);

  const load = useCallback((): DashboardState | null => {
    switch (storageRef.current) {
      case 'localStorage': {
        const raw = localStorage.getItem(keyRef.current);
        return raw ? deserializeState(raw) : null;
      }
      case 'sessionStorage': {
        const raw = sessionStorage.getItem(keyRef.current);
        return raw ? deserializeState(raw) : null;
      }
      case 'url': {
        const params = new URLSearchParams(window.location.search);
        const partial = stateFromUrlParams(params);
        if (Object.keys(partial).length === 0) return null;
        return { filterValues: {}, ...partial };
      }
      case 'none':
      default:
        return null;
    }
  }, []);

  const clear = useCallback(() => {
    switch (storageRef.current) {
      case 'localStorage':
        localStorage.removeItem(keyRef.current);
        break;
      case 'sessionStorage':
        sessionStorage.removeItem(keyRef.current);
        break;
      case 'url': {
        const url = new URL(window.location.href);
        url.search = '';
        window.history.replaceState(null, '', url.toString());
        break;
      }
      case 'none':
      default:
        break;
    }
  }, []);

  return { save, load, clear };
}

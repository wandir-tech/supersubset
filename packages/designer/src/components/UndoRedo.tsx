/**
 * useUndoRedo — Hook for undo/redo history on dashboard definitions.
 *
 * Maintains a bounded history stack of DashboardDefinition snapshots.
 * Designed for the host app to wire into SupersubsetDesigner's onChange.
 */
import { useState, useCallback, useRef } from 'react';
import type { DashboardDefinition } from '@supersubset/schema';

export interface UndoRedoState {
  /** Current dashboard value */
  current: DashboardDefinition;
  /** Push a new snapshot (called on dashboard change) */
  push: (value: DashboardDefinition) => void;
  /** Undo to previous state */
  undo: () => void;
  /** Redo to next state */
  redo: () => void;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Number of undo steps available */
  undoCount: number;
  /** Number of redo steps available */
  redoCount: number;
  /** Reset history to a single snapshot */
  reset: (value: DashboardDefinition) => void;
}

export interface UseUndoRedoOptions {
  /** Maximum history length. Default: 50 */
  maxHistory?: number;
  /** Debounce interval in ms. Snapshots within this window are merged. Default: 300 */
  debounceMs?: number;
}

/**
 * Hook providing undo/redo history for DashboardDefinition.
 *
 * Usage:
 *   const { current, push, undo, redo, canUndo, canRedo } = useUndoRedo(initialDashboard);
 *   <SupersubsetDesigner value={current} onChange={push} />
 *   <button onClick={undo} disabled={!canUndo}>Undo</button>
 */
export function useUndoRedo(
  initial: DashboardDefinition,
  options?: UseUndoRedoOptions
): UndoRedoState {
  const maxHistory = options?.maxHistory ?? 50;
  const debounceMs = options?.debounceMs ?? 300;

  // Use refs for the stacks to avoid re-renders on every push
  const pastRef = useRef<DashboardDefinition[]>([]);
  const futureRef = useRef<DashboardDefinition[]>([]);
  const lastPushTime = useRef(0);

  const [current, setCurrent] = useState(initial);
  // Force re-render counter for canUndo/canRedo
  const [, setTick] = useState(0);
  const tick = useCallback(() => setTick((t) => t + 1), []);

  const push = useCallback(
    (value: DashboardDefinition) => {
      const now = Date.now();
      const elapsed = now - lastPushTime.current;
      lastPushTime.current = now;

      setCurrent((prev) => {
        // Debounce: if within window, replace current instead of pushing
        if (elapsed > debounceMs) {
          pastRef.current = [...pastRef.current, prev].slice(-maxHistory);
        }
        // Clear redo stack on new change
        futureRef.current = [];
        tick();
        return value;
      });
    },
    [maxHistory, debounceMs, tick]
  );

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    setCurrent((prev) => {
      const past = [...pastRef.current];
      const previous = past.pop()!;
      pastRef.current = past;
      futureRef.current = [prev, ...futureRef.current];
      tick();
      return previous;
    });
  }, [tick]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    setCurrent((prev) => {
      const future = [...futureRef.current];
      const next = future.shift()!;
      futureRef.current = future;
      pastRef.current = [...pastRef.current, prev];
      tick();
      return next;
    });
  }, [tick]);

  const reset = useCallback(
    (value: DashboardDefinition) => {
      pastRef.current = [];
      futureRef.current = [];
      lastPushTime.current = 0;
      setCurrent(value);
      tick();
    },
    [tick]
  );

  return {
    current,
    push,
    undo,
    redo,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
    undoCount: pastRef.current.length,
    redoCount: futureRef.current.length,
    reset,
  };
}

// ─── UndoRedoToolbar component ───────────────────────────────

export interface UndoRedoToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  undoCount?: number;
  redoCount?: number;
  className?: string;
}

/**
 * Simple toolbar with Undo/Redo buttons + keyboard shortcut support.
 */
export function UndoRedoToolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  undoCount,
  redoCount,
  className,
}: UndoRedoToolbarProps) {
  // Keyboard shortcuts are handled by the host app via useUndoRedoKeyboard

  const buttonStyle = (enabled: boolean): React.CSSProperties => ({
    padding: '4px 10px',
    borderRadius: 4,
    border: '1px solid #d9d9d9',
    background: enabled ? '#fff' : '#f5f5f5',
    cursor: enabled ? 'pointer' : 'default',
    fontSize: 13,
    fontFamily: 'sans-serif',
    opacity: enabled ? 1 : 0.4,
  });

  return (
    <div
      className={className}
      style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}
      data-testid="undo-redo-toolbar"
    >
      <button
        onClick={onUndo}
        disabled={!canUndo}
        style={buttonStyle(canUndo)}
        title={`Undo${undoCount ? ` (${undoCount})` : ''} — ⌘Z`}
        data-testid="undo-btn"
      >
        ↩
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        style={buttonStyle(canRedo)}
        title={`Redo${redoCount ? ` (${redoCount})` : ''} — ⌘⇧Z`}
        data-testid="redo-btn"
      >
        ↪
      </button>
    </div>
  );
}

// ─── Keyboard shortcut hook ──────────────────────────────────

import { useEffect } from 'react';

/**
 * Hook that binds Cmd/Ctrl+Z (undo) and Cmd/Ctrl+Shift+Z (redo) keyboard shortcuts.
 */
export function useUndoRedoKeyboard(
  undo: () => void,
  redo: () => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.key.toLowerCase() !== 'z') return;
      e.preventDefault();
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [undo, redo, enabled]);
}

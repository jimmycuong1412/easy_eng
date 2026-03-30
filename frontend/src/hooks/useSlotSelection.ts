'use client';

import { useState, useRef, useCallback } from 'react';

export interface CellCoord {
  dateKey: string;   // "YYYY-MM-DD"
  time: string;      // "HH:MM"
  rowIdx: number;    // index in timeSlots array (0–56)
  colIdx: number;    // index in weekDays array (0–6)
}

export interface UseSlotSelectionReturn {
  selected: Set<string>;
  isDragging: boolean;
  isSelected: (dateKey: string, time: string) => boolean;
  selectionCount: number;
  startSelect: (cell: CellCoord) => void;
  extendSelect: (cell: CellCoord) => void;
  endSelect: () => void;
  shiftSelect: (cell: CellCoord, allCells: CellCoord[]) => void;
  clearSelection: () => void;
}

function cellKey(dateKey: string, time: string): string {
  return `${dateKey}:${time}`;
}

function computeRectangle(a: CellCoord, b: CellCoord, all: CellCoord[]): Set<string> {
  const minRow = Math.min(a.rowIdx, b.rowIdx);
  const maxRow = Math.max(a.rowIdx, b.rowIdx);
  const minCol = Math.min(a.colIdx, b.colIdx);
  const maxCol = Math.max(a.colIdx, b.colIdx);
  const result = new Set<string>();
  for (const c of all) {
    if (
      c.rowIdx >= minRow &&
      c.rowIdx <= maxRow &&
      c.colIdx >= minCol &&
      c.colIdx <= maxCol
    ) {
      result.add(cellKey(c.dateKey, c.time));
    }
  }
  return result;
}

export function useSlotSelection(): UseSlotSelectionReturn {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const anchorRef = useRef<CellCoord | null>(null);
  const allCellsRef = useRef<CellCoord[]>([]);

  const startSelect = useCallback((cell: CellCoord) => {
    anchorRef.current = cell;
    setIsDragging(true);
    setSelected(new Set([cellKey(cell.dateKey, cell.time)]));
  }, []);

  const extendSelect = useCallback((cell: CellCoord) => {
    if (!anchorRef.current) return;
    setSelected(computeRectangle(anchorRef.current, cell, allCellsRef.current));
  }, []);

  const endSelect = useCallback(() => {
    setIsDragging(false);
  }, []);

  const shiftSelect = useCallback((cell: CellCoord, allCells: CellCoord[]) => {
    allCellsRef.current = allCells;
    if (!anchorRef.current) {
      anchorRef.current = cell;
      setSelected(new Set([cellKey(cell.dateKey, cell.time)]));
      return;
    }
    setSelected(computeRectangle(anchorRef.current, cell, allCells));
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    anchorRef.current = null;
    setIsDragging(false);
  }, []);

  return {
    selected,
    isDragging,
    isSelected: useCallback(
      (dateKey: string, time: string) => selected.has(cellKey(dateKey, time)),
      [selected]
    ),
    selectionCount: selected.size,
    startSelect,
    extendSelect,
    endSelect,
    shiftSelect,
    clearSelection,
  };
}

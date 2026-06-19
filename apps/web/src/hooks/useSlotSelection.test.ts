import { renderHook, act } from '@testing-library/react';
import { useSlotSelection } from './useSlotSelection';

const makeCell = (dateKey: string, time: string, rowIdx: number, colIdx: number) => ({
  dateKey,
  time,
  rowIdx,
  colIdx,
});

const cell = (r: number, c: number) => makeCell(`2026-04-0${c + 1}`, `0${r}:00`, r, c);

// 3x3 grid of cells for rectangle tests
const allCells = [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => cell(r, c)));

describe('useSlotSelection', () => {
  it('startSelect sets isDragging=true and adds key to selected', () => {
    const { result } = renderHook(() => useSlotSelection());

    expect(result.current.isDragging).toBe(false);
    expect(result.current.selectionCount).toBe(0);

    act(() => {
      result.current.startSelect(cell(0, 0));
    });

    expect(result.current.isDragging).toBe(true);
    expect(result.current.selectionCount).toBe(1);
    expect(result.current.isSelected('2026-04-01', '00:00')).toBe(true);
  });

  it('extendSelect from anchor to target selects a 2x2 rectangle', () => {
    const { result } = renderHook(() => useSlotSelection());

    act(() => {
      result.current.startSelect(cell(0, 0)); // anchor at row 0, col 0
    });

    // Manually update allCells ref by calling shiftSelect first to populate it
    act(() => {
      result.current.shiftSelect(cell(0, 0), allCells); // sets anchor + allCells
    });

    act(() => {
      result.current.extendSelect(cell(1, 1)); // extend to row 1, col 1
    });

    // Should select (0,0), (0,1), (1,0), (1,1)
    expect(result.current.selectionCount).toBe(4);
    expect(result.current.isSelected('2026-04-01', '00:00')).toBe(true);
    expect(result.current.isSelected('2026-04-02', '00:00')).toBe(true);
    expect(result.current.isSelected('2026-04-01', '01:00')).toBe(true);
    expect(result.current.isSelected('2026-04-02', '01:00')).toBe(true);
    // Should NOT include (2,2)
    expect(result.current.isSelected('2026-04-03', '02:00')).toBe(false);
  });

  it('shiftSelect from anchor to target selects rectangle without isDragging', () => {
    const { result } = renderHook(() => useSlotSelection());

    // Set anchor
    act(() => {
      result.current.startSelect(cell(0, 0));
    });
    act(() => {
      result.current.endSelect();
    });

    expect(result.current.isDragging).toBe(false);

    // Shift-click to extend
    act(() => {
      result.current.shiftSelect(cell(2, 2), allCells);
    });

    // Should select all 9 cells (0,0) to (2,2)
    expect(result.current.selectionCount).toBe(9);
    expect(result.current.isDragging).toBe(false);
  });

  it('clearSelection empties selection and resets anchor', () => {
    const { result } = renderHook(() => useSlotSelection());

    act(() => {
      result.current.startSelect(cell(0, 0));
      result.current.shiftSelect(cell(1, 1), allCells);
    });

    expect(result.current.selectionCount).toBeGreaterThan(0);

    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectionCount).toBe(0);
    expect(result.current.isDragging).toBe(false);

    // Shift-clicking without anchor should start fresh
    act(() => {
      result.current.shiftSelect(cell(2, 2), allCells);
    });
    // No anchor → single cell selected
    expect(result.current.selectionCount).toBe(1);
  });

  it('endSelect sets isDragging=false but preserves selection', () => {
    const { result } = renderHook(() => useSlotSelection());

    act(() => {
      result.current.startSelect(cell(0, 0));
    });

    expect(result.current.isDragging).toBe(true);
    expect(result.current.selectionCount).toBe(1);

    act(() => {
      result.current.endSelect();
    });

    expect(result.current.isDragging).toBe(false);
    expect(result.current.selectionCount).toBe(1); // selection preserved
    expect(result.current.isSelected('2026-04-01', '00:00')).toBe(true);
  });
});

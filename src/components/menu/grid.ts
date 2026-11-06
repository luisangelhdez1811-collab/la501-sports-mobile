import { MaxContentWidth } from '@/constants/theme';

export const GRID_GUTTER = 16;
export const GRID_GAP = 12;

/** Width of one card in the two-column menu grids. */
export function gridCardWidth(windowWidth: number) {
  const contentWidth = Math.min(windowWidth, MaxContentWidth);
  return (contentWidth - GRID_GUTTER * 2 - GRID_GAP) / 2;
}

/**
 * How much of a two-column photo grid is kept drawn: the first screen at once, then a
 * few rows per frame, and about three screens around what's visible (the default, 21
 * screens, keeps far more photo cards alive than a phone needs).
 */
export const MENU_GRID_WINDOW = { initialNumToRender: 8, maxToRenderPerBatch: 6, windowSize: 7 } as const;

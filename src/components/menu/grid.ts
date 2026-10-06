import { MaxContentWidth } from '@/constants/theme';

export const GRID_GUTTER = 16;
export const GRID_GAP = 12;

/** Width of one card in the two-column menu grids. */
export function gridCardWidth(windowWidth: number) {
  const contentWidth = Math.min(windowWidth, MaxContentWidth);
  return (contentWidth - GRID_GUTTER * 2 - GRID_GAP) / 2;
}

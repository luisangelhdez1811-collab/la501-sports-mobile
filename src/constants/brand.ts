/**
 * La 501 Sports Restaurant design tokens: palette, typography and radii.
 * The brand is dark-first; `BrandPalettes.light` is the alternate mode toggled from the header.
 */

/** Accent colors, identical in both modes. */
export const Brand = {
  orange: '#F97316', // Primary buttons, highlighted titles, active element
  orangeDark: '#EA580C', // Pressed state of orange buttons
  green: '#16A34A', // Add / confirm / available
  greenDark: '#15803D', // Pressed state of green buttons
  greenLight: '#22C55E', // Success indicators
  red: '#EF4444', // Complaints, cancellations, delete
  blue: '#2563EB', // Staff panel filters and actions
  white: '#FFFFFF', // Text on orange / green surfaces
  // Fills under white text: these pass WCAG AA (4.5:1); orange / green above don't.
  orangeFill: '#C2410C', // 5.18:1 with white
  orangeFillPressed: '#9A3412',
  greenFill: '#15803D', // 5.02:1 with white
  greenFillPressed: '#166534',
} as const;

export type BrandScheme = 'light' | 'dark';

export type BrandPalette = {
  background: string;
  surface: string;
  border: string;
  text: string;
  textSecondary: string;
  header: string;
  heroTop: string;
  imagePlaceholder: string;
  scrim: string;
  /** Orange, green and amber for TEXT on this mode's background (AA contrast). */
  accent: string;
  success: string;
  warning: string;
};

export const BrandPalettes: Record<BrandScheme, BrandPalette> = {
  dark: {
    background: '#0F0D0A', // Screen background
    surface: '#1A1612', // Cards, forms, bars
    border: '#2A241E',
    text: '#FFFFFF',
    textSecondary: '#A1A1AA',
    header: '#000000',
    heroTop: '#2A1A0C',
    imagePlaceholder: '#3A2A1C',
    scrim: 'rgba(15, 13, 10, 0.7)',
    accent: '#FB923C',
    success: '#4ADE80',
    warning: '#FBBF24',
  },
  light: {
    background: '#FAF7F2',
    surface: '#FFFFFF',
    border: '#E7E0D6',
    text: '#1A1612',
    textSecondary: '#57534E',
    header: '#FFFFFF',
    heroTop: '#FFE8D1',
    imagePlaceholder: '#F3E5D5',
    scrim: 'rgba(250, 247, 242, 0.75)',
    accent: '#C2410C',
    success: '#15803D',
    warning: '#B45309',
  },
};

/** Font family names as registered by `useFonts` in the root layout. */
export const BrandFonts = {
  /** Screen titles, uppercase, 32–40. */
  display: 'BebasNeue_400Regular',
  /** Navigation, buttons and labels, uppercase with wide tracking, 14–18. */
  label: 'Oswald_500Medium',
  labelBold: 'Oswald_600SemiBold',
  /** Body copy, forms and panels, 14–16 (never below 12). */
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodyBold: 'Inter_700Bold',
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

import * as SecureStore from 'expo-secure-store';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { Appearance, Platform } from 'react-native';

import { BrandPalettes, type BrandPalette, type BrandScheme } from '@/constants/brand';

// Not sensitive; SecureStore is just the key-value store the app already ships.
const SCHEME_KEY = 'la501_color_scheme';
const DEFAULT_SCHEME: BrandScheme = 'dark';
const isNative = Platform.OS !== 'web';

// Apply the brand default before the first render so native views (tabs, system
// bars) never flash in the device's light mode while the preference is read.
if (isNative) Appearance.setColorScheme(DEFAULT_SCHEME);

type BrandThemeValue = {
  scheme: BrandScheme;
  colors: BrandPalette;
  toggleScheme: () => void;
};

const BrandThemeContext = createContext<BrandThemeValue | null>(null);

export function BrandThemeProvider({ children }: { children: ReactNode }) {
  const [scheme, setScheme] = useState<BrandScheme>(DEFAULT_SCHEME);

  useEffect(() => {
    if (!isNative) return;
    let active = true;
    SecureStore.getItemAsync(SCHEME_KEY)
      .then((saved) => {
        if (active && (saved === 'light' || saved === 'dark')) setScheme(saved);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Keeps native components that read the system scheme (NativeTabs) in sync.
  useEffect(() => {
    if (isNative) Appearance.setColorScheme(scheme);
  }, [scheme]);

  const toggleScheme = () => {
    const next = scheme === 'dark' ? 'light' : 'dark';
    setScheme(next);
    if (isNative) SecureStore.setItemAsync(SCHEME_KEY, next).catch(() => {});
  };

  return (
    <BrandThemeContext value={{ scheme, colors: BrandPalettes[scheme], toggleScheme }}>
      {children}
    </BrandThemeContext>
  );
}

export function useBrandTheme() {
  const context = use(BrandThemeContext);
  if (!context) throw new Error('useBrandTheme must be used inside BrandThemeProvider');
  return context;
}

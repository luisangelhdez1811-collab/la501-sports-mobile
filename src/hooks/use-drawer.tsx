import { createContext, use, useState, type ReactNode } from 'react';

type DrawerContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const DrawerContext = createContext<DrawerContextValue | null>(null);

/** State for the ☰ navigation panel, opened from the header on any screen. */
export function DrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DrawerContext
      value={{ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }}>
      {children}
    </DrawerContext>
  );
}

export function useDrawer() {
  const context = use(DrawerContext);
  if (!context) throw new Error('useDrawer must be used inside DrawerProvider');
  return context;
}

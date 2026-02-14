"use client";

import {
  createContext,
  useContext,
  type CSSProperties,
  type ReactNode,
} from "react";

export interface WorldTheme {
  name?: string;
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  surface?: string;
}

const worldContext = createContext<{ theme?: WorldTheme | null }>({
  theme: null,
});

interface WorldThemeProviderProps {
  theme?: WorldTheme | null;
  children: ReactNode;
}

export function WorldThemeProvider({
  theme,
  children,
}: WorldThemeProviderProps) {
  const customStyle: CSSProperties | undefined = theme
    ? ({
        "--world-primary": theme.primary,
        "--world-secondary": theme.secondary,
        "--world-accent": theme.accent,
        "--world-background": theme.background,
        "--world-surface": theme.surface,
        "--primary": theme.primary,
        "--secondary": theme.secondary,
        "--accent": theme.accent,
      } as CSSProperties)
    : undefined;

  return (
    <worldContext.Provider value={{ theme }}>
      <div style={customStyle}>{children}</div>
    </worldContext.Provider>
  );
}

export function useWorldTheme() {
  return useContext(worldContext);
}

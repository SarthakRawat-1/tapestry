'use client';

import { useTheme } from 'next-themes';
import { ThemeSwitcher } from './theme-switcher';

export function ThemeSelector() {
  const { setTheme, theme } = useTheme();

  return (
    <ThemeSwitcher
      value={theme as 'light' | 'dark' | 'system'}
      onChange={(newTheme) => setTheme(newTheme)}
      defaultValue="light"
    />
  );
}

export function CompactThemeSelector() {
  const { setTheme, theme } = useTheme();

  return (
    <ThemeSwitcher
      value={theme as 'light' | 'dark' | 'system'}
      onChange={(newTheme) => setTheme(newTheme)}
      defaultValue="light"
      className="h-8 scale-75"
    />
  );
}

export function ThemeMenuItem() {
  const { setTheme, theme } = useTheme();

  return (
    <ThemeSwitcher
      value={theme as 'light' | 'dark' | 'system'}
      onChange={(newTheme) => setTheme(newTheme)}
      defaultValue="light"
    />
  );
}

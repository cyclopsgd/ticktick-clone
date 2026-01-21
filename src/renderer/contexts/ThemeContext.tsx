import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');

  const updateResolvedTheme = useCallback(async (currentTheme: Theme) => {
    if (currentTheme === 'system') {
      const systemTheme = await window.electronAPI.theme.getSystem();
      setResolvedTheme(systemTheme);
    } else {
      setResolvedTheme(currentTheme);
    }
  }, []);

  useEffect(() => {
    // Load initial theme
    const loadTheme = async () => {
      const savedTheme = await window.electronAPI.theme.get();
      setThemeState(savedTheme);
      await updateResolvedTheme(savedTheme);
    };
    loadTheme();
  }, [updateResolvedTheme]);

  useEffect(() => {
    // Apply theme to document
    if (resolvedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [resolvedTheme]);

  const setTheme = useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme);
    await window.electronAPI.theme.set(newTheme);
    await updateResolvedTheme(newTheme);
  }, [updateResolvedTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

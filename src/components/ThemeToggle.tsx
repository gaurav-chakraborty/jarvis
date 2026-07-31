import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export const ThemeToggle = React.memo(() => {
  const { effectiveTheme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${effectiveTheme === 'dark' ? 'light' : 'dark'} mode`}
      className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
      title={`Current: ${effectiveTheme} mode`}
    >
      {effectiveTheme === 'dark' ? (
        <Sun className="w-5 h-5 text-yellow-400" />
      ) : (
        <Moon className="w-5 h-5 text-indigo-400" />
      )}
    </button>
  );
});

ThemeToggle.displayName = 'ThemeToggle';

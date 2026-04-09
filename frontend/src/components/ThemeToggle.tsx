import { useState, useEffect } from 'react';

export function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('jotto-theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('jotto-theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <button
      className="theme-toggle"
      onClick={() => setDark(!dark)}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? '☀️' : '🌙'}
    </button>
  );
}

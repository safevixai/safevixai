// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

(function () {
  try {
    var theme = localStorage.getItem('svai-theme') || 'system';
    var effectiveTheme = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : theme;
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    document.documentElement.classList.add(effectiveTheme);
  } catch (_) {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
  }
})();

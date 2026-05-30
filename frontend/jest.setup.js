import '@testing-library/jest-dom'

// Mock react-i18next globally to support useTranslation across localized components.
jest.mock('react-i18next', () => ({
  useTranslation: (ns) => ({
    t: (key, fallback) => {
      // Map exact values that existing tests expect
      const translations = {
        'connecting_warming': 'Connecting... (~30 seconds on first load)',
        'common.install_title': 'Install SafeVixAI',
        'common.install_desc': 'Get offline access & faster loading',
        'common.install_btn': 'Install',
        'common.dismiss_install': 'Dismiss install prompt',
      };
      if (translations[key]) return translations[key];
      if (typeof fallback === 'string') return fallback;
      return key;
    },
    i18n: {
      changeLanguage: () => Promise.resolve(),
      language: 'en',
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}));

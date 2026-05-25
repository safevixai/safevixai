import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from '@/i18n/config/resources';

// Zero-dependency dynamic import backend loader for i18next
const dynamicLoaderBackend = {
  type: 'backend' as const,
  init: () => {},
  read: (language: string, namespace: string, callback: (err: Error | null, data: unknown) => void) => {
    const loader = resources[language]?.[namespace] || resources['en']?.[namespace];
    if (!loader) {
      callback(new Error(`No loader found for ${language}/${namespace}`), null);
      return;
    }
    loader()
      .then((module) => callback(null, module.default))
      .catch((err) => {
        console.warn(`Dynamic load failed for ${language}/${namespace}, falling back to English.`, err);
        // English fallback loader
        const enLoader = resources['en']?.[namespace];
        if (enLoader) {
          enLoader()
            .then((module) => callback(null, module.default))
            .catch((fallbackErr) => callback(fallbackErr, null));
        } else {
          callback(err, null);
        }
      });
  },
};

i18n
  .use(initReactI18next)
  .use(dynamicLoaderBackend)
  .init({
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'auth', 'dashboard', 'challan', 'chat', 'settings', 'errors', 'validation'],
    interpolation: {
      escapeValue: false, // React already escapes values (prevents XSS)
    },
    react: {
      useSuspense: false, // Prevents SSR/client hydration lag or mismatches
    },
  });

export default i18n;

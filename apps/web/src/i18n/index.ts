import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import ru from './locales/ru.json';
import en from './locales/en.json';

const LS_LOCALE = 'duopoker_locale';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { ru: { translation: ru }, en: { translation: en } },
    fallbackLng: 'ru',
    lng: 'ru',
    supportedLngs: ['ru', 'en'],
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LS_LOCALE,
      caches: ['localStorage']
    },
    interpolation: { escapeValue: false }
  });

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

document.documentElement.lang = i18n.language;

export default i18n;

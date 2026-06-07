import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from '../../../web/src/i18n/locales/ru.json';
import en from '../../../web/src/i18n/locales/en.json';

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: { ru: { translation: ru }, en: { translation: en } },
    fallbackLng: 'ru',
    lng: 'ru',
    supportedLngs: ['ru', 'en'],
    interpolation: { escapeValue: false }
  });
}

export default i18n;

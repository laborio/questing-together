import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18n } from 'i18n-js';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { en, fr } from '@/locales';
import type en_type from '@/locales/en';

const STORAGE_KEY = 'user_language';

type Locale = 'en' | 'fr';

type LeafOrBranch<K extends string | number, V> = V extends object
  ? `${K}` | `${K}.${DotNestedKeys<V>}`
  : `${K}`;

type DotNestedKeys<T> = T extends object
  ? { [K in keyof T]: K extends string | number ? LeafOrBranch<K, T[K]> : never }[keyof T]
  : never;

type TranslationKeys = DotNestedKeys<typeof en_type>;

type TFunction = (scope: TranslationKeys, options?: Record<string, unknown>) => string;

type I18nContextValue = {
  t: TFunction;
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const i18n = new I18n({ en, fr });
i18n.defaultLocale = 'en';
i18n.locale = 'en';
i18n.enableFallback = true;

const I18nContext = createContext<I18nContextValue | null>(null);

const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'en' || saved === 'fr') {
        i18n.locale = saved;
        setLocaleState(saved);
      }
    });
  }, []);

  const setLocale = useCallback((next: Locale) => {
    i18n.locale = next;
    setLocaleState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const t: TFunction = useCallback(
    (scope, options) => i18n.t(scope, { locale, defaultValue: scope, ...options }),
    [locale],
  );

  const value = useMemo(() => ({ t, locale, setLocale }), [t, locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

const useTranslation = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useTranslation must be used within I18nProvider');
  return ctx;
};

export { I18nProvider, useTranslation };
export default I18nProvider;

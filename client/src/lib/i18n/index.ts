import en from './translations/en.json';
import id from './translations/id.json';
import zh from './translations/zh.json';
import ja from './translations/ja.json';
import ko from './translations/ko.json';
import th from './translations/th.json';
import vi from './translations/vi.json';
import de from './translations/de.json';
import ru from './translations/ru.json';
import ar from './translations/ar.json';
import km from './translations/km.json';
import hi from './translations/hi.json';

export type Language = 
  | 'en' 
  | 'id' 
  | 'zh' 
  | 'ja' 
  | 'ko' 
  | 'th' 
  | 'vi' 
  | 'de' 
  | 'ru' 
  | 'ar' 
  | 'km' 
  | 'hi';

export interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
  dir?: 'ltr' | 'rtl';
}

export const languages: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'zh', name: 'Chinese', nativeName: '简体中文', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'km', name: 'Khmer', nativeName: 'ភាសាខ្មែរ', flag: '🇰🇭' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
];

export const translations: Record<Language, typeof en> = {
  en,
  id,
  zh,
  ja,
  ko,
  th,
  vi,
  de,
  ru,
  ar,
  km,
  hi,
};

const STORAGE_KEY = 'chatvice_language';

export function getStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && languages.some(l => l.code === stored)) {
    return stored as Language;
  }
  const browserLang = navigator.language.split('-')[0];
  if (languages.some(l => l.code === browserLang)) {
    return browserLang as Language;
  }
  return 'en';
}

export function setStoredLanguage(lang: Language): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, lang);
  }
}

export function getTranslation(lang: Language): typeof en {
  return translations[lang] || translations.en;
}

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export type TranslationKey = NestedKeyOf<typeof en>;

export function t(translations: typeof en, key: string): string {
  const keys = key.split('.');
  let result: any = translations;
  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = result[k];
    } else {
      return key;
    }
  }
  return typeof result === 'string' ? result : key;
}

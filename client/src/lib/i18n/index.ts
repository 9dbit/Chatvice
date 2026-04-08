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
  { code: 'en', name: 'English', nativeName: 'English', flag: 'EN' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: 'ID' },
  { code: 'zh', name: 'Chinese', nativeName: '简体中文', flag: 'ZH' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: 'JA' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: 'KO' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: 'TH' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: 'VI' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: 'DE' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: 'RU' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: 'AR', dir: 'rtl' },
  { code: 'km', name: 'Khmer', nativeName: 'ភាសាខ្មែរ', flag: 'KM' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: 'HI' },
];

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type TranslationDict = typeof en;
export type PartialTranslationDict = DeepPartial<TranslationDict>;

export const translations: Record<Language, PartialTranslationDict> = {
  en: en as TranslationDict,
  id: id as PartialTranslationDict,
  zh: zh as PartialTranslationDict,
  ja: ja as PartialTranslationDict,
  ko: ko as PartialTranslationDict,
  th: th as PartialTranslationDict,
  vi: vi as PartialTranslationDict,
  de: de as PartialTranslationDict,
  ru: ru as PartialTranslationDict,
  ar: ar as PartialTranslationDict,
  km: km as PartialTranslationDict,
  hi: hi as PartialTranslationDict,
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

export function getTranslation(lang: Language): PartialTranslationDict {
  return translations[lang] || translations.en;
}

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export type TranslationKey = NestedKeyOf<typeof en>;

export function t(translationDict: PartialTranslationDict, key: string): string {
  const keys = key.split('.');
  let result: unknown = translationDict;
  for (const k of keys) {
    if (result && typeof result === 'object' && k in (result as Record<string, unknown>)) {
      result = (result as Record<string, unknown>)[k];
    } else {
      return key;
    }
  }
  return typeof result === 'string' ? result : key;
}

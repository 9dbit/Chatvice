import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { 
  type Language, 
  type LanguageOption,
  languages,
  getStoredLanguage, 
  setStoredLanguage, 
  getTranslation,
  t as translate
} from '@/lib/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  languages: LanguageOption[];
  currentLanguage: LanguageOption;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => getStoredLanguage());
  const [translations, setTranslations] = useState(() => getTranslation(language));

  useEffect(() => {
    const newTranslations = getTranslation(language);
    setTranslations(newTranslations);
    setStoredLanguage(language);
    
    const currentLang = languages.find(l => l.code === language);
    if (currentLang?.dir === 'rtl') {
      document.documentElement.setAttribute('dir', 'rtl');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
    }
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translate(translations, key);
  };

  const currentLanguage = languages.find(l => l.code === language) || languages[0];
  const isRTL = currentLanguage.dir === 'rtl';

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage, 
      t, 
      languages,
      currentLanguage,
      isRTL
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

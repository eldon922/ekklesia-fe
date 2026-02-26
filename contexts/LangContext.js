import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../lib/i18n';

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState('id'); // default: Indonesian

  useEffect(() => {
    const saved = localStorage.getItem('ekklesia-lang') || 'id';
    setLang(saved);
  }, []);

  const switchLang = (code) => {
    setLang(code);
    localStorage.setItem('ekklesia-lang', code);
  };

  const t = translations[lang] || translations['id'];

  return (
    <LangContext.Provider value={{ lang, switchLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used inside LangProvider');
  return ctx;
}

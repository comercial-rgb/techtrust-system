import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { languages, Language } from "../i18n";

interface Props {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export default function LangSelector({ language, setLanguage }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = languages.find((lang) => lang.code === language) || languages[0];
  const flagSrc = (flagCode: string) => `https://flagcdn.com/w40/${flagCode}.png`;

  useEffect(() => {
    function handler(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-admin-200"
      >
        <img src={flagSrc(current.flagCode)} alt={current.flag} className="h-3.5 w-5 rounded-[2px] object-cover" />
        <span className="text-gray-700 font-medium">{current.label}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[150px]">
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                setLanguage(lang.code);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                lang.code === language ? "bg-admin-50 text-admin-700 font-semibold" : "text-gray-700"
              }`}
            >
              <img src={flagSrc(lang.flagCode)} alt={lang.flag} className="h-3.5 w-5 rounded-[2px] object-cover" />
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ArrowRight, Loader2 } from 'lucide-react';
import { Language } from '../types';
import { getTranslation } from '../translations';
import { ProcessSuggestion } from '../services/geminiService';

interface ProcessSelectorProps {
  onSelect: (process: string) => void;
  language: Language;
  suggestions: ProcessSuggestion[];
  isLoading: boolean;
}

export const ProcessSelector: React.FC<ProcessSelectorProps> = ({
  onSelect,
  language,
  suggestions,
  isLoading
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const t = getTranslation(language);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`flex items-center gap-2 px-4 py-3 glass-panel rounded-xl font-bold text-sm transition-all w-full justify-between group disabled:opacity-50 disabled:cursor-wait ${isOpen ? 'neon-border-cyan' : 'border-white/10'}`}
      >
        <div className="flex items-center gap-2">
            {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-science-cyan" />
            ) : (
            <ArrowRight className="w-4 h-4 text-science-cyan" />
            )}
            <span className="text-white group-hover:text-science-cyan transition-colors">{isLoading ? t.processSuggestionsLoading : t.processSuggestionsTitle}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-science-cyan' : ''}`} />
      </button>

      {isOpen && !isLoading && suggestions.length > 0 && (
        <div className="absolute top-full left-0 mt-2 w-80 glass-panel bg-slate-900/95 border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in backdrop-blur-xl">
          <div className="p-3 border-b border-white/10 bg-white/5">
            <p className="text-xs font-bold uppercase tracking-widest text-science-cyan">{t.processSuggestionsHeader}</p>
          </div>
          <div className="p-2 max-h-80 overflow-y-auto custom-scrollbar">
            {suggestions.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  onSelect(item.process);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-3 rounded-lg text-sm transition-all hover:bg-white/10 text-slate-300 hover:text-white group"
              >
                <span className="font-bold text-white group-hover:text-science-cyan block mb-1 transition-colors">{item.process}</span>
                <span className="text-xs text-slate-400 group-hover:text-slate-300 line-clamp-2">{item.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Lightbulb, Loader2 } from 'lucide-react';
import { Language } from '../types';
import { getTranslation } from '../translations';
import { ConceptSuggestion } from '../services/geminiService';

interface ConceptSelectorProps {
  onSelect: (concept: string) => void;
  language: Language;
  suggestions: ConceptSuggestion[];
  isLoading: boolean;
}

export const ConceptSelector: React.FC<ConceptSelectorProps> = ({
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
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold text-sm hover:shadow-lg hover:scale-105 transition-all disabled:opacity-70 disabled:cursor-wait"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Lightbulb className="w-4 h-4" />
        )}
        <span>{isLoading ? t.conceptSuggestionsLoading : t.conceptSuggestionsTitle}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !isLoading && suggestions.length > 0 && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white border-2 border-cyan-300 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
          <div className="p-3 border-b-2 border-cyan-200 bg-gradient-to-r from-cyan-50 to-blue-50">
            <p className="text-xs font-bold uppercase tracking-widest text-cyan-700">{t.conceptSuggestionsHeader}</p>
          </div>
          <div className="p-2 max-h-80 overflow-y-auto">
            {suggestions.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  onSelect(item.concept);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all hover:bg-cyan-50 hover:scale-[1.02]"
              >
                <span className="font-bold text-gray-800 block mb-1">{item.concept}</span>
                <span className="text-xs text-gray-600 line-clamp-2">{item.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

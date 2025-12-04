import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Microscope } from 'lucide-react';
import { SCIENTIFIC_DOMAINS, DomainId } from '../constants';
import { Language } from '../types';
import { getTranslation } from '../translations';

interface DomainSelectorProps {
  onSelect: (domain: string) => void;
  language: Language;
}

// Map domain IDs to translation keys
const domainTranslationKeys: Record<DomainId, string> = {
  astrophysics: 'domainAstrophysics',
  marineBiology: 'domainMarineBiology',
  dinosaurs: 'domainDinosaurs',
  ai: 'domainAi',
  humanBody: 'domainHumanBody',
  climate: 'domainClimate',
  quantumPhysics: 'domainQuantumPhysics',
  volcanology: 'domainVolcanology',
  genetics: 'domainGenetics',
  chemistry: 'domainChemistry',
  renewableEnergy: 'domainRenewableEnergy',
  insects: 'domainInsects',
};

export const DomainSelector: React.FC<DomainSelectorProps> = ({ onSelect, language }) => {
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

  const getDomainLabel = (id: DomainId): string => {
    const key = domainTranslationKeys[id];
    return (t as any)[key] || id;
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-3 glass-panel rounded-xl font-bold text-sm transition-all w-full justify-between group ${isOpen ? 'neon-border-cyan' : 'border-white/10'}`}
      >
        <div className="flex items-center gap-2">
            <Microscope className="w-4 h-4 text-science-cyan" />
            <span className="text-white group-hover:text-science-cyan transition-colors">{t.selectDomain}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-science-cyan' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 glass-panel bg-slate-900/95 border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100] animate-fade-in backdrop-blur-xl">
          <div className="p-3 border-b border-white/10 bg-white/5">
            <p className="text-xs font-bold uppercase tracking-widest text-science-cyan">{t.selectDomain}</p>
          </div>
          <div className="p-2 max-h-80 overflow-y-auto custom-scrollbar">
            {SCIENTIFIC_DOMAINS.map((domain) => (
              <button
                key={domain.id}
                onClick={() => {
                  onSelect(getDomainLabel(domain.id));
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all hover:bg-white/10 text-slate-300 hover:text-white group"
              >
                <span className="text-xl group-hover:scale-110 transition-transform">{domain.emoji}</span>
                <span>{getDomainLabel(domain.id)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

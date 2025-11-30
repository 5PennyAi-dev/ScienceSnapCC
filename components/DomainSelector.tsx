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
    return (t as Record<string, string>)[key] || id;
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold text-sm hover:shadow-lg hover:scale-105 transition-all"
      >
        <Microscope className="w-4 h-4" />
        <span>{t.selectDomain}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white border-2 border-cyan-300 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
          <div className="p-3 border-b-2 border-cyan-200 bg-gradient-to-r from-cyan-50 to-blue-50">
            <p className="text-xs font-bold uppercase tracking-widest text-cyan-700">{t.selectDomain}</p>
          </div>
          <div className="p-2 max-h-80 overflow-y-auto">
            {SCIENTIFIC_DOMAINS.map((domain) => (
              <button
                key={domain.id}
                onClick={() => {
                  onSelect(getDomainLabel(domain.id));
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all hover:bg-cyan-50 hover:scale-[1.02] text-gray-700"
              >
                <span className="text-xl">{domain.emoji}</span>
                <span>{getDomainLabel(domain.id)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

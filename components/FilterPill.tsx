
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterPillProps {
  label: string;
  value: string;
  options: FilterOption[] | string[];
  onSelect: (value: string) => void;
  allLabel?: string;
}

export const FilterPill: React.FC<FilterPillProps> = ({ 
  label, 
  value, 
  options, 
  onSelect,
  allLabel = "All"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Normalize options to object array
  const normalizedOptions: FilterOption[] = options.map(opt => 
    typeof opt === 'string' ? { label: opt, value: opt } : opt
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = value !== 'All';
  const displayValue = value === 'All' ? allLabel : normalizedOptions.find(o => o.value === value)?.label || value;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border-2 ${
          isActive || isOpen
            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-400 shadow-lg shadow-cyan-500/50 scale-105'
            : 'bg-white border-2 border-cyan-300 text-cyan-700 hover:border-cyan-400 hover:shadow-md'
        }`}
      >
        <span>{label}:</span>
        <span className="truncate max-w-[100px] font-bold">{displayValue}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-white border-2 border-cyan-300 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-60 overflow-y-auto py-2">
            <button
                onClick={() => {
                  onSelect('All');
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-3 text-xs font-bold flex items-center justify-between transition-all ${
                  value === 'All' ? 'bg-cyan-100 text-cyan-700 border-l-4 border-cyan-500' : 'text-gray-700 hover:bg-gray-50'
                }`}
            >
                <span>{allLabel}</span>
                {value === 'All' && <Check className="w-4 h-4 text-teal-500 font-bold" />}
            </button>
            <div className="h-px bg-gray-200 my-1"></div>
            {normalizedOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onSelect(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-3 text-xs font-medium flex items-center justify-between transition-all ${
                  value === opt.value ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>{opt.label}</span>
                {value === opt.value && <Check className="w-4 h-4 text-teal-500 font-bold" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

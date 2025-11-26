import React from 'react';
import { ScientificFact } from '../types';
import { ArrowRight, BookOpen, Atom, Beaker, Microscope } from 'lucide-react';

interface FactCardProps {
  fact: ScientificFact;
  onSelect: (fact: ScientificFact) => void;
  index: number;
  labels: {
    factLabel: string;
    createBtn: string;
  };
}

export const FactCard: React.FC<FactCardProps> = ({ fact, onSelect, index, labels }) => {
  // Bright gradient backgrounds for each card
  const themes = [
    {
      bg: 'bg-gradient-to-br from-pink-400 to-pink-500',
      badgeBg: 'bg-yellow-300',
      badgeText: 'text-yellow-700',
      buttonBg: 'hover:bg-pink-600',
      icon: Atom,
      borderColor: 'border-white'
    },
    {
      bg: 'bg-gradient-to-br from-cyan-400 to-blue-500',
      badgeBg: 'bg-orange-300',
      badgeText: 'text-orange-700',
      buttonBg: 'hover:bg-cyan-600',
      icon: Beaker,
      borderColor: 'border-white'
    },
    {
      bg: 'bg-gradient-to-br from-yellow-400 to-amber-500',
      badgeBg: 'bg-mint-300',
      badgeText: 'text-green-700',
      buttonBg: 'hover:bg-yellow-600',
      icon: Microscope,
      borderColor: 'border-white'
    },
  ];

  const theme = themes[index % themes.length];
  const IconComponent = theme.icon;

  return (
    <div
      className={`${theme.bg} border-8 ${theme.borderColor} rounded-3xl flex flex-col h-full transition-all duration-300 group relative overflow-hidden hover:scale-102 hover:-translate-y-2 shadow-2xl transform hover:shadow-3xl`}
    >
      {/* Science Icon Watermark */}
      <div className="absolute -top-8 -right-8 opacity-20 group-hover:opacity-30 transition-opacity">
        <IconComponent className="w-40 h-40 text-white transform rotate-12" />
      </div>

      <div className="p-6 flex flex-col h-full relative z-10">
        {/* Header with badge and number */}
        <div className="flex justify-between items-center mb-4">
          <span className={`${theme.badgeBg} ${theme.badgeText} text-xs font-bold uppercase tracking-wider flex items-center gap-2 px-3 py-1.5 rounded-full shadow-md`}>
             <BookOpen className="w-3.5 h-3.5" />
             {fact.domain}
          </span>
          <span className="text-2xl font-black text-white/80">#{String(index + 1).padStart(2, '0')}</span>
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold text-white mb-3 leading-tight group-hover:text-white/90 transition-all">
          {fact.title}
        </h3>

        {/* Description */}
        <p className="text-white/90 text-sm leading-relaxed mb-6 line-clamp-4 flex-grow font-medium">
          {fact.text}
        </p>

        {/* Action Button */}
        <button
            onClick={() => onSelect(fact)}
            className="w-full py-3 px-4 bg-white text-gray-800 rounded-xl text-sm font-bold transition-all flex items-center justify-between group-hover:shadow-lg hover:scale-105 active:scale-95 shadow-md"
        >
          <span>{labels.createBtn}</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
};
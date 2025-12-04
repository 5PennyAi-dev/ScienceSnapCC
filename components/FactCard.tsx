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
  // Science-themed gradient backgrounds for each card - Updated for Dark Mode
  const themes = [
    {
      bg: 'bg-gradient-to-br from-science-blue/20 to-science-purple/20 hover:from-science-blue/30 hover:to-science-purple/30',
      badgeBg: 'bg-science-blue/20',
      badgeText: 'text-science-blue',
      buttonBg: 'hover:bg-science-blue',
      icon: Atom,
      borderColor: 'border-science-blue/30'
    },
    {
      bg: 'bg-gradient-to-br from-science-teal/20 to-science-cyan/20 hover:from-science-teal/30 hover:to-science-cyan/30',
      badgeBg: 'bg-science-teal/20',
      badgeText: 'text-science-teal',
      buttonBg: 'hover:bg-science-teal',
      icon: Beaker,
      borderColor: 'border-science-teal/30'
    },
    {
      bg: 'bg-gradient-to-br from-indigo-500/20 to-science-purple/20 hover:from-indigo-500/30 hover:to-science-purple/30',
      badgeBg: 'bg-indigo-500/20',
      badgeText: 'text-indigo-400',
      buttonBg: 'hover:bg-indigo-500',
      icon: Microscope,
      borderColor: 'border-indigo-500/30'
    },
  ];

  const theme = themes[index % themes.length];
  const IconComponent = theme.icon;

  return (
    <div
      className={`${theme.bg} glass-panel border ${theme.borderColor} rounded-2xl flex flex-col h-full transition-all duration-500 group relative overflow-hidden hover:scale-[1.02] hover:-translate-y-2 shadow-2xl hover:shadow-science-cyan/20`}
    >
      {/* Science Icon Watermark */}
      <div className="absolute -top-8 -right-8 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
        <IconComponent className="w-40 h-40 text-white transform rotate-12" />
      </div>

      <div className="p-6 flex flex-col h-full relative z-10">
        {/* Header with badge and number */}
        <div className="flex justify-between items-center mb-4">
          <span className={`${theme.badgeBg} ${theme.badgeText} text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/5`}>
             <BookOpen className="w-3 h-3" />
             {fact.domain}
          </span>
          <span className="text-2xl font-display font-bold text-white/20 group-hover:text-white/40 transition-colors">#{String(index + 1).padStart(2, '0')}</span>
        </div>

        {/* Title */}
        <h3 className="text-xl font-display font-bold text-white mb-3 leading-tight group-hover:text-science-cyan transition-colors">
          {fact.title}
        </h3>

        {/* Description */}
        <p className="text-slate-300 text-sm leading-relaxed mb-6 line-clamp-4 flex-grow font-medium group-hover:text-slate-200 transition-colors">
          {fact.text}
        </p>

        {/* Action Button */}
        <button
            onClick={() => onSelect(fact)}
            className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-between group-hover:border-science-cyan/50 group-hover:shadow-lg hover:scale-[1.02] active:scale-95 backdrop-blur-sm"
        >
          <span>{labels.createBtn}</span>
          <ArrowRight className="w-4 h-4 text-science-cyan transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
};
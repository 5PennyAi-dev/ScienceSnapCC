import React from 'react';
import { ScientificFact } from '../types';
import { Sparkles } from 'lucide-react';

interface FactCardProps {
  fact: ScientificFact;
  onSelect: (fact: ScientificFact) => void;
  index: number;
}

export const FactCard: React.FC<FactCardProps> = ({ fact, onSelect, index }) => {
  return (
    <div 
      className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 hover:bg-white/20 transition-all duration-300 cursor-pointer group flex flex-col h-full shadow-lg hover:shadow-purple-500/20"
      onClick={() => onSelect(fact)}
    >
      <div className="flex justify-between items-start mb-4">
        <span className="bg-purple-600/80 text-xs font-bold px-3 py-1 rounded-full text-white uppercase tracking-wider">
          Fact #{index + 1}
        </span>
        <Sparkles className="w-5 h-5 text-purple-300 group-hover:text-yellow-400 transition-colors" />
      </div>
      
      <h3 className="text-xl font-bold mb-3 text-white group-hover:text-purple-200 transition-colors">
        {fact.title}
      </h3>
      
      <p className="text-gray-300 text-sm leading-relaxed mb-4 line-clamp-6 flex-grow">
        {fact.text}
      </p>

      <div className="mt-auto">
        <button className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg text-white font-semibold text-sm opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
          Create Infographic
        </button>
      </div>
    </div>
  );
};
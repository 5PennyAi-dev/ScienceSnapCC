import React from 'react';
import { Globe, Lightbulb, Dna, ArrowRight, Sparkles } from 'lucide-react';
import { SearchMode } from '../types';

interface DashboardProps {
  onSelectMode: (mode: SearchMode) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectMode }) => {
  const modes = [
    {
      id: 'domain',
      title: 'Explore Domain',
      description: 'Discover fascinating facts across 12 scientific fields.',
      icon: Globe,
      color: 'text-science-blue',
      gradient: 'from-science-blue/20 to-transparent',
      border: 'group-hover:border-science-blue/50'
    },
    {
      id: 'concept',
      title: 'Explain Concept',
      description: 'Deep dive into specific scientific concepts with detailed explanations.',
      icon: Lightbulb,
      color: 'text-science-teal',
      gradient: 'from-science-teal/20 to-transparent',
      border: 'group-hover:border-science-teal/50'
    },
    {
      id: 'process',
      title: 'Process Sequence',
      description: 'Visualize step-by-step scientific processes with consistent style.',
      icon: Dna,
      color: 'text-science-purple',
      gradient: 'from-science-purple/20 to-transparent',
      border: 'group-hover:border-science-purple/50'
    }
  ];

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-4xl md:text-6xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
          What will you <span className="text-science-blue">discover</span> today?
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
          Create stunning AI-powered educational infographics in seconds. Choose a mode to get started.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onSelectMode(mode.id as SearchMode)}
            className={`group relative p-8 rounded-3xl glass-card text-left transition-all duration-300 hover:scale-[1.02] border border-white/5 ${mode.border} overflow-hidden`}
          >
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${mode.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            
            <div className="relative z-10 space-y-6">
              <div className={`w-14 h-14 rounded-2xl bg-slate-900/50 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform duration-300`}>
                <mode.icon className={`w-7 h-7 ${mode.color}`} />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-bold font-display text-white group-hover:text-cyan-50 transition-colors">
                  {mode.title}
                </h3>
                <p className="text-slate-400 leading-relaxed group-hover:text-slate-300">
                  {mode.description}
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm font-medium text-slate-500 group-hover:text-white transition-colors pt-4">
                <span>Start Creating</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

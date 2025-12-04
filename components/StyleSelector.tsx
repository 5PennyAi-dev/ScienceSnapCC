import React, { useState, useRef, useEffect } from 'react';
import { ArtStyle } from '../types';
import { Palette, Box, FileDigit, Tent, Droplet, Zap, Coffee, Cpu, BookOpen, Sparkles } from 'lucide-react';

interface StyleSelectorProps {
  selectedStyle: ArtStyle;
  onSelect: (style: ArtStyle) => void;
  labels: {
    styleLabel: string;
    [key: string]: string;
  };
}

export const StyleSelector: React.FC<StyleSelectorProps> = ({ selectedStyle, onSelect, labels }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const styles: { id: ArtStyle; icon: React.ReactNode; labelKey: string; color: string; bgColor: string }[] = [
    { id: 'DEFAULT', icon: <Palette className="w-5 h-5" />, labelKey: 'styleDefault', color: 'text-indigo-400', bgColor: 'bg-indigo-500/20' },
    { id: 'PIXEL', icon: <FileDigit className="w-5 h-5" />, labelKey: 'stylePixel', color: 'text-green-400', bgColor: 'bg-green-500/20' },
    { id: 'CLAY', icon: <Box className="w-5 h-5" />, labelKey: 'styleClay', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
    { id: 'ORIGAMI', icon: <Tent className="w-5 h-5" />, labelKey: 'styleOrigami', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
    { id: 'WATERCOLOR', icon: <Droplet className="w-5 h-5" />, labelKey: 'styleWatercolor', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
    { id: 'CYBERPUNK', icon: <Cpu className="w-5 h-5" />, labelKey: 'styleCyberpunk', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
    { id: 'VINTAGE', icon: <Coffee className="w-5 h-5" />, labelKey: 'styleVintage', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
    { id: 'NEON', icon: <Zap className="w-5 h-5" />, labelKey: 'styleNeon', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
    { id: 'MANGA', icon: <BookOpen className="w-5 h-5" />, labelKey: 'styleManga', color: 'text-red-400', bgColor: 'bg-red-500/20' },
    { id: 'GHIBLI', icon: <Sparkles className="w-5 h-5" />, labelKey: 'styleGhibli', color: 'text-pink-400', bgColor: 'bg-pink-500/20' },
  ];

  const activeStyle = styles.find(s => s.id === selectedStyle) || styles[0];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2.5 rounded-full transition-all flex items-center gap-2 border ${
          selectedStyle !== 'DEFAULT'
            ? `${activeStyle.bgColor} ${activeStyle.color} border-white/10 shadow-lg shadow-science-cyan/20 scale-110`
            : 'glass-panel hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
        }`}
        title={labels.styleLabel}
      >
        {activeStyle.icon}
        {selectedStyle !== 'DEFAULT' && <span className="text-xs font-bold hidden xl:inline">{labels[activeStyle.labelKey]}</span>}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 glass-panel bg-slate-900/95 border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100] animate-fade-in-up backdrop-blur-xl">
          <div className="p-3 border-b border-white/10 bg-white/5">
            <p className="text-xs font-bold uppercase tracking-widest text-science-cyan">{labels.styleLabel}</p>
          </div>
          <div className="p-2 grid grid-cols-1 gap-1.5 max-h-80 overflow-y-auto custom-scrollbar">
            {styles.map((style) => (
              <button
                key={style.id}
                onClick={() => {
                  onSelect(style.id);
                  setIsOpen(false);
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all transform hover:scale-[1.02] ${
                  selectedStyle === style.id
                    ? `${style.bgColor} ${style.color} border border-white/10 shadow-md`
                    : 'hover:bg-white/10 text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                <span className={`${style.bgColor} ${style.color} p-2 rounded-lg bg-opacity-20`}>{style.icon}</span>
                <span>{labels[style.labelKey]}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
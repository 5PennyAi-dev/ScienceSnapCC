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
    { id: 'DEFAULT', icon: <Palette className="w-5 h-5" />, labelKey: 'styleDefault', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
    { id: 'PIXEL', icon: <FileDigit className="w-5 h-5" />, labelKey: 'stylePixel', color: 'text-green-600', bgColor: 'bg-green-100' },
    { id: 'CLAY', icon: <Box className="w-5 h-5" />, labelKey: 'styleClay', color: 'text-orange-600', bgColor: 'bg-orange-100' },
    { id: 'ORIGAMI', icon: <Tent className="w-5 h-5" />, labelKey: 'styleOrigami', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    { id: 'WATERCOLOR', icon: <Droplet className="w-5 h-5" />, labelKey: 'styleWatercolor', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { id: 'CYBERPUNK', icon: <Cpu className="w-5 h-5" />, labelKey: 'styleCyberpunk', color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
    { id: 'VINTAGE', icon: <Coffee className="w-5 h-5" />, labelKey: 'styleVintage', color: 'text-amber-700', bgColor: 'bg-amber-100' },
    { id: 'NEON', icon: <Zap className="w-5 h-5" />, labelKey: 'styleNeon', color: 'text-pink-600', bgColor: 'bg-pink-100' },
    { id: 'MANGA', icon: <BookOpen className="w-5 h-5" />, labelKey: 'styleManga', color: 'text-red-600', bgColor: 'bg-red-100' },
    { id: 'GHIBLI', icon: <Sparkles className="w-5 h-5" />, labelKey: 'styleGhibli', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  ];

  const activeStyle = styles.find(s => s.id === selectedStyle) || styles[0];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2.5 rounded-full transition-all flex items-center gap-2 border-2 ${
          selectedStyle !== 'DEFAULT'
            ? `${activeStyle.bgColor} ${activeStyle.color} border-transparent shadow-lg scale-110`
            : 'bg-white text-purple-600 border-purple-300 hover:shadow-md'
        }`}
        title={labels.styleLabel}
      >
        {activeStyle.icon}
        {selectedStyle !== 'DEFAULT' && <span className="text-xs font-bold hidden xl:inline">{labels[activeStyle.labelKey]}</span>}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-white border-2 border-purple-300 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in-up">
          <div className="p-3 border-b-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
            <p className="text-xs font-bold uppercase tracking-widest text-purple-700">{labels.styleLabel}</p>
          </div>
          <div className="p-2 grid gap-1.5">
            {styles.map((style) => (
              <button
                key={style.id}
                onClick={() => {
                  onSelect(style.id);
                  setIsOpen(false);
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all transform hover:scale-105 ${
                  selectedStyle === style.id
                    ? `${style.bgColor} ${style.color} border-2 border-transparent shadow-md`
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-transparent'
                }`}
              >
                <span className={`${style.bgColor} ${style.color} p-2 rounded-lg`}>{style.icon}</span>
                <span>{labels[style.labelKey]}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
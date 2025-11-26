import React from 'react';
import { InfographicItem } from '../types';
import { Rocket } from 'lucide-react';

interface GalleryGridProps {
  items: InfographicItem[];
  onItemClick: (item: InfographicItem) => void;
  emptyMessage: string;
}

// Color palette for card borders
const borderColors = [
  'border-pink-400',
  'border-cyan-400',
  'border-yellow-400',
  'border-purple-400',
  'border-green-400',
  'border-orange-400',
  'border-indigo-400',
  'border-rose-400',
];

export const GalleryGrid: React.FC<GalleryGridProps> = ({ items, onItemClick, emptyMessage }) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-24 bg-white border-4 border-dashed border-pink-300 rounded-3xl flex flex-col items-center shadow-lg">
        <div className="w-20 h-20 bg-gradient-to-br from-pink-200 to-purple-200 rounded-full flex items-center justify-center mb-4 shadow-md">
            <Rocket className="w-10 h-10 text-pink-600 animate-bounce-light" />
        </div>
        <p className="text-gray-700 font-bold text-lg">🎉 {emptyMessage} 🎉</p>
        <p className="text-gray-500 text-sm mt-2">Create your first infographic to see it here!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {items.map((item, idx) => {
        const borderColor = borderColors[idx % borderColors.length];
        return (
          <div
            key={item.id}
            className="group cursor-pointer flex flex-col gap-3 p-4 bg-white rounded-2xl border-4 border-gray-200 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:border-opacity-0 overflow-hidden"
            onClick={() => onItemClick(item)}
          >
            <div className={`relative aspect-[3/4] rounded-xl bg-gray-100 overflow-hidden border-3 ${borderColor} shadow-md group-hover:shadow-lg transition-all`}>
               <img
                  src={item.imageUrl}
                  alt={item.fact.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>

            <div>
              <h4 className="text-gray-800 font-bold text-sm line-clamp-2 group-hover:text-pink-600 transition-colors">{item.fact.title}</h4>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className={`${borderColor.replace('border-', 'bg-')} text-white text-xs font-bold px-2 py-1 rounded-full`}>
                  {item.fact.domain}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
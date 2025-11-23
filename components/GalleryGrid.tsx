import React from 'react';
import { InfographicItem } from '../types';
import { ExternalLink } from 'lucide-react';

interface GalleryGridProps {
  items: InfographicItem[];
  onItemClick: (item: InfographicItem) => void;
  emptyMessage: string;
}

export const GalleryGrid: React.FC<GalleryGridProps> = ({ items, onItemClick, emptyMessage }) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {items.map((item) => (
        <div 
          key={item.id}
          className="group relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer shadow-lg border border-white/10"
          onClick={() => onItemClick(item)}
        >
          <img 
            src={item.imageUrl} 
            alt={item.fact.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
            <h4 className="text-white font-bold text-sm truncate">{item.fact.title}</h4>
            <p className="text-xs text-gray-300 truncate">{item.fact.domain}</p>
            <div className="absolute top-2 right-2 p-2 bg-black/50 rounded-full">
                <ExternalLink className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
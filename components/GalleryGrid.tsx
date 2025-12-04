import React, { useState, useRef } from 'react';
import { InfographicItem } from '../types';
import { Rocket } from 'lucide-react';

interface GalleryGridProps {
  items: InfographicItem[];
  onItemClick: (item: InfographicItem) => void;
  emptyMessage: string;
  onDragStart?: (itemId: string) => void;
  onDragEnd?: () => void;
}

export const GalleryGrid: React.FC<GalleryGridProps> = ({ items, onItemClick, emptyMessage, onDragStart, onDragEnd }) => {
  const draggedItemRef = useRef<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="text-center py-24 glass-panel rounded-3xl flex flex-col items-center shadow-2xl border border-white/10">
        <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-white/5">
            <Rocket className="w-12 h-12 text-science-cyan animate-pulse-glow" />
        </div>
        <p className="text-white font-display font-bold text-xl mb-2">🎉 {emptyMessage} 🎉</p>
        <p className="text-slate-400 text-sm">Create your first infographic to see it here!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {items.map((item, idx) => {
        const isSequence = item.isSequence && item.steps && item.steps.length > 0;

        return (
          <div
            key={item.id}
            className="group cursor-move flex flex-col gap-3 p-3 glass-card rounded-2xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden border border-white/5 hover:border-science-cyan/30"
            onClick={(e) => {
              // Only trigger click if we're not dragging
              if (!draggedItemRef.current) {
                onItemClick(item);
              }
            }}
            draggable={true}
            onDragStart={(e) => {
              e.stopPropagation();
              console.log('🎯 DRAG START - Item ID:', item.id);
              draggedItemRef.current = item.id;
              if (onDragStart) onDragStart(item.id);
              e.dataTransfer.setData('text/plain', item.id);
              e.dataTransfer.effectAllowed = 'move';
              e.currentTarget.style.opacity = '0.5';
            }}
            onDragEnd={(e) => {
              e.stopPropagation();
              console.log('🏁 DRAG END - Item ID:', item.id);
              e.currentTarget.style.opacity = '1';
              if (onDragEnd) onDragEnd();
              setTimeout(() => { draggedItemRef.current = null; }, 100);
            }}
          >
            {/* Image/Thumbnail Section */}
            {isSequence ? (
              // Sequence Thumbnail Strip
              <div className="relative aspect-[3/4] rounded-xl bg-slate-900 overflow-hidden border border-white/10 shadow-inner group-hover:shadow-science-cyan/20 transition-all pointer-events-none">
                <div className="grid grid-cols-3 h-full">
                  {item.steps!.slice(0, 3).map((step, stepIdx) => (
                    <div
                      key={stepIdx}
                      className={`relative bg-slate-800 border-r border-slate-700 last:border-r-0 overflow-hidden ${
                        stepIdx === 0 ? 'col-span-2' : ''
                      }`}
                    >
                      <img
                        src={step.imageUrl}
                        alt={`Step ${step.stepNumber}`}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        draggable={false}
                      />
                    </div>
                  ))}
                </div>
                {/* Step Count Badge */}
                <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded-full border border-white/10 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-science-cyan animate-pulse"></div>
                  {item.totalSteps} steps
                </div>
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            ) : (
              // Single Image
              <div className="relative aspect-[3/4] rounded-xl bg-slate-900 overflow-hidden border border-white/10 shadow-inner group-hover:shadow-science-cyan/20 transition-all pointer-events-none">
                <img
                  src={item.imageUrl}
                  alt={item.fact.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                  draggable={false}
                />
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            )}

            {/* Info Section */}
            <div className="px-1 pb-1 pointer-events-none">
              <h4 className="text-white font-bold text-sm line-clamp-2 group-hover:text-science-cyan transition-colors leading-tight mb-2">{item.fact.title}</h4>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-white/10 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/5">
                  {item.fact.domain}
                </span>
                {isSequence && (
                  <span className="bg-science-blue/20 text-science-blue text-[10px] font-bold px-2 py-0.5 rounded-full border border-science-blue/20">
                    Sequence
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
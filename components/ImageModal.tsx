
import React, { useState } from 'react';
import { InfographicItem, ImageModelType, AspectRatio, ArtStyle } from '../types';
import { X, Download, Wand2, RefreshCcw, Loader2, Maximize, Minimize } from 'lucide-react';
import { editInfographic } from '../services/geminiService';

interface ImageModalLabels {
  modalDetails: string;
  modalDomain: string;
  modalTitle: string;
  modalFact: string;
  modalEditLabel: string;
  modalStyle: string;
  modalAudience: string;
  modalRatio: string;
  modalModel: string;
  modalLanguage: string;
  placeholderEdit: string;
  btnDownload: string;
  downloading: string;
  applyingMagic: string;
  btnFullScreen: string;
  exitFullScreen: string;
}

interface ImageModalProps {
  item: InfographicItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedItem: InfographicItem) => void;
  labels: ImageModalLabels;
  model: ImageModelType;
  aspectRatio: AspectRatio;
  style: ArtStyle;
}

export const ImageModal: React.FC<ImageModalProps> = ({ item, isOpen, onClose, onUpdate, labels, model, aspectRatio, style }) => {
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  if (!isOpen || !item) return null;

  const handleDownload = async () => {
    if (!item.imageUrl) return;
    
    setIsDownloading(true);
    try {
      // Fetch the image to create a blob, ensuring it downloads rather than opens in preview
      const response = await fetch(item.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      // Sanitize filename
      const safeTitle = item.fact.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      link.download = `science-snap-${safeTitle}.png`;
      
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download failed:", e);
      // Fallback to standard link behavior if fetch fails
      const link = document.createElement('a');
      link.href = item.imageUrl;
      link.download = `science-snap-${item.fact.title.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
        setIsDownloading(false);
    }
  };

  const handleEdit = async () => {
    if (!editPrompt.trim()) return;
    
    setIsEditing(true);
    setError(null);
    try {
      const newImageUrl = await editInfographic(item.imageUrl, editPrompt, model, aspectRatio, style);
      onUpdate({ ...item, imageUrl: newImageUrl });
      setEditPrompt('');
    } catch (err) {
      setError("Failed to edit image. Please try again.");
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        ></div>
        
        <div className="relative bg-slate-900 border border-white/20 rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col md:flex-row overflow-hidden shadow-2xl">
          {/* Image Section */}
          <div className="flex-1 bg-black flex items-center justify-center p-4 relative overflow-y-auto">
               <div className="relative max-w-full max-h-full group">
                  {isEditing && (
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-10 rounded-lg">
                           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
                           <p className="text-white font-medium">{labels.applyingMagic}</p>
                      </div>
                  )}
                  <img 
                      src={item.imageUrl} 
                      alt={item.fact.title}
                      className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-lg"
                  />
                  {/* Full Screen Toggle */}
                  <button
                    onClick={() => setIsFullScreen(true)}
                    className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 border border-white/10"
                    title={labels.btnFullScreen}
                  >
                    <Maximize className="w-5 h-5" />
                  </button>
              </div>
          </div>

          {/* Controls Section */}
          <div className="w-full md:w-96 p-6 flex flex-col border-l border-white/10 bg-slate-800/50">
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-xl font-bold text-white">{labels.modalDetails}</h2>
               <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                 <X className="w-6 h-6 text-gray-400" />
               </button>
            </div>

            <div className="mb-6 space-y-4 overflow-y-auto flex-1">
              <div>
                  <h3 className="text-xs uppercase tracking-wider text-purple-400 font-bold mb-1">{labels.modalDomain}</h3>
                  <p className="text-white text-sm">{item.fact.domain}</p>
              </div>
              <div>
                  <h3 className="text-xs uppercase tracking-wider text-purple-400 font-bold mb-1">{labels.modalTitle}</h3>
                  <p className="text-white text-lg font-bold">{item.fact.title}</p>
              </div>
              
              {/* Metadata Chips */}
              <div className="flex flex-wrap gap-2">
                  {item.audience && (
                      <span className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-xs text-indigo-200">
                          {labels.modalAudience}: {item.audience}
                      </span>
                  )}
                  {item.style && (
                      <span className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-xs text-indigo-200">
                          {labels.modalStyle}: {item.style}
                      </span>
                  )}
                  {item.aspectRatio && (
                      <span className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-xs text-indigo-200">
                          {labels.modalRatio}: {item.aspectRatio}
                      </span>
                  )}
                  {item.modelName && (
                      <span className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-xs text-indigo-200">
                          {labels.modalModel}: {item.modelName}
                      </span>
                  )}
                  {item.language && (
                      <span className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-xs text-indigo-200">
                          {labels.modalLanguage}: {item.language.toUpperCase()}
                      </span>
                  )}
              </div>

              <div>
                  <h3 className="text-xs uppercase tracking-wider text-purple-400 font-bold mb-1">{labels.modalFact}</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">{item.fact.text}</p>
              </div>
            </div>

            <div className="mt-auto space-y-4">
               <div className="p-4 bg-slate-950 rounded-xl border border-white/10">
                  <label className="block text-sm font-medium text-gray-300 mb-2">{labels.modalEditLabel}</label>
                  <div className="flex gap-2">
                      <input 
                          type="text"
                          value={editPrompt}
                          onChange={(e) => setEditPrompt(e.target.value)}
                          placeholder={labels.placeholderEdit}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                          onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
                      />
                      <button 
                          onClick={handleEdit}
                          disabled={isEditing || !editPrompt.trim()}
                          className="p-2 bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                          title="Apply Edit"
                      >
                          {isEditing ? <RefreshCcw className="w-4 h-4 animate-spin"/> : <Wand2 className="w-4 h-4"/>}
                      </button>
                  </div>
                  {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
               </div>

              <button 
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-white text-slate-900 rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-70"
              >
                   {isDownloading ? (
                      <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {labels.downloading}
                      </>
                  ) : (
                      <>
                          <Download className="w-4 h-4" />
                          {labels.btnDownload}
                      </>
                  )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Full Screen Overlay */}
      {isFullScreen && (
        <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center animate-in fade-in duration-200">
           <button
             onClick={() => setIsFullScreen(false)}
             className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50 backdrop-blur-sm"
             title={labels.exitFullScreen}
           >
             <Minimize className="w-6 h-6" />
           </button>
           <img
             src={item.imageUrl}
             alt={item.fact.title}
             className="w-full h-full object-contain p-2"
           />
        </div>
      )}
    </>
  );
};

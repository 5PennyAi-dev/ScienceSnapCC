
import React, { useState, useEffect } from 'react';
import { InfographicItem, ImageModelType, AspectRatio, ArtStyle } from '../types';
import { X, Download, Wand2, RefreshCcw, Loader2, Maximize, Minimize, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Reset state when item changes
  useEffect(() => {
    setCurrentStepIndex(0);
    setEditPrompt('');
    setError(null);
  }, [item?.id]);

  if (!isOpen || !item) return null;

  // Check if this is a sequence
  const isSequence = item.isSequence && item.steps && item.steps.length > 0;
  const currentStep = isSequence ? item.steps![currentStepIndex] : null;
  const currentImage = isSequence ? currentStep?.imageUrl : item.imageUrl;
  const currentImageTitle = isSequence ? currentStep?.title : item.fact.title;

  const handleDownload = async () => {
    const imageToDownload = currentImage;
    if (!imageToDownload) return;

    setIsDownloading(true);
    try {
      // Fetch the image to create a blob, ensuring it downloads rather than opens in preview
      const response = await fetch(imageToDownload);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      // Sanitize filename
      const baseTitle = item.fact.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const stepSuffix = isSequence ? `-step-${currentStepIndex + 1}` : '';
      link.download = `science-snap-${baseTitle}${stepSuffix}.png`;

      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download failed:", e);
      // Fallback to standard link behavior if fetch fails
      const link = document.createElement('a');
      link.href = imageToDownload;
      const baseTitle = item.fact.title.replace(/\s+/g, '-').toLowerCase();
      const stepSuffix = isSequence ? `-step-${currentStepIndex + 1}` : '';
      link.download = `science-snap-${baseTitle}${stepSuffix}.png`;
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
    if (!currentImage) return;

    setIsEditing(true);
    setError(null);
    try {
      const newImageUrl = await editInfographic(currentImage, editPrompt, model, aspectRatio, style);

      if (isSequence && currentStep) {
        // Update only the current step in the sequence
        const updatedSteps = [...item.steps!];
        updatedSteps[currentStepIndex] = {
          ...currentStep,
          imageUrl: newImageUrl
        };
        onUpdate({ ...item, steps: updatedSteps });
      } else {
        // Single image: update directly
        onUpdate({ ...item, imageUrl: newImageUrl });
      }
      setEditPrompt('');
    } catch (err) {
      setError("Failed to edit image. Please try again.");
    } finally {
      setIsEditing(false);
    }
  };

  const handlePrevStep = () => {
    setCurrentStepIndex(prev => Math.max(0, prev - 1));
  };

  const handleNextStep = () => {
    if (isSequence && item.steps) {
      setCurrentStepIndex(prev => Math.min(item.steps!.length - 1, prev + 1));
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-slate-900/80 backdrop-blur-lg"
          onClick={onClose}
        ></div>

        <div className="relative glass-panel rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col md:flex-row overflow-hidden shadow-2xl border border-white/10">
          {/* Image Section */}
          <div className="flex-1 bg-slate-900/50 flex items-center justify-center p-6 relative overflow-y-auto">
               <div className="relative max-w-full max-h-full group w-full h-full flex items-center justify-center">
                  {isEditing && (
                      <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-10 rounded-lg backdrop-blur-sm">
                           <div className="animate-spin rounded-full h-12 w-12 border-4 border-science-cyan border-t-transparent mb-4 shadow-lg shadow-science-cyan/50"></div>
                           <p className="text-white font-bold">{labels.applyingMagic} ✨</p>
                      </div>
                  )}
                  <img
                      src={currentImage}
                      alt={currentImageTitle}
                      className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/10"
                  />

                  {/* Navigation Arrows for Sequences */}
                  {isSequence && item.steps && item.steps.length > 1 && (
                    <>
                      {currentStepIndex > 0 && (
                        <button
                          onClick={handlePrevStep}
                          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 glass-panel hover:bg-white/10 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg border border-white/10"
                          title="Previous Step"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                      )}
                      {currentStepIndex < item.steps.length - 1 && (
                        <button
                          onClick={handleNextStep}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 glass-panel hover:bg-white/10 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg border border-white/10"
                          title="Next Step"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      )}
                    </>
                  )}

                  {/* Step Indicator */}
                  {isSequence && item.steps && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-white/10">
                      <p className="text-xs font-bold text-white">Step {currentStepIndex + 1} / {item.steps.length}</p>
                    </div>
                  )}

                  {/* Full Screen Toggle */}
                  <button
                    onClick={() => setIsFullScreen(true)}
                    className="absolute top-4 right-4 p-3 glass-panel hover:bg-white/10 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg border border-white/10"
                    title={labels.btnFullScreen}
                  >
                    <Maximize className="w-5 h-5" />
                  </button>
              </div>
          </div>

          {/* Controls Section */}
          <div className="w-full md:w-96 p-6 flex flex-col border-l border-white/10 bg-slate-900/95 backdrop-blur-xl">
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-2xl font-display font-bold text-white">{labels.modalDetails}</h2>
               <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                 <X className="w-6 h-6 text-slate-400 hover:text-white" />
               </button>
            </div>

            <div className="mb-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              <div>
                  <h3 className="text-xs uppercase tracking-wider text-science-cyan font-bold mb-1">{labels.modalDomain}</h3>
                  <p className="text-slate-300 text-sm font-medium">{item.fact.domain}</p>
              </div>
              <div>
                  <h3 className="text-xs uppercase tracking-wider text-science-blue font-bold mb-1">{labels.modalTitle}</h3>
                  <p className="text-white text-lg font-bold">{item.fact.title}</p>
              </div>

              {/* Sequence Step Info */}
              {isSequence && currentStep && (
                <div className="bg-science-blue/10 p-3 rounded-lg border border-science-blue/30">
                  <h3 className="text-xs uppercase tracking-wider text-science-blue font-bold mb-1">📍 {currentStep.title}</h3>
                  <p className="text-slate-300 text-xs leading-relaxed">{currentStep.description}</p>
                </div>
              )}

              {/* Thumbnail Strip for Sequences */}
              {isSequence && item.steps && item.steps.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                  {item.steps.map((step, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentStepIndex(idx)}
                      className={`flex-shrink-0 rounded-lg border-2 overflow-hidden transition-all w-12 h-12 ${
                        idx === currentStepIndex
                          ? 'border-science-cyan scale-110 shadow-lg shadow-science-cyan/20'
                          : 'border-white/10 hover:border-white/30 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={step.imageUrl}
                        alt={`Step ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Metadata Chips - Colorful */}
              <div className="flex flex-wrap gap-2 pt-2">
                  {item.audience && (
                      <span className="px-3 py-1 bg-science-cyan/10 border border-science-cyan/30 rounded-full text-xs text-science-cyan font-bold">
                          👶 {item.audience}
                      </span>
                  )}
                  {item.style && (
                      <span className="px-3 py-1 bg-science-blue/10 border border-science-blue/30 rounded-full text-xs text-science-blue font-bold">
                          🎨 {item.style}
                      </span>
                  )}
                  {item.aspectRatio && (
                      <span className="px-3 py-1 bg-science-teal/10 border border-science-teal/30 rounded-full text-xs text-science-teal font-bold">
                          📐 {item.aspectRatio}
                      </span>
                  )}
                  {item.modelName && (
                      <span className="px-3 py-1 bg-science-purple/10 border border-science-purple/30 rounded-full text-xs text-science-purple font-bold">
                          ⚡ {item.modelName}
                      </span>
                  )}
                  {item.language && (
                      <span className="px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full text-xs text-green-400 font-bold">
                          🌍 {item.language.toUpperCase()}
                      </span>
                  )}
                  {isSequence && (
                      <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-xs text-indigo-400 font-bold">
                          🔄 Sequence
                      </span>
                  )}
              </div>

              <div className="pt-2">
                  <h3 className="text-xs uppercase tracking-wider text-science-blue font-bold mb-2">{labels.modalFact}</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">{item.fact.text}</p>
              </div>
            </div>

            <div className="mt-auto space-y-3 pt-4 border-t border-white/10">
               <div className="p-4 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
                  <label className="block text-sm font-bold text-slate-300 mb-2">✨ {labels.modalEditLabel}</label>
                  <div className="flex gap-2">
                      <input
                          type="text"
                          value={editPrompt}
                          onChange={(e) => setEditPrompt(e.target.value)}
                          placeholder={labels.placeholderEdit}
                          className="flex-1 bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-science-cyan focus:ring-1 focus:ring-science-cyan transition-all"
                          onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
                      />
                      <button
                          onClick={handleEdit}
                          disabled={isEditing || !editPrompt.trim()}
                          className="p-2 bg-gradient-to-r from-science-cyan to-science-blue text-white rounded-lg hover:shadow-lg hover:shadow-science-cyan/20 disabled:opacity-50 transition-all"
                          title="Apply Edit"
                      >
                          {isEditing ? <RefreshCcw className="w-4 h-4 animate-spin"/> : <Wand2 className="w-4 h-4"/>}
                      </button>
                  </div>
                  {error && <p className="text-red-400 text-xs mt-2 font-medium">❌ {error}</p>}
               </div>

              <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-science-cyan to-science-blue text-white rounded-xl font-bold hover:shadow-lg hover:shadow-science-cyan/20 transition-all disabled:opacity-50 shadow-md"
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
        <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-200">
           <button
             onClick={() => setIsFullScreen(false)}
             className="absolute top-6 right-6 p-3 glass-panel hover:bg-white/10 text-white rounded-full transition-all z-50 shadow-lg border border-white/10"
             title={labels.exitFullScreen}
           >
             <Minimize className="w-6 h-6" />
           </button>
           <img
             src={currentImage}
             alt={currentImageTitle}
             className="w-full h-full object-contain p-4"
           />
        </div>
      )}
    </>
  );
};

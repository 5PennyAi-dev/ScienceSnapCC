
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
          className="absolute inset-0 bg-white/70 backdrop-blur-lg"
          onClick={onClose}
        ></div>

        <div className="relative bg-white border-4 border-gradient rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col md:flex-row overflow-hidden shadow-2xl">
          {/* Image Section */}
          <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6 relative overflow-y-auto">
               <div className="relative max-w-full max-h-full group w-full h-full flex items-center justify-center">
                  {isEditing && (
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-10 rounded-lg">
                           <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent mb-4"></div>
                           <p className="text-white font-bold">{labels.applyingMagic} ✨</p>
                      </div>
                  )}
                  <img
                      src={currentImage}
                      alt={currentImageTitle}
                      className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-lg border-2 border-gray-200"
                  />

                  {/* Navigation Arrows for Sequences */}
                  {isSequence && item.steps && item.steps.length > 1 && (
                    <>
                      {currentStepIndex > 0 && (
                        <button
                          onClick={handlePrevStep}
                          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:shadow-lg text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-md"
                          title="Previous Step"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                      )}
                      {currentStepIndex < item.steps.length - 1 && (
                        <button
                          onClick={handleNextStep}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:shadow-lg text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-md"
                          title="Next Step"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      )}
                    </>
                  )}

                  {/* Step Indicator */}
                  {isSequence && item.steps && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 px-4 py-2 rounded-full shadow-lg border-2 border-pink-300">
                      <p className="text-xs font-bold text-gray-800">Step {currentStepIndex + 1} / {item.steps.length}</p>
                    </div>
                  )}

                  {/* Full Screen Toggle */}
                  <button
                    onClick={() => setIsFullScreen(true)}
                    className="absolute top-4 right-4 p-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:shadow-lg text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-md"
                    title={labels.btnFullScreen}
                  >
                    <Maximize className="w-5 h-5" />
                  </button>
              </div>
          </div>

          {/* Controls Section */}
          <div className="w-full md:w-96 p-6 flex flex-col border-l-4 border-pink-300 bg-gradient-to-b from-white to-pink-50">
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-2xl font-bold text-gray-800">{labels.modalDetails}</h2>
               <button onClick={onClose} className="p-2 hover:bg-pink-100 rounded-full transition-colors">
                 <X className="w-6 h-6 text-pink-600" />
               </button>
            </div>

            <div className="mb-6 space-y-4 overflow-y-auto flex-1">
              <div>
                  <h3 className="text-xs uppercase tracking-wider text-pink-600 font-bold mb-1">{labels.modalDomain}</h3>
                  <p className="text-gray-700 text-sm font-medium">{item.fact.domain}</p>
              </div>
              <div>
                  <h3 className="text-xs uppercase tracking-wider text-purple-600 font-bold mb-1">{labels.modalTitle}</h3>
                  <p className="text-gray-800 text-lg font-bold">{item.fact.title}</p>
              </div>

              {/* Sequence Step Info */}
              {isSequence && currentStep && (
                <div className="bg-gradient-to-br from-purple-100 to-pink-100 p-3 rounded-lg border-2 border-purple-300">
                  <h3 className="text-xs uppercase tracking-wider text-purple-700 font-bold mb-1">📍 {currentStep.title}</h3>
                  <p className="text-gray-700 text-xs leading-relaxed">{currentStep.description}</p>
                </div>
              )}

              {/* Thumbnail Strip for Sequences */}
              {isSequence && item.steps && item.steps.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {item.steps.map((step, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentStepIndex(idx)}
                      className={`flex-shrink-0 rounded-lg border-2 overflow-hidden transition-all ${
                        idx === currentStepIndex
                          ? 'border-pink-500 scale-110'
                          : 'border-gray-300 hover:border-pink-400'
                      }`}
                    >
                      <img
                        src={step.imageUrl}
                        alt={`Step ${idx + 1}`}
                        className="w-12 h-12 object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Metadata Chips - Colorful */}
              <div className="flex flex-wrap gap-2 pt-2">
                  {item.audience && (
                      <span className="px-3 py-1 bg-pink-100 border border-pink-400 rounded-full text-xs text-pink-700 font-bold">
                          👶 {item.audience}
                      </span>
                  )}
                  {item.style && (
                      <span className="px-3 py-1 bg-purple-100 border border-purple-400 rounded-full text-xs text-purple-700 font-bold">
                          🎨 {item.style}
                      </span>
                  )}
                  {item.aspectRatio && (
                      <span className="px-3 py-1 bg-cyan-100 border border-cyan-400 rounded-full text-xs text-cyan-700 font-bold">
                          📐 {item.aspectRatio}
                      </span>
                  )}
                  {item.modelName && (
                      <span className="px-3 py-1 bg-yellow-100 border border-yellow-400 rounded-full text-xs text-yellow-700 font-bold">
                          ⚡ {item.modelName}
                      </span>
                  )}
                  {item.language && (
                      <span className="px-3 py-1 bg-green-100 border border-green-400 rounded-full text-xs text-green-700 font-bold">
                          🌍 {item.language.toUpperCase()}
                      </span>
                  )}
                  {isSequence && (
                      <span className="px-3 py-1 bg-indigo-100 border border-indigo-400 rounded-full text-xs text-indigo-700 font-bold">
                          🔄 Sequence
                      </span>
                  )}
              </div>

              <div className="pt-2">
                  <h3 className="text-xs uppercase tracking-wider text-purple-600 font-bold mb-2">{labels.modalFact}</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">{item.fact.text}</p>
              </div>
            </div>

            <div className="mt-auto space-y-3 pt-4">
               <div className="p-4 bg-white rounded-2xl border-2 border-pink-300 shadow-md">
                  <label className="block text-sm font-bold text-gray-700 mb-2">✨ {labels.modalEditLabel}</label>
                  <div className="flex gap-2">
                      <input
                          type="text"
                          value={editPrompt}
                          onChange={(e) => setEditPrompt(e.target.value)}
                          placeholder={labels.placeholderEdit}
                          className="flex-1 bg-white border-2 border-pink-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
                          onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
                      />
                      <button
                          onClick={handleEdit}
                          disabled={isEditing || !editPrompt.trim()}
                          className="p-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50 transition-all"
                          title="Apply Edit"
                      >
                          {isEditing ? <RefreshCcw className="w-4 h-4 animate-spin"/> : <Wand2 className="w-4 h-4"/>}
                      </button>
                  </div>
                  {error && <p className="text-red-600 text-xs mt-2 font-medium">❌ {error}</p>}
               </div>

              <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 shadow-md"
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
             className="absolute top-6 right-6 p-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:shadow-lg text-white rounded-full transition-all z-50 shadow-lg"
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

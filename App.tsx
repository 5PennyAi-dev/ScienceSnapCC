import React, { useState, useEffect } from 'react';
import { AppState, ScientificFact, InfographicItem } from './types';
import { generateScientificFacts, generateInfographicPlan, generateInfographicImage } from './services/geminiService';
import { FactCard } from './components/FactCard';
import { GalleryGrid } from './components/GalleryGrid';
import { ImageModal } from './components/ImageModal';
import { Atom, Microscope, ArrowRight, BookOpen, Loader2, Sparkles, Image as ImageIcon, ArrowLeft, Key } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('input');
  const [domain, setDomain] = useState('');
  const [facts, setFacts] = useState<ScientificFact[]>([]);
  const [selectedFact, setSelectedFact] = useState<ScientificFact | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [currentPlan, setCurrentPlan] = useState('');
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [gallery, setGallery] = useState<InfographicItem[]>([]);
  
  // Modal State
  const [selectedGalleryItem, setSelectedGalleryItem] = useState<InfographicItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // API Key State
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isCheckingKey, setIsCheckingKey] = useState(true);

  useEffect(() => {
    checkApiKey();
    const saved = localStorage.getItem('scienceSnapGallery');
    if (saved) {
      setGallery(JSON.parse(saved));
    }
  }, []);

  const checkApiKey = async () => {
    if (window.aistudio) {
        try {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            setHasApiKey(hasKey);
        } catch (e) {
            console.error("Error checking API key:", e);
            setHasApiKey(false);
        }
    } else {
         // Fallback for environments where aistudio is not injected
         setHasApiKey(true);
    }
    setIsCheckingKey(false);
  };

  const handleSelectKey = async () => {
    if (window.aistudio) {
        try {
            await window.aistudio.openSelectKey();
            setHasApiKey(true);
        } catch (e: any) {
            if (e.message && e.message.includes("Requested entity was not found")) {
                 setHasApiKey(false);
                 alert("Session expired. Please select the key again.");
            }
            console.error("Error selecting key:", e);
        }
    }
  };

  const saveToGallery = (item: InfographicItem) => {
    const newGallery = [item, ...gallery];
    setGallery(newGallery);
    localStorage.setItem('scienceSnapGallery', JSON.stringify(newGallery));
  };

  const handleDomainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;

    setLoading(true);
    setLoadingMessage(`Consulting scientific archives about ${domain}...`);
    
    try {
      const generatedFacts = await generateScientificFacts(domain);
      setFacts(generatedFacts);
      setAppState('selection');
    } catch (error) {
      alert("Something went wrong retrieving facts. Please check your API key or try a different domain.");
    } finally {
      setLoading(false);
    }
  };

  const handleFactSelect = async (fact: ScientificFact) => {
    setSelectedFact(fact);
    setAppState('planning');
    setLoading(true);
    
    try {
      setLoadingMessage("Designing a visual masterpiece...");
      const plan = await generateInfographicPlan(fact);
      setCurrentPlan(plan);
      
      setAppState('generating');
      setLoadingMessage("Rendering infographic pixels (this may take a moment)...");
      
      const image = await generateInfographicImage(plan);
      setCurrentImage(image);
      setAppState('result');
      
    } catch (error) {
       console.error(error);
       alert("Failed to create infographic. Please try again.");
       setAppState('selection');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (selectedFact && currentImage && currentPlan) {
      const newItem: InfographicItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        fact: selectedFact,
        imageUrl: currentImage,
        plan: currentPlan
      };
      saveToGallery(newItem);
      setAppState('gallery');
    }
  };

  const updateGalleryItem = (updatedItem: InfographicItem) => {
    const newGallery = gallery.map(item => item.id === updatedItem.id ? updatedItem : item);
    setGallery(newGallery);
    localStorage.setItem('scienceSnapGallery', JSON.stringify(newGallery));
    setSelectedGalleryItem(updatedItem);
  };

  const renderHeader = () => (
    <header className="w-full p-6 flex justify-between items-center bg-slate-900/50 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setAppState('input')}>
        <div className="w-10 h-10 bg-gradient-to-tr from-purple-500 to-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
          <Atom className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            ScienceSnap
          </h1>
          <p className="text-xs text-gray-400">Learn. Visualize. Inspire.</p>
        </div>
      </div>
      <button 
        onClick={() => setAppState('gallery')}
        className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
          appState === 'gallery' 
            ? 'bg-purple-600 text-white' 
            : 'bg-white/5 hover:bg-white/10 text-gray-300'
        }`}
      >
        <BookOpen className="w-4 h-4" />
        <span>Gallery</span>
      </button>
    </header>
  );

  if (isCheckingKey) {
    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
        </div>
    );
  }

  if (!hasApiKey) {
    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-800 p-8 rounded-2xl border border-white/10 text-center shadow-2xl">
                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Key className="w-8 h-8 text-purple-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-4">API Key Required</h1>
                <p className="text-gray-400 mb-8 leading-relaxed">
                    To generate high-quality infographics using the Gemini Pro Vision model, you need to select a paid API key.
                </p>
                <button 
                    onClick={handleSelectKey}
                    className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl text-white font-bold transition-all transform hover:scale-[1.02] shadow-lg mb-4"
                >
                    Select API Key
                </button>
                <p className="text-xs text-gray-500">
                    Check <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">billing documentation</a> for more details.
                </p>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black text-white">
      {renderHeader()}

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        
        {/* Loader Overlay */}
        {loading && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
            <Loader2 className="w-16 h-16 text-purple-500 animate-spin mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Please wait</h2>
            <p className="text-gray-400 animate-pulse">{loadingMessage}</p>
          </div>
        )}

        {/* View: Input */}
        {appState === 'input' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-2xl mx-auto">
            <div className="mb-8 p-4 bg-purple-500/10 rounded-full border border-purple-500/20">
              <Microscope className="w-12 h-12 text-purple-400" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              Turn <span className="text-purple-400">Science</span> into <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Visual Art</span>
            </h2>
            <p className="text-gray-400 text-lg mb-10 max-w-lg">
              Enter a scientific field, discover fascinating facts, and let AI generate stunning infographics for education.
            </p>
            
            <form onSubmit={handleDomainSubmit} className="w-full relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition-opacity"></div>
              <div className="relative flex items-center bg-slate-800 rounded-xl border border-white/10 p-2 shadow-2xl">
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="E.g. Marine Biology, Astrophysics, Quantum Mechanics..."
                  className="flex-1 bg-transparent border-none text-white px-4 py-3 focus:outline-none placeholder-gray-500 text-lg"
                  autoFocus
                />
                <button 
                  type="submit"
                  disabled={!domain.trim()}
                  className="bg-white text-slate-900 px-6 py-3 rounded-lg font-bold hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Discover
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* View: Fact Selection */}
        {appState === 'selection' && (
           <div className="animate-fade-in-up">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => setAppState('input')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <h2 className="text-3xl font-bold">Discoveries in <span className="text-purple-400">{domain}</span></h2>
                    <p className="text-gray-400">Select a fact to visualize.</p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {facts.map((fact, index) => (
                <FactCard 
                  key={index} 
                  fact={fact} 
                  index={index} 
                  onSelect={handleFactSelect} 
                />
              ))}
            </div>
          </div>
        )}

        {/* View: Result */}
        {appState === 'result' && currentImage && selectedFact && (
          <div className="flex flex-col md:flex-row gap-8 animate-fade-in">
             <div className="w-full md:w-1/2 flex flex-col">
                <div className="mb-6">
                    <button onClick={() => setAppState('selection')} className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back to facts
                    </button>
                    <h2 className="text-3xl font-bold mb-2">Your Infographic is Ready!</h2>
                    <p className="text-gray-400">Based on: <span className="text-white font-medium">{selectedFact.title}</span></p>
                </div>

                <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/10 flex-grow">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-yellow-400" />
                        AI Generation Plan
                    </h3>
                    <div className="prose prose-invert prose-sm max-w-none max-h-[400px] overflow-y-auto pr-2 custom-scrollbar text-gray-300">
                        {/* Simple display of the plan text, usually markdown */}
                        <div className="whitespace-pre-wrap font-mono text-xs">
                             {currentPlan}
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 mt-6">
                    <button 
                        onClick={() => handleFactSelect(selectedFact)}
                        className="flex-1 py-3 px-4 rounded-xl border border-white/20 hover:bg-white/10 transition-colors font-semibold flex items-center justify-center gap-2"
                    >
                        <Sparkles className="w-4 h-4" />
                        Regenerate
                    </button>
                    <button 
                        onClick={handleSave}
                        className="flex-1 py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 transition-colors font-semibold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20"
                    >
                        <ImageIcon className="w-4 h-4" />
                        Save to Gallery
                    </button>
                </div>
             </div>

             <div className="w-full md:w-1/2 flex items-center justify-center bg-black/40 rounded-3xl p-4 border border-white/10">
                 <img 
                    src={currentImage} 
                    alt="Generated Infographic" 
                    className="max-h-[80vh] w-auto rounded-xl shadow-2xl"
                 />
             </div>
          </div>
        )}

        {/* View: Gallery */}
        {appState === 'gallery' && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold">Your Gallery</h2>
                <button 
                    onClick={() => setAppState('input')}
                    className="bg-white text-slate-900 px-4 py-2 rounded-lg font-bold hover:bg-gray-200 transition-colors text-sm"
                >
                    Create New
                </button>
            </div>
            <GalleryGrid 
                items={gallery} 
                onItemClick={(item) => {
                    setSelectedGalleryItem(item);
                    setIsModalOpen(true);
                }} 
            />
          </div>
        )}

      </main>

      <ImageModal 
        item={selectedGalleryItem}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpdate={updateGalleryItem}
      />
    </div>
  );
};

export default App;

import React, { useState, useEffect } from 'react';
import { AppState, ScientificFact, InfographicItem, Language } from './types';
import { generateScientificFacts, generateInfographicPlan, generateInfographicImage, generateFactFromConcept } from './services/geminiService';
import { uploadImageToStorage } from './services/imageUploadService';
import { FactCard } from './components/FactCard';
import { GalleryGrid } from './components/GalleryGrid';
import { ImageModal } from './components/ImageModal';
import { Atom, Microscope, ArrowRight, BookOpen, Loader2, Sparkles, Image as ImageIcon, ArrowLeft, Key, Lightbulb, Globe } from 'lucide-react';
import { db } from './db';
import { tx, id } from "@instantdb/react";
import { getTranslation } from './translations';

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('en');
  const [appState, setAppState] = useState<AppState>('input');
  
  // Search State
  const [searchMode, setSearchMode] = useState<'domain' | 'concept'>('domain');
  const [query, setQuery] = useState('');

  const [facts, setFacts] = useState<ScientificFact[]>([]);
  const [selectedFact, setSelectedFact] = useState<ScientificFact | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [currentPlan, setCurrentPlan] = useState('');
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  
  // Modal State
  const [selectedGalleryItem, setSelectedGalleryItem] = useState<InfographicItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // API Key State
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isCheckingKey, setIsCheckingKey] = useState(true);

  const t = getTranslation(language);

  // Database Query
  const { isLoading: isLoadingGallery, error: galleryError, data } = db.useQuery({ 
    infographics: {} 
  });
  
  // Flatten DB data to match InfographicItem[]
  const gallery: InfographicItem[] = data?.infographics 
    ? Object.values(data.infographics).map((item: any) => ({
        id: item.id,
        timestamp: item.timestamp,
        imageUrl: item.imageUrl,
        plan: item.plan,
        fact: {
            title: item.title,
            domain: item.domain,
            text: item.text
        }
    })).sort((a: InfographicItem, b: InfographicItem) => b.timestamp - a.timestamp)
    : [];

  useEffect(() => {
    checkApiKey();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    if (searchMode === 'domain') {
        await handleDomainSubmit();
    } else {
        await handleConceptSubmit();
    }
  };

  const handleDomainSubmit = async () => {
    setLoading(true);
    setLoadingMessage(`${t.loadingConsulting} (${query})...`);
    
    try {
      const generatedFacts = await generateScientificFacts(query, language);
      setFacts(generatedFacts);
      setAppState('selection');
    } catch (error) {
      alert(`${t.errorGenFacts}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConceptSubmit = async () => {
    setLoading(true);
    setLoadingMessage(`${t.loadingResearching} (${query})...`);
    
    try {
      const fact = await generateFactFromConcept(query, language);
      // Skip selection, go straight to processing
      await processFactToInfographic(fact);
    } catch (error) {
      alert(`${t.errorGenConcept}`);
      setLoading(false);
    }
  };

  const handleFactSelect = async (fact: ScientificFact) => {
    await processFactToInfographic(fact);
  };

  const processFactToInfographic = async (fact: ScientificFact) => {
    setSelectedFact(fact);
    setAppState('planning');
    setLoading(true);
    
    try {
      setLoadingMessage(t.loadingPlanning);
      const plan = await generateInfographicPlan(fact, language);
      setCurrentPlan(plan);
      
      setAppState('generating');
      setLoadingMessage(t.loadingRendering);
      
      const image = await generateInfographicImage(plan);
      setCurrentImage(image);
      setAppState('result');
      
    } catch (error) {
       console.error(error);
       alert(t.errorGenImage);
       setAppState('input');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (selectedFact && currentImage && currentPlan) {
      setLoading(true);
      setLoadingMessage(t.loadingSaving);
      
      try {
        const newItemId = id();
        
        // This will try ImageKit, but return Base64 if it fails so we ALWAYS save
        const imageUrlToSave = await uploadImageToStorage(currentImage, `${newItemId}.png`);
        
        const isUrl = imageUrlToSave.startsWith('http');
        console.log(`Saving to DB. Source: ${isUrl ? 'ImageKit Cloud' : 'Local Base64'}`);

        // Save metadata to InstantDB
        db.transact(tx.infographics[newItemId].update({
            id: newItemId,
            timestamp: Date.now(),
            title: selectedFact.title,
            domain: selectedFact.domain,
            text: selectedFact.text,
            plan: currentPlan,
            imageUrl: imageUrlToSave
        }));
        
        setAppState('gallery');
      } catch (e: any) {
        console.error("Save Operation Failed:", e);
        alert(`${t.errorSave}: ${e.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const updateGalleryItem = (updatedItem: InfographicItem) => {
    // For local updates within the modal before DB sync reflects
    setSelectedGalleryItem(updatedItem);
    
    // Update DB
    db.transact(tx.infographics[updatedItem.id].update({
        imageUrl: updatedItem.imageUrl
    }));
  };

  const renderHeader = () => (
    <header className="w-full p-6 flex flex-col md:flex-row justify-between items-center bg-slate-900/50 backdrop-blur-md border-b border-white/10 sticky top-0 z-40 gap-4">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setAppState('input')}>
        <div className="w-10 h-10 bg-gradient-to-tr from-purple-500 to-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
          <Atom className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            {t.appTitle}
          </h1>
          <p className="text-xs text-gray-400">{t.appSubtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Language Toggle */}
        <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
            <button 
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 text-sm font-semibold rounded-md transition-all ${language === 'en' ? 'bg-slate-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
            >
                EN
            </button>
            <button 
                onClick={() => setLanguage('fr')}
                className={`px-3 py-1 text-sm font-semibold rounded-md transition-all ${language === 'fr' ? 'bg-slate-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
            >
                FR
            </button>
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
            <span>{t.gallery}</span>
        </button>
      </div>
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
              {t.heroTitlePrefix} <span className="text-purple-400">{t.heroTitleHighlight}</span> {t.heroTitleMiddle} <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">{t.heroTitleSuffix}</span>
            </h2>
            <p className="text-gray-400 text-lg mb-10 max-w-lg">
              {t.heroSubtitle}
            </p>

            <div className="w-full max-w-xl">
                {/* Tabs */}
                <div className="flex p-1 bg-slate-800 rounded-xl mb-6 border border-white/10">
                    <button
                        onClick={() => { setSearchMode('domain'); setQuery(''); }}
                        className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                            searchMode === 'domain' 
                            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md' 
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <BookOpen className="w-4 h-4" />
                        {t.tabDomain}
                    </button>
                    <button
                        onClick={() => { setSearchMode('concept'); setQuery(''); }}
                        className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                            searchMode === 'concept' 
                            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md' 
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <Lightbulb className="w-4 h-4" />
                        {t.tabConcept}
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="w-full relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition-opacity"></div>
                <div className="relative flex items-center bg-slate-800 rounded-xl border border-white/10 p-2 shadow-2xl">
                    <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={searchMode === 'domain' ? t.placeholderDomain : t.placeholderConcept}
                    className="flex-1 bg-transparent border-none text-white px-4 py-3 focus:outline-none placeholder-gray-500 text-lg"
                    autoFocus
                    />
                    <button 
                    type="submit"
                    disabled={!query.trim()}
                    className="bg-white text-slate-900 px-6 py-3 rounded-lg font-bold hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                    {searchMode === 'domain' ? t.btnDiscover : t.btnVisualize}
                    <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
                </form>
            </div>
            
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
                    <h2 className="text-3xl font-bold">{t.discoveriesIn} <span className="text-purple-400">{query}</span></h2>
                    <p className="text-gray-400">{t.selectFact}</p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {facts.map((fact, index) => (
                <FactCard 
                  key={index} 
                  fact={fact} 
                  index={index} 
                  onSelect={handleFactSelect}
                  labels={{ factLabel: t.factCardLabel, createBtn: t.btnCreateInfographic }}
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
                    <button onClick={() => setAppState(searchMode === 'domain' ? 'selection' : 'input')} className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> {t.backToInput}
                    </button>
                    <h2 className="text-3xl font-bold mb-2">{t.resultTitle}</h2>
                    <p className="text-gray-400">{t.basedOn} <span className="text-white font-medium">{selectedFact.title}</span></p>
                </div>

                <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/10 flex-grow">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-yellow-400" />
                        {t.aiPlan}
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
                        onClick={() => processFactToInfographic(selectedFact)}
                        className="flex-1 py-3 px-4 rounded-xl border border-white/20 hover:bg-white/10 transition-colors font-semibold flex items-center justify-center gap-2"
                    >
                        <Sparkles className="w-4 h-4" />
                        {t.btnRegenerate}
                    </button>
                    <button 
                        onClick={handleSave}
                        className="flex-1 py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 transition-colors font-semibold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20"
                    >
                        <ImageIcon className="w-4 h-4" />
                        {t.btnSave}
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
                <h2 className="text-3xl font-bold">{t.galleryTitle}</h2>
                <button 
                    onClick={() => setAppState('input')}
                    className="bg-white text-slate-900 px-4 py-2 rounded-lg font-bold hover:bg-gray-200 transition-colors text-sm"
                >
                    {t.btnCreateNew}
                </button>
            </div>
            
            {isLoadingGallery ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                </div>
            ) : (
                <GalleryGrid 
                    items={gallery} 
                    emptyMessage={t.galleryEmpty}
                    onItemClick={(item) => {
                        setSelectedGalleryItem(item);
                        setIsModalOpen(true);
                    }} 
                />
            )}
          </div>
        )}

      </main>

      <ImageModal 
        item={selectedGalleryItem}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpdate={updateGalleryItem}
        labels={{
            details: t.modalDetails,
            domain: t.modalDomain,
            title: t.modalTitle,
            fact: t.modalFact,
            editLabel: t.modalEditLabel,
            placeholderEdit: t.placeholderEdit,
            download: t.btnDownload,
            downloading: t.downloading,
            applyingMagic: t.applyingMagic
        }}
      />
    </div>
  );
};

export default App;

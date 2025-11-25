
import React, { useState, useEffect, useMemo } from 'react';
import { AppState, ScientificFact, InfographicItem, Language, AIStudio, Audience, ImageModelType, AspectRatio, ArtStyle } from './types';
import { generateScientificFacts, generateInfographicPlan, generateInfographicImage, generateFactFromConcept } from './services/geminiService';
import { uploadImageToStorage } from './services/imageUploadService';
import { FactCard } from './components/FactCard';
import { GalleryGrid } from './components/GalleryGrid';
import { ImageModal } from './components/ImageModal';
import { StyleSelector } from './components/StyleSelector';
import { Atom, ArrowRight, BookOpen, Loader2, Sparkles, Image as ImageIcon, ArrowLeft, Key, Lightbulb, Filter, Search, Grid3X3, Terminal, Rocket, Star, GraduationCap, Baby, Zap, Square, RectangleVertical, RectangleHorizontal, Smartphone, AlertCircle, XCircle } from 'lucide-react';
import { db } from './db';
import { tx, id } from "@instantdb/react";
import { getTranslation } from './translations';
import { IMAGE_MODEL_FLASH, IMAGE_MODEL_PRO } from './constants';

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('fr');
  const [audience, setAudience] = useState<Audience>('young');
  const [imageModel, setImageModel] = useState<ImageModelType>(IMAGE_MODEL_PRO);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.LANDSCAPE);
  const [artStyle, setArtStyle] = useState<ArtStyle>('DEFAULT');
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
  
  // Error State
  const [error, setError] = useState<string | null>(null);

  // Gallery Filter State
  const [filterDomain, setFilterDomain] = useState<string>('All');
  
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
  const gallery: InfographicItem[] = useMemo(() => {
    if (!data?.infographics) return [];
    
    return Object.values(data.infographics).map((item: any) => ({
        id: item.id,
        timestamp: item.timestamp,
        imageUrl: item.imageUrl,
        plan: item.plan,
        fact: {
            title: item.title,
            domain: item.domain,
            text: item.text
        },
        aspectRatio: item.aspectRatio,
        style: item.style,
        audience: item.audience,
        modelName: item.modelName,
        language: item.language
    })).sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [data]);

  // Derived state for domains
  const uniqueDomains = useMemo(() => {
    const domains = new Set(gallery.map(item => item.fact.domain));
    return Array.from(domains).sort();
  }, [gallery]);

  // Derived state for filtered items
  const filteredGallery = useMemo(() => {
    if (filterDomain === 'All') return gallery;
    return gallery.filter(item => item.fact.domain === filterDomain);
  }, [gallery, filterDomain]);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    const aistudio = (window as any).aistudio as AIStudio | undefined;
    if (aistudio) {
        try {
            const hasKey = await aistudio.hasSelectedApiKey();
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
    const aistudio = (window as any).aistudio as AIStudio | undefined;
    if (aistudio) {
        try {
            await aistudio.openSelectKey();
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
    setError(null);

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
      const generatedFacts = await generateScientificFacts(query, language, audience);
      setFacts(generatedFacts);
      setAppState('selection');
    } catch (err: any) {
      setError(err.message || t.errorGenFacts);
    } finally {
      setLoading(false);
    }
  };

  const handleConceptSubmit = async () => {
    setLoading(true);
    setLoadingMessage(`${t.loadingResearching} (${query})...`);
    
    try {
      const fact = await generateFactFromConcept(query, language, audience);
      // Skip selection, go straight to processing
      await processFactToInfographic(fact);
    } catch (err: any) {
      setError(err.message || t.errorGenConcept);
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
    setError(null);
    
    try {
      setLoadingMessage(t.loadingPlanning);
      const plan = await generateInfographicPlan(fact, language, audience, artStyle);
      setCurrentPlan(plan);
      
      setAppState('generating');
      setLoadingMessage(t.loadingRendering);
      
      const image = await generateInfographicImage(plan, imageModel, aspectRatio, artStyle);
      setCurrentImage(image);
      setAppState('result');
      
    } catch (err: any) {
       console.error("Infographic Generation Failed:", err);
       const errorMessage = err.message || t.errorGenImage;
       setError(errorMessage);
       
       // Handle state transition on error
       // If we have facts, return to selection screen to let user try another
       if (facts.length > 0) {
           setAppState('selection');
       } else {
           // If concept mode (no fact list), go back to input but ensure error is visible
           setAppState('input');
       }
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
            imageUrl: imageUrlToSave,
            // New fields
            aspectRatio: aspectRatio,
            style: artStyle,
            audience: audience,
            modelName: imageModel,
            language: language
        }));
        
        setAppState('gallery');
      } catch (e: any) {
        console.error("Save Operation Failed:", e);
        setError(`${t.errorSave}: ${e.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGalleryClick = (item: InfographicItem) => {
    setSelectedGalleryItem(item);
    setIsModalOpen(true);
  };

  // Renders

  if (isCheckingKey) {
    return (
      <div className="min-h-screen bg-indigo-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (!hasApiKey) {
    return (
      <div className="min-h-screen bg-indigo-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-indigo-900/50 p-8 rounded-3xl border border-white/10 max-w-md">
            <Key className="w-12 h-12 text-fuchsia-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">API Key Required</h1>
            <p className="text-indigo-200 mb-6">
                To use ScienceSnap's premium image generation features (Google Veo/Imagen), 
                please select a valid Google Cloud project with billing enabled.
            </p>
            <button 
                onClick={handleSelectKey}
                className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 mx-auto"
            >
                Select API Key
            </button>
            <p className="mt-4 text-xs text-indigo-400">
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-indigo-300">
                    Learn more about billing
                </a>
            </p>
        </div>
      </div>
    );
  }

  // Loading Overlay
  if (loading) {
    return (
      <div className="min-h-screen bg-indigo-950 flex flex-col items-center justify-center relative overflow-hidden">
         {/* Background Animation */}
         <div className="absolute inset-0 z-0">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-fuchsia-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
         </div>

         <div className="z-10 flex flex-col items-center text-center p-6">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500 to-cyan-500 rounded-full blur-xl opacity-50 animate-spin"></div>
                <div className="relative bg-indigo-900 p-4 rounded-full border border-white/10">
                    {appState === 'generating' ? <Sparkles className="w-12 h-12 text-white animate-pulse" /> : <Atom className="w-12 h-12 text-white animate-spin-slow" />}
                </div>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 font-space">{loadingMessage}</h2>
            <p className="text-indigo-300">Powered by Gemini 2.5 & 3.0 Pro</p>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-indigo-950 text-white font-inter pb-12 relative">
      {/* Error Toast / Banner */}
      {error && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-lg px-4 animate-slide-down">
          <div className="bg-red-500/10 backdrop-blur-md border border-red-500/50 text-red-100 p-4 rounded-xl shadow-2xl flex items-start gap-3">
             <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
             <div className="flex-1">
                <h3 className="font-bold text-sm text-red-300 mb-1">Error</h3>
                <p className="text-sm opacity-90">{error}</p>
             </div>
             <button onClick={() => setError(null)} className="p-1 hover:bg-red-500/20 rounded-lg transition-colors">
                <XCircle className="w-5 h-5 text-red-400" />
             </button>
          </div>
        </div>
      )}

      {/* Navigation / Header */}
      <nav className="sticky top-0 z-40 bg-indigo-950/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer group" 
            onClick={() => setAppState('input')}
          >
            <div className="bg-gradient-to-br from-fuchsia-500 to-indigo-600 p-2 rounded-lg group-hover:rotate-12 transition-transform">
                <Atom className="w-5 h-5 text-white" />
            </div>
            <span className="font-space font-bold text-xl tracking-tight">
                {t.appTitle}
            </span>
          </div>

          <div className="flex items-center gap-3">
             {/* Gallery button - Always Visible */}
             <button 
                onClick={() => setAppState('gallery')}
                className={`p-2 rounded-lg transition-colors ${appState === 'gallery' ? 'bg-white/10 text-white' : 'text-indigo-300 hover:text-white'}`}
                title={t.gallery}
             >
                <Grid3X3 className="w-5 h-5" />
             </button>
             <div className="h-6 w-px bg-white/10 mx-1"></div>
             <button 
                onClick={() => setLanguage(l => l === 'en' ? 'fr' : 'en')}
                className="text-xs font-bold px-2 py-1 rounded border border-white/10 hover:bg-white/5 transition-colors"
             >
                {language.toUpperCase()}
             </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* INPUT MODE */}
        {appState === 'input' && (
          <div className="max-w-3xl mx-auto animate-fade-in">
            
            {/* Hero Text */}
            <div className="text-center mb-12">
               <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300 text-xs font-bold uppercase tracking-widest mb-6">
                  <Sparkles className="w-3 h-3" />
                  AI-Powered Education
               </div>
               <h1 className="text-4xl md:text-6xl font-space font-bold mb-6 leading-tight">
                  {t.heroTitlePrefix} <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">{t.heroTitleHighlight}</span> {t.heroTitleMiddle} <span className="text-white">{t.heroTitleSuffix}</span>
               </h1>
               <p className="text-indigo-200 text-lg max-w-2xl mx-auto">
                  {t.heroSubtitle}
               </p>
            </div>

            {/* Controls Toolbar */}
            <div className="flex flex-wrap justify-center gap-3 mb-8">
                {/* Audience Toggle */}
                <div className="bg-indigo-900/50 p-1 rounded-xl border border-white/10 flex items-center">
                    <button 
                        onClick={() => setAudience('young')}
                        className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${audience === 'young' ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-300 hover:text-white'}`}
                    >
                        <Baby className="w-4 h-4" />
                        <span className="hidden sm:inline">{t.audienceKids}</span>
                    </button>
                    <button 
                        onClick={() => setAudience('adult')}
                        className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${audience === 'adult' ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-300 hover:text-white'}`}
                    >
                        <GraduationCap className="w-4 h-4" />
                        <span className="hidden sm:inline">{t.audienceAdults}</span>
                    </button>
                </div>

                {/* Style Selector */}
                <div className="bg-indigo-900/50 p-1 rounded-xl border border-white/10 flex items-center">
                    <StyleSelector 
                        selectedStyle={artStyle}
                        onSelect={setArtStyle}
                        labels={t}
                    />
                </div>

                {/* Model & Ratio Toggles (Compact) */}
                <div className="bg-indigo-900/50 p-1 rounded-xl border border-white/10 flex items-center gap-1">
                    <button 
                        onClick={() => setImageModel(m => m === IMAGE_MODEL_FLASH ? IMAGE_MODEL_PRO : IMAGE_MODEL_FLASH)}
                        className="p-2 rounded-lg hover:bg-white/5 text-indigo-300 hover:text-white transition-colors"
                        title={imageModel === IMAGE_MODEL_FLASH ? "Fast Mode" : "Pro Mode (High Quality)"}
                    >
                        {imageModel === IMAGE_MODEL_FLASH ? <Zap className="w-4 h-4" /> : <Star className="w-4 h-4 text-yellow-400" />}
                    </button>
                    <div className="w-px h-4 bg-white/10"></div>
                    <button 
                         onClick={() => {
                             const ratios = [AspectRatio.SQUARE, AspectRatio.PORTRAIT, AspectRatio.LANDSCAPE, AspectRatio.TALL];
                             const nextIdx = (ratios.indexOf(aspectRatio) + 1) % ratios.length;
                             setAspectRatio(ratios[nextIdx]);
                         }}
                         className="p-2 rounded-lg hover:bg-white/5 text-indigo-300 hover:text-white transition-colors"
                         title={
                             aspectRatio === AspectRatio.SQUARE ? t.ratioSquare :
                             aspectRatio === AspectRatio.PORTRAIT ? t.ratioPortrait :
                             aspectRatio === AspectRatio.LANDSCAPE ? t.ratioLandscape :
                             t.ratioTall
                         }
                    >
                        {aspectRatio === AspectRatio.SQUARE && <Square className="w-4 h-4" />}
                        {aspectRatio === AspectRatio.PORTRAIT && <RectangleVertical className="w-4 h-4" />}
                        {aspectRatio === AspectRatio.LANDSCAPE && <RectangleHorizontal className="w-4 h-4" />}
                        {aspectRatio === AspectRatio.TALL && <Smartphone className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Search Box */}
            <div className="bg-indigo-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-2 shadow-2xl shadow-indigo-950/50">
                <div className="flex border-b border-white/5 mb-2">
                    <button 
                        className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${searchMode === 'domain' ? 'bg-white/10 text-white' : 'text-indigo-400 hover:text-white'}`}
                        onClick={() => setSearchMode('domain')}
                    >
                        <Search className="w-4 h-4" />
                        {t.tabDomain}
                    </button>
                    <button 
                        className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${searchMode === 'concept' ? 'bg-white/10 text-white' : 'text-indigo-400 hover:text-white'}`}
                        onClick={() => setSearchMode('concept')}
                    >
                        <Lightbulb className="w-4 h-4" />
                        {t.tabConcept}
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="relative">
                    <input 
                        type="text" 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={searchMode === 'domain' ? t.placeholderDomain : t.placeholderConcept}
                        className="w-full bg-transparent text-white text-lg p-4 pl-6 pr-36 focus:outline-none placeholder:text-indigo-500/50"
                    />
                    <button 
                        type="submit"
                        disabled={!query.trim()}
                        className="absolute right-2 top-2 bottom-2 px-6 bg-white text-indigo-900 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
                    >
                        {searchMode === 'domain' ? t.btnDiscover : t.btnVisualize}
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </form>
            </div>

            {/* Quick Start Chips */}
            <div className="mt-8 flex flex-wrap justify-center gap-2">
                {['Astrophysics', 'Oceanography', 'Quantum Physics', 'Botany'].map(tag => (
                    <button 
                        key={tag}
                        onClick={() => { setSearchMode('domain'); setQuery(tag); }}
                        className="px-4 py-2 rounded-full border border-white/5 bg-white/5 text-indigo-300 text-xs font-bold hover:bg-white/10 hover:border-white/20 hover:text-white transition-all"
                    >
                        {tag}
                    </button>
                ))}
            </div>
          </div>
        )}

        {/* SELECTION STATE */}
        {appState === 'selection' && (
            <div className="animate-fade-in">
                <div className="flex items-center justify-between mb-8">
                    <button 
                        onClick={() => setAppState('input')}
                        className="flex items-center gap-2 text-indigo-300 hover:text-white transition-colors font-bold text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t.backToInput}
                    </button>
                    <h2 className="text-xl font-space font-bold text-white">
                        {t.discoveriesIn} <span className="text-fuchsia-400">{query}</span>
                    </h2>
                </div>

                <div className="grid md:grid-cols-3 gap-6 h-[60vh]">
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

        {/* RESULT STATE */}
        {appState === 'result' && currentImage && selectedFact && (
            <div className="animate-fade-in max-w-5xl mx-auto">
                 <div className="flex items-center justify-between mb-6">
                    <button 
                        onClick={() => setAppState('input')}
                        className="flex items-center gap-2 text-indigo-300 hover:text-white transition-colors font-bold text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t.btnCreateNew}
                    </button>
                    <div className="flex gap-3">
                         {/* Regenerate Button */}
                        <button 
                            onClick={() => handleFactSelect(selectedFact)}
                            className="px-4 py-2 rounded-xl border border-white/10 text-white hover:bg-white/5 text-sm font-bold flex items-center gap-2"
                        >
                            <Terminal className="w-4 h-4 text-indigo-400" />
                            {t.btnRegenerate}
                        </button>
                        {/* Save Button */}
                        <button 
                            onClick={handleSave}
                            className="px-6 py-2 rounded-xl bg-fuchsia-600 text-white hover:bg-fuchsia-500 shadow-lg shadow-fuchsia-900/20 text-sm font-bold flex items-center gap-2"
                        >
                            <Rocket className="w-4 h-4" />
                            {t.btnSave}
                        </button>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8 bg-indigo-900/20 p-6 rounded-3xl border border-white/5">
                    {/* Image Preview */}
                    <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black/50 group">
                        <img src={currentImage} alt="Generated Infographic" className="w-full h-auto object-contain" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                            <p className="text-white text-xs font-mono opacity-70">Generated by {imageModel}</p>
                        </div>
                    </div>

                    {/* Info Panel */}
                    <div className="flex flex-col gap-6">
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-fuchsia-400 mb-2">{t.basedOn}</h3>
                            <div className="bg-indigo-900/40 p-4 rounded-xl border border-white/5">
                                <h4 className="font-bold text-white mb-1">{selectedFact.title}</h4>
                                <p className="text-sm text-indigo-200/80 leading-relaxed">{selectedFact.text}</p>
                            </div>
                        </div>
                        
                        <div className="flex-1">
                             <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2">{t.aiPlan}</h3>
                             <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5 h-64 overflow-y-auto text-xs font-mono text-indigo-300 scrollbar-hide">
                                {currentPlan}
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* GALLERY STATE */}
        {appState === 'gallery' && (
             <div className="animate-fade-in">
                 <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                     <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setAppState('input')}
                            className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-white" />
                        </button>
                        <h2 className="text-3xl font-space font-bold text-white">{t.galleryTitle}</h2>
                     </div>

                     <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                        <Filter className="w-4 h-4 text-indigo-400" />
                        <button 
                            onClick={() => setFilterDomain('All')}
                            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filterDomain === 'All' ? 'bg-white text-indigo-900' : 'bg-white/5 text-indigo-300 hover:bg-white/10'}`}
                        >
                            {t.filterAll}
                        </button>
                        {uniqueDomains.map(d => (
                            <button 
                                key={d}
                                onClick={() => setFilterDomain(d)}
                                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filterDomain === d ? 'bg-white text-indigo-900' : 'bg-white/5 text-indigo-300 hover:bg-white/10'}`}
                            >
                                {d}
                            </button>
                        ))}
                     </div>
                 </div>

                {isLoadingGallery ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    </div>
                ) : (
                    <GalleryGrid 
                        items={filteredGallery} 
                        onItemClick={handleGalleryClick}
                        emptyMessage={t.galleryEmpty}
                    />
                )}
             </div>
        )}

      </main>

      <ImageModal 
        item={selectedGalleryItem}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        labels={t}
        model={imageModel}
        aspectRatio={aspectRatio}
        style={artStyle} // Pass the style so edits respect the user's choice
        onUpdate={(updatedItem) => {
            // Optimistic update locally
            setSelectedGalleryItem(updatedItem);
            
            // Persist update to DB
            db.transact(tx.infographics[updatedItem.id].update({
                imageUrl: updatedItem.imageUrl
            }));
        }}
      />
    </div>
  );
};

export default App;


import React, { useState, useEffect, useMemo } from 'react';
import { AppState, ScientificFact, InfographicItem, Language, AIStudio, Audience, ImageModelType, AspectRatio, ArtStyle, InfographicStep, SearchMode } from './types';
import { generateScientificFacts, generateInfographicPlan, generateInfographicImage, generateFactFromConcept, generateProcessStructure, generateStepExplanation, generateStepInfographicPlan } from './services/geminiService';
import { uploadImageToStorage } from './services/imageUploadService';
import { FactCard } from './components/FactCard';
import { GalleryGrid } from './components/GalleryGrid';
import { ImageModal } from './components/ImageModal';
import { StyleSelector } from './components/StyleSelector';
import { FilterPill } from './components/FilterPill';
import { Atom, ArrowRight, BookOpen, Loader2, Sparkles, Image as ImageIcon, ArrowLeft, Key, Lightbulb, Filter, Search, Grid3X3, Terminal, Rocket, Star, GraduationCap, Baby, Zap, Square, RectangleVertical, RectangleHorizontal, Smartphone, AlertCircle, XCircle, X } from 'lucide-react';
import { db } from './db';
import { tx, id } from "@instantdb/react";
import { getTranslation } from './translations';
import { IMAGE_MODEL_FLASH, IMAGE_MODEL_PRO, STYLE_CONFIG } from './constants';

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('fr');
  const [audience, setAudience] = useState<Audience>('young');
  const [imageModel, setImageModel] = useState<ImageModelType>(IMAGE_MODEL_PRO);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.TALL);
  const [artStyle, setArtStyle] = useState<ArtStyle>('DEFAULT');
  const [appState, setAppState] = useState<AppState>('input');
  
  // Search State for Generation
  const [searchMode, setSearchMode] = useState<SearchMode>('domain');
  const [query, setQuery] = useState('');

  const [facts, setFacts] = useState<ScientificFact[]>([]);
  const [selectedFact, setSelectedFact] = useState<ScientificFact | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [currentPlan, setCurrentPlan] = useState('');
  const [currentImage, setCurrentImage] = useState<string | null>(null);

  // Process/Sequence Learning Mode State
  const [processStructure, setProcessStructure] = useState<{
    processName: string;
    domain: string;
    overviewText: string;
    suggestedSteps: number;
    stepTitles: string[];
  } | null>(null);
  const [currentSequence, setCurrentSequence] = useState<InfographicStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  // Error State
  const [error, setError] = useState<string | null>(null);

  // Gallery Filter State
  const [filterDomain, setFilterDomain] = useState<string>('All');
  const [filterAudience, setFilterAudience] = useState<string>('All');
  const [filterStyle, setFilterStyle] = useState<string>('All');
  const [filterLanguage, setFilterLanguage] = useState<string>('All');
  const [gallerySearchQuery, setGallerySearchQuery] = useState('');
  
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
  
  // Flatten DB data to match InfographicItem[] (supports both single images and sequences)
  const gallery: InfographicItem[] = useMemo(() => {
    if (!data?.infographics) return [];

    return Object.values(data.infographics).map((item: any) => {
      // Check if this is a sequence or legacy single-image item
      if (item.isSequence && item.steps) {
        // Sequence format
        return {
          id: item.id,
          timestamp: item.timestamp,
          isSequence: true,
          steps: item.steps,
          totalSteps: item.totalSteps || item.steps.length,
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
        } as InfographicItem;
      } else {
        // Legacy single-image format
        return {
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
        } as InfographicItem;
      }
    }).sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [data]);

  // Derived state for domains
  const uniqueDomains = useMemo(() => {
    const domains = new Set(gallery.map(item => item.fact.domain));
    return Array.from(domains).sort();
  }, [gallery]);

  // Derived state for filtered items
  const filteredGallery = useMemo(() => {
    return gallery.filter(item => {
        const matchDomain = filterDomain === 'All' || item.fact.domain === filterDomain;
        const matchAudience = filterAudience === 'All' || item.audience === filterAudience;
        const matchStyle = filterStyle === 'All' || item.style === filterStyle;
        const matchLanguage = filterLanguage === 'All' || item.language === filterLanguage;
        
        // Search by Title or Domain
        const searchLower = gallerySearchQuery.toLowerCase().trim();
        const matchSearch = searchLower === '' || 
                            item.fact.title.toLowerCase().includes(searchLower) ||
                            item.fact.domain.toLowerCase().includes(searchLower);

        return matchDomain && matchAudience && matchStyle && matchLanguage && matchSearch;
    });
  }, [gallery, filterDomain, filterAudience, filterStyle, filterLanguage, gallerySearchQuery]);

  const hasActiveFilters = filterDomain !== 'All' || filterAudience !== 'All' || filterStyle !== 'All' || filterLanguage !== 'All' || gallerySearchQuery !== '';

  const clearFilters = () => {
      setFilterDomain('All');
      setFilterAudience('All');
      setFilterStyle('All');
      setFilterLanguage('All');
      setGallerySearchQuery('');
  };

  // Monitor gallery query errors
  useEffect(() => {
    if (galleryError) {
      console.error("Gallery query error:", galleryError);
      setError(`Database error: ${galleryError}`);
    }
  }, [galleryError]);

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
    } else if (searchMode === 'concept') {
        await handleConceptSubmit();
    } else if (searchMode === 'process') {
        await handleProcessSubmit();
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

  const handleProcessSubmit = async () => {
    setLoading(true);
    setLoadingMessage(`${t.loadingDiscoveringProcess} (${query})...`);

    try {
      // Step 1: Discover process structure
      console.log("[Process] Starting process structure generation...");
      const structure = await generateProcessStructure(query, language, audience);
      console.log(`[Process] Generated structure with ${structure.stepTitles.length} steps:`, structure.stepTitles);
      setProcessStructure(structure);

      // Step 2: Generate each step sequentially
      const steps: InfographicStep[] = [];
      let previousContext = structure.overviewText;

      for (let i = 0; i < structure.stepTitles.length; i++) {
        const stepNum = i + 1;
        const totalSteps = structure.stepTitles.length;

        try {
          console.log(`\n[Step ${stepNum}] ========================================`);
          console.log(`[Step ${stepNum}] Starting step generation (${stepNum}/${totalSteps})`);

          setCurrentStepIndex(stepNum);
          setLoadingMessage(`${t.loadingGeneratingStep} ${stepNum}/${totalSteps}...`);

          // 2a: Get detailed explanation for this step
          console.log(`[Step ${stepNum}] Generating explanation for "${structure.stepTitles[i]}"...`);
          const stepExplanation = await generateStepExplanation(
            structure.processName,
            stepNum,
            totalSteps,
            structure.stepTitles[i],
            previousContext,
            language,
            audience
          );
          console.log(`[Step ${stepNum}] ✓ Explanation complete. Title: "${stepExplanation.title}"`);

          setLoadingMessage(`${t.loadingPlanningStep} ${stepNum}/${totalSteps}...`);

          // 2b: Generate visual plan for this step
          console.log(`[Step ${stepNum}] Generating visual plan...`);
          const keyEventsStr = stepExplanation.keyEvents.join(', ');
          const stepPlan = await generateStepInfographicPlan(
            structure.processName,
            stepNum,
            totalSteps,
            stepExplanation.title,
            stepExplanation.description,
            keyEventsStr,
            structure.domain,
            steps,
            language,
            audience,
            artStyle
          );
          console.log(`[Step ${stepNum}] ✓ Visual plan generated (${stepPlan.length} chars)`);

          setLoadingMessage(`${t.loadingRenderingStep} ${stepNum}/${totalSteps}...`);

          // 2c: Render the image (use longer timeout for process sequences - 2 minutes per step)
          console.log(`[Step ${stepNum}] Rendering image with 120s timeout...`);
          const stepImage = await generateInfographicImage(stepPlan, imageModel, aspectRatio, artStyle, 120000);
          console.log(`[Step ${stepNum}] ✓ Image rendered successfully`);

          // 2d: Add to sequence
          const step: InfographicStep = {
            stepNumber: stepNum,
            title: stepExplanation.title,
            description: stepExplanation.description,
            plan: stepPlan,
            imageUrl: stepImage
          };

          steps.push(step);
          console.log(`[Step ${stepNum}] ✓ Step complete. Sequence length: ${steps.length}/${totalSteps}`);
          setCurrentSequence([...steps]); // Update UI progressively

          // Update context for next step
          previousContext += `\n\nStep ${stepNum}: ${stepExplanation.description}`;

        } catch (stepErr: any) {
          console.error(`\n[Step ${stepNum}] ❌ FAILED`);
          console.error(`[Step ${stepNum}] Error type: ${stepErr.constructor.name}`);
          console.error(`[Step ${stepNum}] Error message:`, stepErr.message);
          console.error(`[Step ${stepNum}] Stack:`, stepErr.stack);
          console.error(`[Step ${stepNum}] Steps completed so far: ${steps.length}`);

          // Re-throw with context about which step failed
          throw new Error(`Step ${stepNum} failed: ${stepErr.message}`);
        }
      }

      console.log(`\n[Process] ✓ All steps generated successfully! Total: ${steps.length}`);

      // Step 3: Validate sequence before showing result
      if (!steps || steps.length === 0) {
        throw new Error("No steps were generated. Please try again.");
      }

      console.log(`[Process] Creating infographic item with ${steps.length} steps...`);

      // Step 4: Move to result view
      setAppState('result');

    } catch (err: any) {
      console.error("\n[Process Generation FATAL ERROR]");
      console.error("Error:", err);

      // Provide context-aware error messages
      let errorMessage = t.errorGenProcess;
      if (err.message) {
        if (err.message.includes('timed out')) {
          errorMessage = "Generation took too long. Try a simpler process or refresh and try again.";
        } else if (err.message.includes('blocked')) {
          errorMessage = "Content was blocked by safety filters. Try rephrasing the process.";
        } else if (err.message.includes('rate limit')) {
          errorMessage = "API rate limit reached. Please wait a moment and try again.";
        } else {
          errorMessage = err.message;
        }
      }

      console.error("Final error message:", errorMessage);
      setError(errorMessage);
      setAppState('input');

      // Clear partial sequence on error
      setCurrentSequence([]);
      setProcessStructure(null);
    } finally {
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
    if (!selectedFact && currentSequence.length === 0) return;

    setLoading(true);
    setLoadingMessage(t.loadingSaving);

    try {
      const newItemId = id();

      // Check if this is a sequence or single image
      const isSequence = currentSequence.length > 0;

      if (isSequence && processStructure) {
        // Sequence save: Upload all images in parallel
        const uploadPromises = currentSequence.map((step, idx) =>
          uploadImageToStorage(step.imageUrl, `${newItemId}-step-${idx + 1}.png`)
        );
        const uploadedUrls = await Promise.all(uploadPromises);

        // Update step URLs with uploaded versions
        const stepsToSave = currentSequence.map((step, idx) => ({
          ...step,
          imageUrl: uploadedUrls[idx]
        }));

        const dataToSave = {
          id: newItemId,
          timestamp: Date.now(),
          title: processStructure.processName,
          domain: processStructure.domain,
          text: processStructure.overviewText,
          isSequence: true,
          steps: stepsToSave,
          totalSteps: stepsToSave.length,
          // Metadata
          aspectRatio: aspectRatio,
          style: artStyle,
          audience: audience,
          modelName: imageModel,
          language: language
        };

        console.log('Sequence data to save:', dataToSave);

        await db.transact(db.tx.infographics[newItemId].update(dataToSave));
        console.log(`✅ Successfully saved process sequence ${newItemId} to database`);

      } else if (selectedFact && currentImage && currentPlan) {
        // Single image save: Existing logic
        const imageUrlToSave = await uploadImageToStorage(currentImage, `${newItemId}.png`);

        const isUrl = imageUrlToSave.startsWith('http');
        console.log(`Saving to DB. Source: ${isUrl ? 'ImageKit Cloud' : 'Local Base64'}`);

        const dataToSave = {
          id: newItemId,
          timestamp: Date.now(),
          title: selectedFact.title,
          domain: selectedFact.domain,
          text: selectedFact.text,
          plan: currentPlan,
          imageUrl: imageUrlToSave,
          // Metadata
          aspectRatio: aspectRatio,
          style: artStyle,
          audience: audience,
          modelName: imageModel,
          language: language
        };

        console.log('Data to save:', dataToSave);

        await db.transact(db.tx.infographics[newItemId].update(dataToSave));
        console.log(`✅ Successfully saved infographic ${newItemId} to database`);
      }

      setAppState('gallery');
    } catch (e: any) {
      console.error("Save Operation Failed:", e);
      setError(`${t.errorSave}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGalleryClick = (item: InfographicItem) => {
    setSelectedGalleryItem(item);
    setIsModalOpen(true);
  };

  // Renders

  if (isCheckingKey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
      </div>
    );
  }

  if (!hasApiKey) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl border-4 border-pink-400 max-w-md shadow-2xl">
            <Key className="w-12 h-12 text-pink-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">API Key Required</h1>
            <p className="text-gray-600 mb-6">
                To use ScienceSnap's premium image generation features (Google Veo/Imagen),
                please select a valid Google Cloud project with billing enabled.
            </p>
            <button
                onClick={handleSelectKey}
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:shadow-lg text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 mx-auto"
            >
                Select API Key
            </button>
            <p className="mt-4 text-xs text-gray-500">
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-pink-500">
                    Learn more about billing
                </a>
            </p>
        </div>
      </div>
    );
  }

  // Loading Overlay
  if (loading) {
    const totalSteps = processStructure?.suggestedSteps || 0;
    const isProcessMode = searchMode === 'process' && totalSteps > 0;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
         {/* Background Animation */}
         <div className="absolute inset-0 z-0">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-500/30 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/30 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
         </div>

         <div className="z-10 flex flex-col items-center text-center p-6">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-cyan-400 rounded-full blur-xl opacity-60 animate-spin-slow"></div>
                <div className="relative bg-white p-6 rounded-full border-4 border-pink-400 shadow-xl">
                    {appState === 'generating' ? <Sparkles className="w-12 h-12 text-pink-500 animate-bounce-light" /> : <Atom className="w-12 h-12 text-pink-500 animate-spin-slow" />}
                </div>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">{loadingMessage}</h2>

            {/* Process Step Progress Indicator */}
            {isProcessMode && (
              <div className="flex gap-2 mb-6">
                {Array.from({ length: totalSteps }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-3 h-3 rounded-full transition-all ${
                      idx < currentStepIndex
                        ? 'bg-green-400 scale-100'
                        : idx === currentStepIndex
                          ? 'bg-pink-400 animate-pulse scale-125'
                          : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>
            )}

            <p className="text-white/70">✨ Science in the making... ✨</p>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-gray-800 pb-12 relative">
      {/* Error Toast / Banner */}
      {error && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-lg px-4 animate-slide-down">
          <div className="bg-red-100 border-2 border-red-400 text-red-800 p-4 rounded-xl shadow-2xl flex items-start gap-3">
             <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
             <div className="flex-1">
                <h3 className="font-bold text-sm text-red-700 mb-1">Error</h3>
                <p className="text-sm">{error}</p>
             </div>
             <button onClick={() => setError(null)} className="p-1 hover:bg-red-200 rounded-lg transition-colors">
                <XCircle className="w-5 h-5 text-red-500" />
             </button>
          </div>
        </div>
      )}

      {/* Navigation / Header */}
      <nav className="sticky top-0 z-40 bg-white shadow-lg border-b-4 border-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => setAppState('input')}
          >
            <div className="bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-400 p-2 rounded-lg group-hover:rotate-12 transition-transform shadow-lg">
                <Atom className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-800">
                {t.appTitle}
            </span>
          </div>

          <div className="flex items-center gap-3">
             {/* Gallery button - Always Visible */}
             <button
                onClick={() => setAppState('gallery')}
                className={`p-2 rounded-lg transition-all ${appState === 'gallery' ? 'bg-pink-100 text-pink-600' : 'text-gray-600 hover:text-pink-500'}`}
                title={t.gallery}
             >
                <Grid3X3 className="w-5 h-5" />
             </button>
             <div className="h-6 w-px bg-gray-200 mx-1"></div>
             <button
                onClick={() => setLanguage(l => l === 'en' ? 'fr' : 'en')}
                className="text-xs font-bold px-3 py-1 rounded-full border-2 border-pink-400 text-pink-600 hover:bg-pink-50 transition-all"
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
               <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-100 border-2 border-yellow-400 text-yellow-700 text-xs font-bold uppercase tracking-widest mb-6 shadow-md">
                  <Sparkles className="w-4 h-4" />
                  🧪 AI-Powered Science 🔬
               </div>
               <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500">
                  {t.heroTitlePrefix} <span>{t.heroTitleHighlight}</span> {t.heroTitleMiddle} <span>{t.heroTitleSuffix}</span>
               </h1>
               <p className="text-gray-700 text-lg max-w-2xl mx-auto font-medium">
                  {t.heroSubtitle}
               </p>
            </div>

            {/* Controls Toolbar */}
            <div className="flex flex-wrap justify-center gap-3 mb-8">
                {/* Audience Toggle */}
                <div className="bg-pink-100 p-1.5 rounded-full border-2 border-pink-300 flex items-center shadow-md">
                    <button
                        onClick={() => setAudience('young')}
                        className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all ${audience === 'young' ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg scale-105' : 'text-pink-700 hover:bg-pink-200'}`}
                    >
                        <Baby className="w-4 h-4" />
                        <span className="hidden sm:inline">{t.audienceKids}</span>
                    </button>
                    <button
                        onClick={() => setAudience('adult')}
                        className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all ${audience === 'adult' ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg scale-105' : 'text-pink-700 hover:bg-pink-200'}`}
                    >
                        <GraduationCap className="w-4 h-4" />
                        <span className="hidden sm:inline">{t.audienceAdults}</span>
                    </button>
                </div>

                {/* Style Selector */}
                <div className="bg-purple-100 p-1.5 rounded-full border-2 border-purple-300 flex items-center shadow-md">
                    <StyleSelector
                        selectedStyle={artStyle}
                        onSelect={setArtStyle}
                        labels={t}
                    />
                </div>

                {/* Model & Ratio Toggles (Compact) */}
                <div className="bg-cyan-100 p-1.5 rounded-full border-2 border-cyan-300 flex items-center gap-1 shadow-md">
                    <button
                        onClick={() => setImageModel(m => m === IMAGE_MODEL_FLASH ? IMAGE_MODEL_PRO : IMAGE_MODEL_FLASH)}
                        className="p-2 rounded-full hover:bg-cyan-200 text-cyan-700 transition-all"
                        title={imageModel === IMAGE_MODEL_FLASH ? "Fast Mode" : "Pro Mode (High Quality)"}
                    >
                        {imageModel === IMAGE_MODEL_FLASH ? <Zap className="w-4 h-4" /> : <Star className="w-4 h-4 text-yellow-500" />}
                    </button>
                    <div className="w-px h-4 bg-cyan-300"></div>
                    <button
                         onClick={() => {
                             const ratios = [AspectRatio.SQUARE, AspectRatio.PORTRAIT, AspectRatio.LANDSCAPE, AspectRatio.TALL];
                             const nextIdx = (ratios.indexOf(aspectRatio) + 1) % ratios.length;
                             setAspectRatio(ratios[nextIdx]);
                         }}
                         className="p-2 rounded-full hover:bg-cyan-200 text-cyan-700 transition-all"
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
            <div className="bg-white border-4 border-pink-300 rounded-3xl p-3 shadow-xl">
                <div className="flex border-b-2 border-pink-200 mb-2">
                    <button
                        className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${searchMode === 'domain' ? 'bg-gradient-to-r from-pink-400 to-pink-500 text-white' : 'text-gray-600 hover:text-pink-600'}`}
                        onClick={() => setSearchMode('domain')}
                    >
                        <Search className="w-4 h-4" />
                        {t.tabDomain}
                    </button>
                    <button
                        className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${searchMode === 'concept' ? 'bg-gradient-to-r from-pink-400 to-pink-500 text-white' : 'text-gray-600 hover:text-pink-600'}`}
                        onClick={() => setSearchMode('concept')}
                    >
                        <Lightbulb className="w-4 h-4" />
                        {t.tabConcept}
                    </button>
                    <button
                        className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${searchMode === 'process' ? 'bg-gradient-to-r from-pink-400 to-pink-500 text-white' : 'text-gray-600 hover:text-pink-600'}`}
                        onClick={() => setSearchMode('process')}
                    >
                        <ArrowRight className="w-4 h-4" />
                        {t.tabProcess}
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={searchMode === 'domain' ? t.placeholderDomain : searchMode === 'concept' ? t.placeholderConcept : t.placeholderProcess}
                        className="w-full bg-transparent text-gray-800 text-lg p-4 pl-6 pr-40 focus:outline-none placeholder:text-gray-400"
                    />
                    <button
                        type="submit"
                        disabled={!query.trim()}
                        className="absolute right-2 top-2 bottom-2 px-6 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-2 shadow-lg"
                    >
                        {searchMode === 'domain' ? t.btnDiscover : searchMode === 'concept' ? t.btnVisualize : t.btnDiscover}
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </form>
            </div>

            {/* Quick Start Chips */}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
                {['Astrophysics', 'Oceanography', 'Quantum Physics', 'Botany'].map((tag, idx) => {
                    const colors = ['bg-pink-400 border-pink-600 text-white', 'bg-yellow-400 border-yellow-600 text-gray-800', 'bg-green-400 border-green-600 text-white', 'bg-purple-400 border-purple-600 text-white'];
                    return (
                        <button
                            key={tag}
                            onClick={() => { setSearchMode('domain'); setQuery(tag); }}
                            className={`px-5 py-2 rounded-full border-2 ${colors[idx]} text-xs font-bold hover:shadow-lg transition-all transform hover:scale-105 hover:animate-bounce-light`}
                        >
                            {tag}
                        </button>
                    );
                })}
            </div>
          </div>
        )}

        {/* SELECTION STATE */}
        {appState === 'selection' && (
            <div className="animate-fade-in">
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={() => setAppState('input')}
                        className="flex items-center gap-2 text-pink-600 hover:text-pink-700 transition-colors font-bold text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t.backToInput}
                    </button>
                    <h2 className="text-xl font-bold text-gray-800">
                        {t.discoveriesIn} <span className="text-pink-600">{query}</span>
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

        {/* RESULT STATE - Single Image */}
        {appState === 'result' && currentImage && selectedFact && currentSequence.length === 0 && (
            <div className="animate-fade-in max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => setAppState('input')}
                        className="flex items-center gap-2 text-pink-600 hover:text-pink-700 transition-colors font-bold text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t.btnCreateNew}
                    </button>
                    <div className="flex gap-3">
                        {/* Regenerate Button */}
                        <button
                            onClick={() => handleFactSelect(selectedFact)}
                            className="px-4 py-2 rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-bold flex items-center gap-2 transition-colors"
                        >
                            <Terminal className="w-4 h-4 text-purple-500" />
                            {t.btnRegenerate}
                        </button>
                        {/* Save Button */}
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:shadow-lg shadow-pink-500/30 text-sm font-bold flex items-center gap-2 transition-all"
                        >
                            <Rocket className="w-4 h-4" />
                            {t.btnSave}
                        </button>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8 bg-white p-6 rounded-3xl border-2 border-pink-200 shadow-lg">
                    {/* Image Preview */}
                    <div className="relative rounded-2xl overflow-hidden shadow-xl border-4 border-pink-300 bg-gradient-to-br from-gray-50 to-gray-100 group">
                        <img src={currentImage} alt="Generated Infographic" className="w-full h-auto object-contain" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                            <p className="text-white text-xs font-mono opacity-70">Generated by {imageModel}</p>
                        </div>
                    </div>

                    {/* Info Panel */}
                    <div className="flex flex-col gap-6">
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-pink-600 mb-2">{t.basedOn}</h3>
                            <div className="bg-pink-50 p-4 rounded-xl border-2 border-pink-200">
                                <h4 className="font-bold text-gray-800 mb-1">{selectedFact.title}</h4>
                                <p className="text-sm text-gray-700 leading-relaxed">{selectedFact.text}</p>
                            </div>
                        </div>

                        <div className="flex-1">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-2">{t.aiPlan}</h3>
                            <div className="bg-purple-50 p-4 rounded-xl border-2 border-purple-200 h-64 overflow-y-auto text-xs font-mono text-purple-800 scrollbar-hide">
                                {currentPlan}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* RESULT STATE - Process Sequence */}
        {appState === 'result' && currentSequence.length > 0 && processStructure && (
            <div className="animate-fade-in max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => setAppState('input')}
                        className="flex items-center gap-2 text-pink-600 hover:text-pink-700 transition-colors font-bold text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t.btnCreateNew}
                    </button>
                    <div className="flex gap-3">
                        {/* Save Button */}
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:shadow-lg shadow-pink-500/30 text-sm font-bold flex items-center gap-2 transition-all"
                        >
                            <Rocket className="w-4 h-4" />
                            {t.btnSave}
                        </button>
                    </div>
                </div>

                {/* Sequence Header */}
                <div className="mb-8 bg-white p-6 rounded-3xl border-2 border-pink-200 shadow-lg">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">{processStructure.processName}</h2>
                    <p className="text-sm text-gray-600 mb-4">{processStructure.domain} • {t.processSteps}: {processStructure.suggestedSteps}</p>
                    <p className="text-gray-700 leading-relaxed text-sm">{processStructure.overviewText}</p>
                </div>

                {/* Steps Grid */}
                <div className="grid md:grid-cols-3 gap-6">
                    {currentSequence.map((step, idx) => (
                        <div
                            key={idx}
                            className="bg-white rounded-2xl border-2 border-pink-200 shadow-lg overflow-hidden hover:shadow-xl hover:scale-105 transition-all"
                        >
                            {/* Step Badge */}
                            <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between">
                                <span>{step.title}</span>
                                <span className="bg-white/30 px-2 py-1 rounded-full text-xs font-bold">{step.stepNumber}/{currentSequence.length}</span>
                            </div>

                            {/* Image */}
                            <div className="relative w-full aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                                <img
                                    src={step.imageUrl}
                                    alt={`Step ${step.stepNumber}`}
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            {/* Description */}
                            <div className="p-4">
                                <p className="text-xs text-gray-700 line-clamp-3 leading-relaxed">{step.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* GALLERY STATE */}
        {appState === 'gallery' && (
            <div className="animate-fade-in max-w-7xl mx-auto">
                {/* Gallery Header */}
                <div className="flex flex-col gap-6 mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setAppState('input')}
                                className="p-2 bg-pink-100 rounded-lg hover:bg-pink-200 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-pink-600" />
                            </button>
                            <h2 className="text-3xl font-bold text-gray-800">{t.galleryTitle}</h2>
                        </div>
                    </div>

                    {/* Filter Toolbar */}
                    <div className="bg-white border-2 border-pink-200 rounded-2xl p-3 flex flex-col md:flex-row gap-3 shadow-lg">
                        {/* Search Input */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-500" />
                            <input
                                type="text"
                                value={gallerySearchQuery}
                                onChange={(e) => setGallerySearchQuery(e.target.value)}
                                placeholder={t.searchGalleryPlaceholder}
                                className="w-full bg-white border-2 border-pink-200 rounded-xl py-2 pl-9 pr-4 text-sm text-gray-800 focus:outline-none focus:bg-pink-50 focus:border-pink-400 transition-all"
                            />
                        </div>

                        {/* Filter Pills */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <FilterPill
                                label={t.filterLabelDomain}
                                value={filterDomain}
                                options={uniqueDomains}
                                onSelect={setFilterDomain}
                                allLabel={t.filterAll}
                            />
                            <FilterPill
                                label={t.filterLabelAudience}
                                value={filterAudience}
                                options={[
                                    { label: t.audienceKids, value: 'young' },
                                    { label: t.audienceAdults, value: 'adult' }
                                ]}
                                onSelect={setFilterAudience}
                                allLabel={t.filterAll}
                            />
                            <FilterPill
                                label={t.filterLabelStyle}
                                value={filterStyle}
                                options={Object.keys(STYLE_CONFIG)}
                                onSelect={setFilterStyle}
                                allLabel={t.filterAll}
                            />
                            <FilterPill
                                label={t.filterLabelLanguage}
                                value={filterLanguage}
                                options={[
                                    { label: 'English', value: 'en' },
                                    { label: 'Français', value: 'fr' }
                                ]}
                                onSelect={setFilterLanguage}
                                allLabel={t.filterAll}
                            />

                            {hasActiveFilters && (
                                <button
                                    onClick={clearFilters}
                                    className="px-3 py-2 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1"
                                >
                                    <X className="w-3 h-3" />
                                    {t.btnResetFilters}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {isLoadingGallery ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
                    </div>
                ) : filteredGallery.length > 0 ? (
                    <GalleryGrid
                        items={filteredGallery}
                        onItemClick={handleGalleryClick}
                        emptyMessage={t.galleryEmpty}
                    />
                ) : (
                    /* No Results State */
                    <div className="flex flex-col items-center justify-center py-20 text-center border-4 border-dashed border-pink-300 rounded-3xl bg-pink-50">
                        <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mb-4">
                            <Filter className="w-8 h-8 text-pink-500 opacity-70" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">{t.noResultsTitle}</h3>
                        <p className="text-gray-600 max-w-sm">{t.noResultsDesc}</p>
                        <button
                            onClick={clearFilters}
                            className="mt-6 px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:shadow-lg text-white rounded-xl text-sm font-bold transition-all"
                        >
                            {t.btnResetFilters}
                        </button>
                    </div>
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
            db.transact(db.tx.infographics[updatedItem.id].update({
                imageUrl: updatedItem.imageUrl
            }));
        }}
      />
    </div>
  );
};

export default App;

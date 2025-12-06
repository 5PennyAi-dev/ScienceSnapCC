
import React, { useState, useEffect, useMemo } from 'react';
import { AppState, ScientificFact, InfographicItem, Language, AIStudio, Audience, ImageModelType, AspectRatio, ArtStyle, InfographicStep, SearchMode, FactResearchData, PerplexityResearchData, Folder } from './types';
import { generateScientificFacts, generateInfographicPlan, generateInfographicImage, generateFactFromConcept, generateProcessStructure, generateStepExplanation, generateStepInfographicPlan, generateConceptSuggestions, generateProcessSuggestions, generateVisualStyleDNA, ConceptSuggestion, ProcessSuggestion } from './services/geminiService';
import { researchFactForInfographic, researchProcessForEducation } from './services/perplexityService';
import { uploadImageToStorage } from './services/imageUploadService';
import { FactCard } from './components/FactCard';
import { GalleryGrid } from './components/GalleryGrid';
import { ImageModal } from './components/ImageModal';
import { StyleSelector } from './components/StyleSelector';
import { FilterPill } from './components/FilterPill';
import { DomainSelector } from './components/DomainSelector';
import { ConceptSelector } from './components/ConceptSelector';
import { ProcessSelector } from './components/ProcessSelector';
import { FolderList } from './components/FolderList';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Atom, ArrowRight, BookOpen, Loader2, Sparkles, Image as ImageIcon, ArrowLeft, Key, Lightbulb, Filter, Search, Grid3X3, Terminal, Rocket, Star, GraduationCap, Baby, Zap, Square, RectangleVertical, RectangleHorizontal, Smartphone, AlertCircle, XCircle, X, Palette, FileDigit, Box, Tent, Droplet, Cpu, Coffee } from 'lucide-react';
import { db } from './db';
import { tx, id } from "@instantdb/react";
import { getTranslation } from './translations';
import { IMAGE_MODEL_FLASH, IMAGE_MODEL_PRO, STYLE_CONFIG } from './constants';

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('fr');
  const [audience, setAudience] = useState<Audience>('young');
  const [imageModel, setImageModel] = useState<ImageModelType>(IMAGE_MODEL_PRO);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.INSTAGRAM);
  const [artStyle, setArtStyle] = useState<ArtStyle>('DEFAULT');
  const [appState, setAppState] = useState<AppState>('dashboard');
  
  // Search State for Generation
  const [searchMode, setSearchMode] = useState<SearchMode>('domain');
  const [query, setQuery] = useState('');

  const [facts, setFacts] = useState<ScientificFact[]>([]);
  const [selectedFact, setSelectedFact] = useState<ScientificFact | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [currentPlan, setCurrentPlan] = useState('');
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentResearch, setCurrentResearch] = useState<FactResearchData | null>(null);

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
  const [currentProcessResearch, setCurrentProcessResearch] = useState<PerplexityResearchData | null>(null);
  const [currentStyleDNA, setCurrentStyleDNA] = useState<any>(null);
  const [currentSeed, setCurrentSeed] = useState<number>(0);

  // Concept Suggestions State (for Explain Concept mode)
  const [conceptSuggestions, setConceptSuggestions] = useState<ConceptSuggestion[]>([]);
  const [conceptSuggestionsLoading, setConceptSuggestionsLoading] = useState(false);
  const [conceptSuggestionsCached, setConceptSuggestionsCached] = useState(false);

  // Process Suggestions State (for Process/Sequence mode)
  const [processSuggestions, setProcessSuggestions] = useState<ProcessSuggestion[]>([]);
  const [processSuggestionsLoading, setProcessSuggestionsLoading] = useState(false);
  const [processSuggestionsCached, setProcessSuggestionsCached] = useState(false);

  // Error State
  const [error, setError] = useState<string | null>(null);

  // Gallery Filter State
  const [filterDomain, setFilterDomain] = useState<string>('All');
  const [filterAudience, setFilterAudience] = useState<string>('All');
  const [filterStyle, setFilterStyle] = useState<string>('All');
  const [filterLanguage, setFilterLanguage] = useState<string>('All');
  const [gallerySearchQuery, setGallerySearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  
  // Modal State
  const [selectedGalleryItem, setSelectedGalleryItem] = useState<InfographicItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // API Key State
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isCheckingKey, setIsCheckingKey] = useState(true);

  const t = getTranslation(language);

  // Database Query
  const { isLoading: isLoadingGallery, error: galleryError, data } = db.useQuery({ 
    infographics: {},
    folders: {}
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
          language: item.language,
          folderId: item.folderId
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
          language: item.language,
          folderId: item.folderId
        } as InfographicItem;
      }
    }).sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [data]);

  // Derived state for folders
  const folders: Folder[] = useMemo(() => {
    if (!data?.folders) return [];
    return Object.values(data.folders).sort((a: any, b: any) => b.timestamp - a.timestamp) as Folder[];
  }, [data]);

  // Derived state for domains
  const uniqueDomains = useMemo(() => {
    const domains = new Set(gallery.map(item => item.fact.domain));
    return Array.from(domains).sort();
  }, [gallery]);

  // Derived state for filtered items
  const filteredGallery = useMemo(() => {
    console.log('📊 filteredGallery recalculating - gallery count:', gallery.length);
    const result = gallery.filter(item => {
        const matchDomain = filterDomain === 'All' || item.fact.domain === filterDomain;
        const matchAudience = filterAudience === 'All' || item.audience === filterAudience;
        const matchStyle = filterStyle === 'All' || item.style === filterStyle;
        const matchLanguage = filterLanguage === 'All' || item.language === filterLanguage;
        
        // Search by Title or Domain
        const searchLower = gallerySearchQuery.toLowerCase().trim();
        const matchSearch = searchLower === '' || 
                            item.fact.title.toLowerCase().includes(searchLower) ||
                            item.fact.domain.toLowerCase().includes(searchLower);

        const matchFolder = selectedFolderId === null || item.folderId === selectedFolderId;

        return matchDomain && matchAudience && matchStyle && matchLanguage && matchSearch && matchFolder;
    });
    console.log('📊 filteredGallery result count:', result.length);
    return result;
  }, [gallery, filterDomain, filterAudience, filterStyle, filterLanguage, gallerySearchQuery, selectedFolderId]);

  const hasActiveFilters = filterDomain !== 'All' || filterAudience !== 'All' || filterStyle !== 'All' || filterLanguage !== 'All' || gallerySearchQuery !== '';

  const clearFilters = () => {
      setFilterDomain('All');
      setFilterAudience('All');
      setFilterStyle('All');
      setFilterLanguage('All');
      setGallerySearchQuery('');
      setCurrentPage(1);
      setSelectedFolderId(null);
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterDomain, filterAudience, filterStyle, filterLanguage, gallerySearchQuery, selectedFolderId]);

  // Monitor gallery query errors
  useEffect(() => {
    if (galleryError) {
      console.error("Gallery query error:", galleryError);
      setError(`Database error: ${galleryError}`);
    }
  }, [galleryError]);

  // Fetch concept suggestions when switching to concept mode
  useEffect(() => {
    if (searchMode === 'concept' && !conceptSuggestionsCached && !conceptSuggestionsLoading) {
      const fetchSuggestions = async () => {
        setConceptSuggestionsLoading(true);
        try {
          const suggestions = await generateConceptSuggestions(language, audience);
          setConceptSuggestions(suggestions);
          setConceptSuggestionsCached(true);
        } catch (err) {
          console.error("Failed to fetch concept suggestions:", err);
          // Silently fail - suggestions are optional
        } finally {
          setConceptSuggestionsLoading(false);
        }
      };
      fetchSuggestions();
    }
  }, [searchMode, conceptSuggestionsCached, conceptSuggestionsLoading, language, audience]);

  // Fetch process suggestions when switching to process mode
  useEffect(() => {
    if (searchMode === 'process' && !processSuggestionsCached && !processSuggestionsLoading) {
      const fetchSuggestions = async () => {
        setProcessSuggestionsLoading(true);
        try {
          const suggestions = await generateProcessSuggestions(language, audience);
          setProcessSuggestions(suggestions);
          setProcessSuggestionsCached(true);
        } catch (err) {
          console.error("Failed to fetch process suggestions:", err);
          // Silently fail - suggestions are optional
        } finally {
          setProcessSuggestionsLoading(false);
        }
      };
      fetchSuggestions();
    }
  }, [searchMode, processSuggestionsCached, processSuggestionsLoading, language, audience]);

  // Progressive Loading Messages
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (loading) {
      let messages: string[] = [];
      
      if (appState === 'generating') {
        messages = t.loadingMessages || [];
      } else {
        // For 'input', 'planning', 'selection' etc. (Research phase)
        messages = t.loadingMessagesResearch || [];
      }

      if (messages.length > 0) {
        let msgIndex = 0;
        interval = setInterval(() => {
          setLoadingMessage(messages[msgIndex % messages.length]);
          msgIndex++;
        }, 3000);
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading, appState, t]);

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

      // Step 1b: Research the process for educational context
      console.log("[Process] Researching process for enhanced context...");
      setLoadingMessage(`${t.loadingResearching || "Researching"} (${query})...`);
      const processResearch = await researchProcessForEducation(query, audience, language);
      setCurrentProcessResearch(processResearch);
      console.log("[Process] Research complete", processResearch.error ? "(with errors)" : "(successful)");

      // Step 1c: Generate Style DNA for visual consistency
      console.log("[Process] Generating Style DNA for visual consistency...");
      setLoadingMessage("Planning visual style...");
      let workingStyleDNA: any = null;
      try {
        workingStyleDNA = await generateVisualStyleDNA(
          structure.processName,
          structure.domain,
          structure.stepTitles.length,
          language,
          audience,
          artStyle
        );
        console.log("[Process] Style DNA generated:", JSON.stringify(workingStyleDNA, null, 2));
        setCurrentStyleDNA(workingStyleDNA);
      } catch (dnaError) {
        console.warn("[Process] Style DNA generation failed, will use legacy consistency system:", dnaError);
        workingStyleDNA = null;
        setCurrentStyleDNA(null);
      }

      // Step 1d: Generate fixed seed for reproducible image generation
      const workingSeed = Math.floor(Math.random() * 1000000);
      setCurrentSeed(workingSeed);
      console.log(`[Process] Generated fixed seed: ${workingSeed}`);

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
          console.log(`[Step ${stepNum}] Generating visual plan with Style DNA...`);
          const keyEventsStr = stepExplanation.keyEvents.join(', ');
          const stepPlan = await generateStepInfographicPlan(
            structure.processName,
            stepNum,
            totalSteps,
            stepExplanation.title,
            stepExplanation.description,
            keyEventsStr,
            structure.domain,
            workingStyleDNA,
            steps,
            language,
            audience,
            artStyle,
            processResearch || undefined
          );
          console.log(`[Step ${stepNum}] ✓ Visual plan generated (${stepPlan.length} chars)`);

          setLoadingMessage(`${t.loadingRenderingStep} ${stepNum}/${totalSteps}...`);

          // 2c: Render the image (use longer timeout for process sequences - 2 minutes per step)
          console.log(`[Step ${stepNum}] Rendering image with seed ${workingSeed} and 120s timeout...`);
          const stepImage = await generateInfographicImage(stepPlan, imageModel, aspectRatio, artStyle, 120000, workingSeed);
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
      setCurrentProcessResearch(null);
      setCurrentStyleDNA(null);
      setCurrentSeed(0);
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

    // Clear any previous process sequence state to ensure correct result rendering
    setCurrentSequence([]);
    setProcessStructure(null);
    setCurrentResearch(null);
    setCurrentProcessResearch(null);

    try {
      // Step 1: Research the fact using Perplexity (graceful fallback if API not available)
      setLoadingMessage(t.loadingResearching || "Researching...");
      const research = await researchFactForInfographic(fact.title, fact.text, fact.domain, audience, language);
      setCurrentResearch(research);

      // Format research into context string for plan generation
      let researchContext = '';
      if (research && !research.error) {
        const parts: string[] = [];
        if (research.scientificDetails.length > 0) {
          parts.push(`Scientific details to include:\n- ${research.scientificDetails.join('\n- ')}`);
        }
        if (research.visualMetaphors.length > 0) {
          parts.push(`Visual metaphors/representations:\n- ${research.visualMetaphors.join('\n- ')}`);
        }
        if (research.analogies.length > 0) {
          parts.push(`Helpful analogies:\n- ${research.analogies.join('\n- ')}`);
        }
        if (research.misconceptions.length > 0) {
          parts.push(`Common misconceptions to AVOID:\n- ${research.misconceptions.join('\n- ')}`);
        }
        researchContext = parts.join('\n\n');
      }

      // Step 2: Generate the plan with research context
      setLoadingMessage(t.loadingPlanning);
      const plan = await generateInfographicPlan(fact, language, audience, artStyle, researchContext || undefined);
      setCurrentPlan(plan);

      // Step 3: Generate the image
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

        // Include Perplexity research data if available
        if (currentProcessResearch) {
          (dataToSave as any).processResearch = currentProcessResearch;
        }

        // Include Style DNA and seed for consistency tracking and potential regeneration
        if (currentStyleDNA) {
          (dataToSave as any).styleDNA = currentStyleDNA;
        }
        if (currentSeed) {
          (dataToSave as any).seed = currentSeed;
        }

        console.log('Sequence data to save:', dataToSave);

        await db.transact(db.tx.infographics[newItemId].update(dataToSave));
        console.log(`✅ Successfully saved process sequence ${newItemId} to database`);

      } else if (selectedFact && currentImage && currentPlan) {
        // Single image save: Existing logic
        const imageUrlToSave = await uploadImageToStorage(currentImage, `${newItemId}.png`);

        const isUrl = imageUrlToSave.startsWith('http');
        console.log(`Saving to DB. Source: ${isUrl ? 'ImageKit Cloud' : 'Local Base64'}`);

        const dataToSave: any = {
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

        // Include Perplexity research data if available
        if (currentResearch) {
          dataToSave.research = currentResearch;
        }

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

  const handleCreateFolder = async (name: string) => {
    const newFolderId = id();
    await db.transact(db.tx.folders[newFolderId].update({
      id: newFolderId,
      name,
      timestamp: Date.now()
    }));
  };

  const handleDeleteFolder = async (folderId: string) => {
    await db.transact(db.tx.folders[folderId].delete());
    if (selectedFolderId === folderId) {
      setSelectedFolderId(null);
    }
  };

  const handleDropItem = async (folderId: string, itemId: string) => {
    await db.transact(db.tx.infographics[itemId].update({
      folderId
    }));
    setDraggedItemId(null);
  };

  const handleDragStart = (itemId: string) => {
    // setDraggedItemId(itemId); // Disable to prevent re-renders causing UI issues
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
  };

  const handleGalleryClick = (item: InfographicItem) => {
    setSelectedGalleryItem(item);
    setIsModalOpen(true);
  };

  // Renders

  if (isCheckingKey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (!hasApiKey) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-xl border-4 border-cyan-400 max-w-md shadow-2xl">
            <Key className="w-12 h-12 text-cyan-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">API Key Required</h1>
            <p className="text-gray-600 mb-6">
                To use ScienceSnap's premium image generation features (Google Veo/Imagen),
                please select a valid Google Cloud project with billing enabled.
            </p>
            <button
                onClick={handleSelectKey}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:shadow-lg text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 mx-auto"
            >
                Select API Key
            </button>
            <p className="mt-4 text-xs text-gray-500">
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-cyan-500">
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
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/30 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
         </div>

         <div className="z-10 flex flex-col items-center text-center p-6">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full blur-xl opacity-60 animate-spin-slow"></div>
                <div className="relative bg-white p-6 rounded-full border-4 border-cyan-400 shadow-xl">
                    {appState === 'generating' ? <Sparkles className="w-12 h-12 text-cyan-500 animate-bounce-light" /> : <Atom className="w-12 h-12 text-cyan-500 animate-spin-slow" />}
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
                        ? 'bg-teal-400 scale-100'
                        : idx === currentStepIndex
                          ? 'bg-cyan-400 animate-pulse scale-125'
                          : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>
            )}


         </div>
      </div>
    );
  }

  return (
    <Layout appState={appState} setAppState={setAppState}>
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

      {/* DASHBOARD STATE */}
      {appState === 'dashboard' && (
        <Dashboard onSelectMode={(mode) => {
          setSearchMode(mode);
          setAppState('input');
        }} />
      )}

      {/* INPUT MODE */}
      {appState === 'input' && (
        <div className="flex gap-6 max-w-7xl mx-auto animate-fade-in pt-8">
          
          {/* Left Sidebar - Controls */}
          <div className="w-72 flex-shrink-0 space-y-4">
              <button 
                onClick={() => setAppState('dashboard')}
                className="w-full p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-bold">Retour</span>
              </button>

              {/* Audience Toggle */}
              <div className="glass-panel p-3 rounded-2xl border border-white/10">
                  <p className="text-xs font-bold text-science-cyan mb-3 px-1">AUDIENCE</p>
                  <div className="space-y-2">
                      <button
                          onClick={() => setAudience('young')}
                          className={`w-full px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 transition-all ${audience === 'young' ? 'bg-science-blue text-white shadow-lg shadow-science-blue/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                      >
                          <Baby className="w-5 h-5" />
                          <span>{t.audienceKids}</span>
                      </button>
                      <button
                          onClick={() => setAudience('adult')}
                          className={`w-full px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 transition-all ${audience === 'adult' ? 'bg-science-blue text-white shadow-lg shadow-science-blue/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                      >
                          <GraduationCap className="w-5 h-5" />
                          <span>{t.audienceAdults}</span>
                      </button>
                  </div>
              </div>

              {/* Style Selector Pills */}
              <div className="glass-panel p-3 rounded-2xl border border-white/10">
                  <p className="text-xs font-bold text-science-cyan mb-3 px-1">STYLE ARTISTIQUE</p>
                  <div className="grid grid-cols-2 gap-2">
                      <button
                          onClick={() => setArtStyle('DEFAULT')}
                          className={`p-2 rounded-xl transition-all flex flex-col items-center gap-1 text-xs ${artStyle === 'DEFAULT' ? 'bg-indigo-500/30 text-indigo-300 shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-white/10 hover:text-indigo-300'}`}
                      >
                          <Palette className="w-5 h-5" />
                          <span className="font-bold">Default</span>
                      </button>
                      <button
                          onClick={() => setArtStyle('PIXEL')}
                          className={`p-2 rounded-xl transition-all flex flex-col items-center gap-1 text-xs ${artStyle === 'PIXEL' ? 'bg-green-500/30 text-green-300 shadow-lg shadow-green-500/20' : 'text-slate-400 hover:bg-white/10 hover:text-green-300'}`}
                      >
                          <FileDigit className="w-5 h-5" />
                          <span className="font-bold">Pixel</span>
                      </button>
                      <button
                          onClick={() => setArtStyle('CLAY')}
                          className={`p-2 rounded-xl transition-all flex flex-col items-center gap-1 text-xs ${artStyle === 'CLAY' ? 'bg-orange-500/30 text-orange-300 shadow-lg shadow-orange-500/20' : 'text-slate-400 hover:bg-white/10 hover:text-orange-300'}`}
                      >
                          <Box className="w-5 h-5" />
                          <span className="font-bold">Clay</span>
                      </button>
                      <button
                          onClick={() => setArtStyle('ORIGAMI')}
                          className={`p-2 rounded-xl transition-all flex flex-col items-center gap-1 text-xs ${artStyle === 'ORIGAMI' ? 'bg-yellow-500/30 text-yellow-300 shadow-lg shadow-yellow-500/20' : 'text-slate-400 hover:bg-white/10 hover:text-yellow-300'}`}
                      >
                          <Tent className="w-5 h-5" />
                          <span className="font-bold">Origami</span>
                      </button>
                      <button
                          onClick={() => setArtStyle('WATERCOLOR')}
                          className={`p-2 rounded-xl transition-all flex flex-col items-center gap-1 text-xs ${artStyle === 'WATERCOLOR' ? 'bg-blue-500/30 text-blue-300 shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-white/10 hover:text-blue-300'}`}
                      >
                          <Droplet className="w-5 h-5" />
                          <span className="font-bold">Watercolor</span>
                      </button>
                      <button
                          onClick={() => setArtStyle('CYBERPUNK')}
                          className={`p-2 rounded-xl transition-all flex flex-col items-center gap-1 text-xs ${artStyle === 'CYBERPUNK' ? 'bg-cyan-500/30 text-cyan-300 shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:bg-white/10 hover:text-cyan-300'}`}
                      >
                          <Cpu className="w-5 h-5" />
                          <span className="font-bold">Cyberpunk</span>
                      </button>
                      <button
                          onClick={() => setArtStyle('VINTAGE')}
                          className={`p-2 rounded-xl transition-all flex flex-col items-center gap-1 text-xs ${artStyle === 'VINTAGE' ? 'bg-amber-500/30 text-amber-300 shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:bg-white/10 hover:text-amber-300'}`}
                      >
                          <Coffee className="w-5 h-5" />
                          <span className="font-bold">Vintage</span>
                      </button>
                      <button
                          onClick={() => setArtStyle('NEON')}
                          className={`p-2 rounded-xl transition-all flex flex-col items-center gap-1 text-xs ${artStyle === 'NEON' ? 'bg-purple-500/30 text-purple-300 shadow-lg shadow-purple-500/20' : 'text-slate-400 hover:bg-white/10 hover:text-purple-300'}`}
                      >
                          <Zap className="w-5 h-5" />
                          <span className="font-bold">Neon</span>
                      </button>
                      <button
                          onClick={() => setArtStyle('MANGA')}
                          className={`p-2 rounded-xl transition-all flex flex-col items-center gap-1 text-xs ${artStyle === 'MANGA' ? 'bg-red-500/30 text-red-300 shadow-lg shadow-red-500/20' : 'text-slate-400 hover:bg-white/10 hover:text-red-300'}`}
                      >
                          <BookOpen className="w-5 h-5" />
                          <span className="font-bold">Manga</span>
                      </button>
                      <button
                          onClick={() => setArtStyle('GHIBLI')}
                          className={`p-2 rounded-xl transition-all flex flex-col items-center gap-1 text-xs ${artStyle === 'GHIBLI' ? 'bg-pink-500/30 text-pink-300 shadow-lg shadow-pink-500/20' : 'text-slate-400 hover:bg-white/10 hover:text-pink-300'}`}
                      >
                          <Sparkles className="w-5 h-5" />
                          <span className="font-bold">Ghibli</span>
                      </button>
                  </div>
              </div>

              {/* Ratio Selector */}
              <div className="glass-panel p-3 rounded-2xl border border-white/10">
                  <p className="text-xs font-bold text-science-cyan mb-3 px-1">FORMAT</p>
                  <div className="space-y-2">
                      <button
                          onClick={() => setAspectRatio(AspectRatio.SQUARE)}
                          className={`w-full p-3 rounded-xl transition-all flex items-center gap-3 text-sm font-bold ${aspectRatio === AspectRatio.SQUARE ? 'bg-science-cyan text-white shadow-lg shadow-science-cyan/20' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                      >
                          <Square className="w-4 h-4" />
                          <span>{t.ratioSquare}</span>
                      </button>
                      <button
                          onClick={() => setAspectRatio(AspectRatio.PORTRAIT)}
                          className={`w-full p-3 rounded-xl transition-all flex items-center gap-3 text-sm font-bold ${aspectRatio === AspectRatio.PORTRAIT ? 'bg-science-cyan text-white shadow-lg shadow-science-cyan/20' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                      >
                          <RectangleVertical className="w-4 h-4" />
                          <span>{t.ratioPortrait}</span>
                      </button>
                      <button
                          onClick={() => setAspectRatio(AspectRatio.INSTAGRAM)}
                          className={`w-full p-3 rounded-xl transition-all flex items-center gap-3 text-sm font-bold ${aspectRatio === AspectRatio.INSTAGRAM ? 'bg-science-cyan text-white shadow-lg shadow-science-cyan/20' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                      >
                          <RectangleVertical className="w-4 h-4 opacity-75" />
                          <span>4:5 (Instagram)</span>
                      </button>
                      <button
                          onClick={() => setAspectRatio(AspectRatio.LANDSCAPE)}
                          className={`w-full p-3 rounded-xl transition-all flex items-center gap-3 text-sm font-bold ${aspectRatio === AspectRatio.LANDSCAPE ? 'bg-science-cyan text-white shadow-lg shadow-science-cyan/20' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                      >
                          <RectangleHorizontal className="w-4 h-4" />
                          <span>{t.ratioLandscape}</span>
                      </button>
                      <button
                          onClick={() => setAspectRatio(AspectRatio.TALL)}
                          className={`w-full p-3 rounded-xl transition-all flex items-center gap-3 text-sm font-bold ${aspectRatio === AspectRatio.TALL ? 'bg-science-cyan text-white shadow-lg shadow-science-cyan/20' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                      >
                          <Smartphone className="w-4 h-4" />
                          <span>{t.ratioTall}</span>
                      </button>
                  </div>
              </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            <div className="mb-8">
              <h2 className="text-2xl font-display font-bold text-white mb-2">
                {searchMode === 'domain' ? 'Explore Domain' : searchMode === 'concept' ? 'Explain Concept' : 'Process Sequence'}
              </h2>
              <p className="text-slate-400 text-sm">
                {searchMode === 'domain' ? 'Discover facts across scientific fields' : searchMode === 'concept' ? 'Deep dive into specific concepts' : 'Visualize step-by-step processes'}
              </p>
            </div>

          {/* Search Box */}
          <div className="glass-panel rounded-3xl p-6 shadow-2xl relative overflow-visible">
              {/* Domain Selector - only visible in domain mode */}
              {searchMode === 'domain' && (
                  <div className="mb-6">
                      <DomainSelector
                          onSelect={(domain) => setQuery(domain)}
                          language={language}
                      />
                  </div>
              )}

              {/* Concept Selector - only visible in concept mode */}
              {searchMode === 'concept' && (
                  <div className="mb-6">
                      <ConceptSelector
                          onSelect={(concept) => setQuery(concept)}
                          language={language}
                          suggestions={conceptSuggestions}
                          isLoading={conceptSuggestionsLoading}
                      />
                  </div>
              )}

              {/* Process Selector - only visible in process mode */}
              {searchMode === 'process' && (
                  <div className="mb-6">
                      <ProcessSelector
                          onSelect={(process) => setQuery(process)}
                          language={language}
                          suggestions={processSuggestions}
                          isLoading={processSuggestionsLoading}
                      />
                  </div>
              )}

              <form onSubmit={handleSubmit} className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-science-blue/20 to-science-purple/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={searchMode === 'domain' ? t.placeholderDomain : searchMode === 'concept' ? t.placeholderConcept : t.placeholderProcess}
                      className="w-full bg-slate-900/80 border border-white/10 text-white text-lg p-5 pl-6 pr-40 rounded-xl focus:outline-none focus:border-science-cyan/50 focus:ring-1 focus:ring-science-cyan/50 placeholder:text-slate-500 transition-all relative z-10 shadow-inner"
                  />
                  <button
                      type="submit"
                      disabled={!query.trim()}
                      className="absolute right-2 top-2 bottom-2 px-6 bg-gradient-to-r from-science-cyan to-science-blue text-white rounded-lg font-bold hover:shadow-lg hover:shadow-science-cyan/20 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-2 z-20"
                  >
                      {searchMode === 'domain' ? t.btnDiscover : searchMode === 'concept' ? t.btnVisualize : t.btnDiscover}
                      <ArrowRight className="w-4 h-4" />
                  </button>
              </form>
          </div>
          </div>
        </div>
      )}

        {/* SELECTION STATE */}
        {appState === 'selection' && (
            <div className="animate-fade-in">
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={() => setAppState('input')}
                        className="flex items-center gap-2 text-cyan-600 hover:text-cyan-700 transition-colors font-bold text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t.backToInput}
                    </button>
                    <h2 className="text-xl font-bold text-gray-800">
                        {t.discoveriesIn} <span className="text-cyan-600">{query}</span>
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
                        className="flex items-center gap-2 text-cyan-600 hover:text-cyan-700 transition-colors font-bold text-sm"
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
                            <Terminal className="w-4 h-4 text-blue-500" />
                            {t.btnRegenerate}
                        </button>
                        {/* Save Button */}
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg shadow-cyan-500/30 text-sm font-bold flex items-center gap-2 transition-all"
                        >
                            <Rocket className="w-4 h-4" />
                            {t.btnSave}
                        </button>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8 bg-white p-6 rounded-xl border-2 border-cyan-200 shadow-lg">
                    {/* Image Preview */}
                    <div className="relative rounded-xl overflow-hidden shadow-xl border-4 border-cyan-300 bg-gradient-to-br from-gray-50 to-gray-100 group">
                        <img src={currentImage} alt="Generated Infographic" className="w-full h-auto object-contain" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                            <p className="text-white text-xs font-mono opacity-70">Generated by {imageModel}</p>
                        </div>
                    </div>

                    {/* Info Panel */}
                    <div className="flex flex-col gap-6">
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-600 mb-2">{t.basedOn}</h3>
                            <div className="bg-cyan-50 p-4 rounded-xl border-2 border-cyan-200">
                                <h4 className="font-bold text-gray-800 mb-1">{selectedFact.title}</h4>
                                <p className="text-sm text-gray-700 leading-relaxed">{selectedFact.text}</p>
                            </div>
                        </div>

                        <div className="flex-1">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">{t.aiPlan}</h3>
                            <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-200 h-64 overflow-y-auto text-xs font-mono text-blue-800 scrollbar-hide">
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
                        className="flex items-center gap-2 text-cyan-600 hover:text-cyan-700 transition-colors font-bold text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t.btnCreateNew}
                    </button>
                    <div className="flex gap-3">
                        {/* Save Button */}
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg shadow-cyan-500/30 text-sm font-bold flex items-center gap-2 transition-all"
                        >
                            <Rocket className="w-4 h-4" />
                            {t.btnSave}
                        </button>
                    </div>
                </div>

                {/* Sequence Header */}
                <div className="mb-8 bg-white p-6 rounded-xl border-2 border-cyan-200 shadow-lg">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">{processStructure.processName}</h2>
                    <p className="text-sm text-gray-600 mb-4">{processStructure.domain} • {t.processSteps}: {processStructure.suggestedSteps}</p>
                    <p className="text-gray-700 leading-relaxed text-sm">{processStructure.overviewText}</p>
                </div>

                {/* Steps Grid */}
                <div className="grid md:grid-cols-3 gap-6">
                    {currentSequence.map((step, idx) => (
                        <div
                            key={idx}
                            className="bg-white rounded-xl border-2 border-cyan-200 shadow-lg overflow-hidden hover:shadow-xl hover:scale-105 transition-all"
                        >
                            {/* Step Badge */}
                            <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between">
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
            <div className="animate-fade-in max-w-7xl mx-auto flex gap-6">
                {/* Left Sidebar - Folders */}
                <div className="w-64 flex-shrink-0">
                    <div className="mb-6">
                        <button
                            onClick={() => setAppState('input')}
                            className="flex items-center gap-2 text-slate-500 hover:text-cyan-600 transition-colors mb-4"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="font-bold text-sm">Retour</span>
                        </button>
                        <h2 className="text-2xl font-bold text-gray-800">{t.galleryTitle}</h2>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
                        <FolderList
                            folders={folders}
                            selectedFolderId={selectedFolderId}
                            onSelectFolder={setSelectedFolderId}
                            onCreateFolder={handleCreateFolder}
                            onDeleteFolder={handleDeleteFolder}
                            onDropItem={handleDropItem}
                            draggedItemId={draggedItemId}
                        />
                    </div>
                </div>

                {/* Main Content - Grid & Filters */}
                <div className="flex-1">
                    {/* Filter Toolbar */}
                    <div className="bg-white border-2 border-cyan-200 rounded-xl p-3 flex flex-col md:flex-row gap-3 shadow-lg mb-6">
                        {/* Search Input */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500" />
                            <input
                                type="text"
                                value={gallerySearchQuery}
                                onChange={(e) => setGallerySearchQuery(e.target.value)}
                                placeholder={t.searchGalleryPlaceholder}
                                className="w-full bg-white border-2 border-cyan-200 rounded-xl py-2 pl-9 pr-4 text-sm text-gray-800 focus:outline-none focus:bg-cyan-50 focus:border-cyan-400 transition-all"
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

                    {isLoadingGallery ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                        </div>
                    ) : filteredGallery.length > 0 ? (
                        <>
                            <GalleryGrid
                                items={filteredGallery.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)}
                                onItemClick={handleGalleryClick}
                                emptyMessage={t.galleryEmpty}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                            />
                            
                            {/* Pagination Controls */}
                            {filteredGallery.length > ITEMS_PER_PAGE && (
                                <div className="flex items-center justify-center gap-2 mt-8">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-4 py-2 rounded-xl bg-white border-2 border-cyan-300 text-cyan-700 font-bold hover:bg-cyan-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        ← Précédent
                                    </button>
                                    
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: Math.ceil(filteredGallery.length / ITEMS_PER_PAGE) }, (_, i) => i + 1).map(pageNum => (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${
                                                    currentPage === pageNum
                                                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg'
                                                        : 'bg-white border-2 border-cyan-200 text-cyan-700 hover:bg-cyan-50'
                                                }`}
                                            >
                                                {pageNum}
                                            </button>
                                        ))}
                                    </div>
                                    
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredGallery.length / ITEMS_PER_PAGE), p + 1))}
                                        disabled={currentPage === Math.ceil(filteredGallery.length / ITEMS_PER_PAGE)}
                                        className="px-4 py-2 rounded-xl bg-white border-2 border-cyan-300 text-cyan-700 font-bold hover:bg-cyan-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        Suivant →
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        /* No Results State */
                        <div className="flex flex-col items-center justify-center py-20 text-center border-4 border-dashed border-cyan-300 rounded-xl bg-cyan-50">
                            <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mb-4">
                                <Filter className="w-8 h-8 text-cyan-500 opacity-70" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">{t.noResultsTitle}</h3>
                            <p className="text-gray-600 max-w-sm">{t.noResultsDesc}</p>
                            <button
                                onClick={clearFilters}
                                className="mt-6 px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:shadow-lg text-white rounded-xl text-sm font-bold transition-all"
                            >
                                {t.btnResetFilters}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )}



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
    </Layout>
  );
};

export default App;

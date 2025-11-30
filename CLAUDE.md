# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ScienceSnap is an AI-powered web application that generates educational infographics about scientific concepts. It combines Google's Gemini API (for text generation and image synthesis) with InstantDB for persistent storage. The app supports multilingual content (English/French) and targets different audiences (young children and adults).

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (runs on http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Development Workflow Instructions

1. **First think through the problem, read the codebase for relevant files, and write a plan to `tasks/todo.md`.**

2. **The plan should have a list of todo items that you can check off as you complete them.**

3. **Before you begin working, check in with me and I will verify the plan.**

4. **Then, begin working on the todo items, marking them as complete as you go.**

5. **Please, every step of the way, just give me a high-level explanation of what changes you made.**

6. **Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.**

7. **Finally, add a review section to the `todo.md` file with a summary of the changes you made and any other relevant information.**

8. **DO NOT BE LAZY. NEVER BE LAZY. IF THERE IS A BUG FIND THE ROOT CAUSE AND FIX IT. NO TEMPORARY FIXES. YOU ARE A SENIOR DEVELOPER. NEVER BE LAZY.**

9. **MAKE ALL FIXES AND CODE CHANGES AS SIMPLE AS HUMANLY POSSIBLE. THEY SHOULD ONLY IMPACT NECESSARY CODE RELEVANT TO THE TASK AND NOTHING ELSE. IT SHOULD IMPACT AS LITTLE CODE AS POSSIBLE. YOUR GOAL IS TO NOT INTRODUCE ANY BUGS. IT'S ALL ABOUT SIMPLICITY.**

## Architecture Overview

### Core Technology Stack
- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **AI Services**: Google GenAI SDK (gemini-2.5-flash for text, gemini-3-pro-image-preview for image generation), Perplexity API (sonar-pro for web research)
- **Database**: InstantDB (real-time persistence with reactive queries)
- **UI Icons**: Lucide React

### High-Level Flow

The application has three main discovery modes:

1. **Explore Domain**: User selects a scientific field from a dropdown (12 predefined domains) or types a custom domain → Gemini generates 3 interesting facts in that domain
2. **Explain Concept**: User enters a specific concept (e.g., "Black Holes") → Gemini provides a deep-dive explanation
3. **Process/Sequence**: User enters a process (e.g., "Photosynthesis", "Water Cycle") → Gemini generates 4-6 sequential steps with visualizations

#### Single Fact/Concept Pipeline
For facts and concepts, the generation pipeline follows these steps:
1. **Fact Generation** (gemini-2.5-flash): Creates scientifically accurate, age-appropriate content
2. **Research Enhancement** (Perplexity sonar-pro, Explore Domain only): Researches the selected fact for scientific details, visual metaphors, analogies, and common misconceptions
3. **Visual Planning** (gemini-2.5-flash): Generates a detailed design specification enriched with research context
4. **Image Rendering** (gemini-3-pro-image-preview): Generates high-fidelity 3:4 infographic based on the plan

#### Process/Sequence Pipeline
For processes, the generation is sequential for each step:
1. **Process Structure Discovery** (gemini-2.5-flash): Identifies process name, domain, overview text, and step titles
2. **For each step** (sequential):
   - **Step Explanation** (gemini-2.5-flash): Detailed description and key events for the step
   - **Step Visual Plan** (gemini-2.5-flash): Design specification for the step visualization
   - **Step Image** (gemini-3-pro-image-preview, 120s timeout): Renders high-quality step infographic
3. All steps collected into `InfographicStep[]` array and stored as a sequence

All generated infographics (single images and sequences) are stored in InstantDB and displayed in a filterable gallery. Users can view details, edit images via natural language prompts (per-step for sequences), or download them.

### State Management Architecture

**App.tsx** is the main component containing all state management:

- **Generation State (Single)**: `searchMode`, `query`, `facts[]`, `selectedFact`, `loading`, `loadingMessage`, `currentPlan`, `currentImage`
- **Generation State (Process/Sequence)**: `processStructure`, `currentSequence[]`, `currentStepIndex`
  - `processStructure`: Contains `processName`, `domain`, `overviewText`, `suggestedSteps`, `stepTitles[]`
  - `currentSequence`: Array of completed `InfographicStep` objects being built during generation
  - `currentStepIndex`: Tracks which step is currently being generated (for progress display)
- **UI State**: `appState` (tracks screens: input → selection → planning → generating → result → gallery)
- **Gallery Filters**: `filterDomain`, `filterAudience`, `filterStyle`, `filterLanguage`, `gallerySearchQuery`
- **Configuration State**: `language`, `audience`, `imageModel`, `aspectRatio`, `artStyle`
- **Error State**: `error`, `isCheckingKey`, `hasApiKey`
- **Database Query**: Uses `db.useQuery()` to reactively fetch infographics from InstantDB

The gallery data is transformed from InstantDB's object format into an `InfographicItem[]` array using a `useMemo` hook. Filtered results are derived using another `useMemo` for performance.

**Backward Compatibility**: The gallery transformation correctly handles both legacy single-image items (checking `imageUrl`) and new sequence items (checking `isSequence` flag).

### Key Service Layer

**services/geminiService.ts** handles all Gemini API interactions:

#### Single Fact/Concept Functions
- `generateScientificFacts()`: Generates 3 facts for a domain
- `generateFactFromConcept()`: Deep-dive explanation for a concept
- `generateInfographicPlan()`: Creates visual design specification
- `generateInfographicImage()`: Renders the actual image (accepts optional `timeoutMs` parameter)
- `editGeneratedImage()`: Refines images via natural language prompts
- `retryWithBackoff()`: Handles 503/429 errors with exponential backoff

#### Process/Sequence Functions
- `generateProcessStructure()`: Discovers process steps and structure (4-6 steps, titles, overview)
- `generateStepExplanation()`: Generates detailed text explanation for a single step
- `generateStepInfographicPlan()`: Creates visual design specification for a step (accepts `domain` and `completedSteps` for consistency tracking)
- `generateInfographicImage()` with 120s timeout: Renders high-quality step image (includes educational text and consistency guidance)
- `buildVisualConsistencyContext()`: Internal helper that generates consistency instructions based on previous steps (injects Step 1 plan for enforcement)

**Context Injection Pattern**: All generation functions accept `audience` and `artStyle` parameters. The `injectContext()` helper replaces placeholders in prompts with audience-specific tone/visual guidance and art style descriptions.

**Base64 Handling**: The `ensureBase64()` helper normalizes images to base64 format (handles both URLs and data URIs).

**Timeout Handling**: Process sequence image generation uses a 120-second timeout (vs. 60s for single images) due to the sequential nature requiring more time per step.

### Component Structure

- **FactCard.tsx**: Displays a single scientific fact with domain tag and selection button
- **GalleryGrid.tsx**: Grid layout for displaying gallery items
  - Detects sequences via `isSequence && steps.length > 0`
  - Renders thumbnail strips (3-grid) for sequences with step count badge
  - Falls back to single image display for legacy infographics
- **FilterPill.tsx**: Reusable filter button with selection styling
- **ImageModal.tsx**: Modal for viewing infographic details, editing images, and downloading
  - **Carousel Navigation**: Prev/Next buttons for stepping through sequences
  - **Thumbnail Strip**: Quick navigation to any step in sequence
  - **Step Indicator**: Shows "Step X / Y" for sequences
  - **Per-Step Editing**: Edit prompt applies only to current step in sequence
  - **Per-Step Download**: Filename includes step number for sequences
- **StyleSelector.tsx**: UI for selecting art styles with visual previews
- **DomainSelector.tsx**: Dropdown for selecting predefined scientific domains in "Explore Domain" mode
  - 12 predefined domains with emojis (Astrophysics, Marine Biology, Dinosaurs, AI, etc.)
  - Bilingual support (EN/FR) via translations
  - Selecting a domain auto-fills the search input
  - Users can still type custom domains

### Configuration & Prompts

**constants.ts** centralizes:
- Model names (TEXT_MODEL, IMAGE_MODEL_FLASH, IMAGE_MODEL_PRO)
- Scientific domains list (SCIENTIFIC_DOMAINS) with IDs and emojis
- Art style descriptions (STYLE_CONFIG)
- Prompt templates:
  - Single mode: FACT_GENERATION_PROMPT, CONCEPT_EXPLANATION_PROMPT, INFOGRAPHIC_PLAN_PROMPT
  - Process mode: PROCESS_DISCOVERY_PROMPT, PROCESS_STEP_EXPLANATION_PROMPT, PROCESS_STEP_PLAN_PROMPT

Prompts use `{{PLACEHOLDER}}` syntax which gets replaced by `injectContext()` based on audience and style. Process prompts additionally use:
- `{{PROCESS}}`: The process name entered by user
- `{{STEP_NUMBER}}`, `{{TOTAL_STEPS}}`: Current step tracking
- `{{PREVIOUS_CONTEXT}}`: Accumulated context from previous steps (for text consistency)
- `{{VISUAL_CONSISTENCY_CONTEXT}}`: Dynamic context for visual consistency (generated by `buildVisualConsistencyContext()`)
- `{{DOMAIN}}`: Scientific domain for the process

### Database Schema

InstantDB schema stores infographics with:

#### Legacy/Single Image Fields
- `id`, `timestamp`: Unique identifier and creation time
- `imageUrl`: Base64-encoded image
- `plan`: JSON string of the visual design plan
- `title`, `domain`, `text`: Fact data (stored denormalized from ScientificFact)

#### Sequence Fields (New)
- `isSequence`: Boolean flag indicating this is a sequence (true) or single image (false/undefined)
- `steps`: Array of `InfographicStep` objects with:
  - `stepNumber`: 1-indexed step position
  - `title`: Step-specific title
  - `description`: Step-specific description
  - `plan`: Step-specific visual design specification
  - `imageUrl`: Base64-encoded step image
- `totalSteps`: Total number of steps in sequence

#### Metadata (Both)
- `aspectRatio`, `style`, `audience`, `modelName`, `language`: Generation metadata

### Important Implementation Details

1. **API Key Management**: The app expects `GEMINI_API_KEY` environment variable (set via Vite config). Users can also provide the key through the UI if the extension environment supports it via the AIStudio interface.

2. **Audience & Style System**: The `AUDIENCE_CONFIG` object in geminiService defines tone and visual style for "young" (8-10 years) vs "adult" audiences. Art styles override the audience's default visual style when selected.

3. **Error Handling**: Generation functions use `retryWithBackoff()` to handle transient Gemini API errors (503, 429).

4. **Responsive Design**: Uses Tailwind CSS for responsive layouts. Key breakpoints are used for gallery grid and modal sizing.

5. **Multilingual Support**: `translations.ts` contains all user-facing strings for English and French. The `getTranslation()` function returns the appropriate language dictionary.

6. **Process/Sequence Generation**: Sequential generation of multi-step visualizations with:
   - Progressive UI updates showing completion count (`Step X/Y`)
   - Step-by-step error context (shows which step failed and why)
   - 120-second timeout per image (vs 60s for single images) to handle longer generation times
   - Previous context accumulation for consistency between steps
   - Comprehensive console logging for troubleshooting (logged with `[Step N]` prefixes)

7. **Backward Compatibility**: Gallery transformation and components detect sequence vs. legacy format at runtime:
   - Single images: Check `imageUrl` field
   - Sequences: Check `isSequence && steps.length > 0`
   - Both rendered correctly in gallery grid and modal

## Process/Sequence Learning Mode

A new feature for creating educational content about multi-step processes. Users can enter a process name (e.g., "Photosynthesis", "Water Cycle", "Butterfly Lifecycle") and the system generates 4-6 sequential steps with visualizations.

### User Flow
1. User selects "Process/Sequence" tab on input screen
2. Enters process name in placeholder
3. Clicks "Visualize"
4. System generates:
   - Process structure (determines number and titles of steps)
   - For each step: explanation text + visual plan + rendered image
5. Result view shows all steps in grid layout
6. User can save, view in gallery, edit individual steps, or download

### Technical Highlights
- **Sequential Generation**: Steps are generated one-by-one with context carried forward
- **Progressive Updates**: UI shows `Step X/Y` during generation
- **Visual Navigation**: Gallery shows thumbnail strips; modal has carousel controls
- **Per-Step Editing**: Edit prompt applies only to selected step
- **Robust Error Handling**: Identifies which step failed and provides specific error context
- **Comprehensive Logging**: Detailed console logs for debugging process generation

### Visual Consistency System

The `buildVisualConsistencyContext()` function in geminiService.ts ensures visual coherence across all steps in a sequence:

**For Step 1 (Foundation)**:
- Establishes visual conventions: title text design, step badge design, color palette, illustration style, layout conventions
- All choices are documented in the plan and MUST be replicated in subsequent steps

**For Steps 2+ (Enforcement)**:
- The COMPLETE Step 1 plan is injected into the prompt context
- Model must READ and COPY exact specifications (hex codes, sizes, positions)
- Explicit instructions to replicate: title text, step badge, color palette, illustration style, layout template, text styles
- Lists content already covered to prevent overlap

### Educational Text Requirements

Process sequence images include extensive educational text for 8-10 year olds:
- **Title**: Step title prominently displayed with consistent styling
- **Step Badge**: "STEP X/Y" indicator with consistent design across all steps
- **Labels (3-5)**: Identify key objects, areas, or components
- **Explanations (4-5 sentences)**: Kid-friendly explanations (8-12 words each)
- **Annotations**: Arrows pointing to important elements
- **Callout Boxes**: Highlight 2-3 key events

### Content Deduplication Rules

Prompts enforce strict content separation:

**Within Each Image**:
- No duplicate labels (each label must be unique)
- No redundant text (don't explain same thing twice)
- One label per visual element

**Across the Sequence**:
- Mutually exclusive steps (each covers different content)
- No repeating content from previous steps
- No previewing content from future steps
- Focus ONLY on what happens in this specific step's timeframe

### Handler Functions
- `handleProcessSubmit()` in App.tsx: Orchestrates the full process generation pipeline
  - Calls `generateProcessStructure()` to discover steps
  - Loops through steps calling explanation → plan → image for each
  - Updates UI progressively with `setCurrentSequence()`
  - Enhanced error handling with context-aware messages

### Debugging
When process generation fails:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for `[Step N]` log entries to identify which step failed
4. Check if error is timeout, rate limit, or content blocked
5. Logs show:
   - `✓ Explanation complete`
   - `✓ Visual plan generated`
   - `✓ Image rendered successfully`
   - `❌ FAILED` with error message if it fails

## Perplexity Research Integration

The app uses Perplexity API to enhance infographic generation with real-time web research in "Explore Domain" mode.

### How It Works
1. When user selects a fact in Explore Domain mode, `researchFactForInfographic()` is called
2. Perplexity API researches the fact and returns structured data:
   - **scientificDetails**: 3-5 specific scientific facts about the topic
   - **visualMetaphors**: 2-3 ways to visually represent the concept
   - **analogies**: 2-3 age-appropriate comparisons
   - **misconceptions**: 1-2 common wrong beliefs to avoid
3. Research results are formatted into a context string and passed to `generateInfographicPlan()`
4. The enriched plan produces more accurate and educational infographics
5. Research data is saved to the database alongside the infographic

### Configuration
- **API Key**: Set `PERPLEXITY_API_KEY` in `.env.local`
- **Vite Proxy**: Configured in `vite.config.ts` to proxy `/api/perplexity` to `https://api.perplexity.ai` (avoids CORS issues)
- **Model**: Uses `sonar-pro` model for comprehensive web search

### Graceful Degradation
- If `PERPLEXITY_API_KEY` is not set or API fails, generation continues without research context
- `researchFactForInfographic()` returns empty data with `error` field set
- The app functions normally, just without research enrichment

### Key Functions
- `researchFactForInfographic()` in perplexityService.ts: Main research function
- `buildFactResearchPrompt()`: Constructs the research prompt
- `generateInfographicPlan()` accepts optional `researchContext` parameter

## Key Files Reference

- [App.tsx](App.tsx) - Main component, state management, UI routing
- [services/geminiService.ts](services/geminiService.ts) - All Gemini API interactions
- [services/perplexityService.ts](services/perplexityService.ts) - Perplexity API research functions
- [types.ts](types.ts) - TypeScript interfaces and enums
- [constants.ts](constants.ts) - Model names, prompts, style configs, domain list
- [translations.ts](translations.ts) - Multilingual strings (includes domain translations)
- [db.ts](db.ts) - InstantDB initialization
- [components/](components/) - Reusable UI components
- [components/DomainSelector.tsx](components/DomainSelector.tsx) - Domain selection dropdown

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

## Architecture Overview

### Core Technology Stack
- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **AI Services**: Google GenAI SDK (gemini-2.5-flash for text, gemini-3-pro-image-preview for image generation)
- **Database**: InstantDB (real-time persistence with reactive queries)
- **UI Icons**: Lucide React

### High-Level Flow

The application has three main discovery modes:

1. **Explore Domain**: User enters a scientific field (e.g., "Astrophysics") → Gemini generates 3 interesting facts in that domain
2. **Explain Concept**: User enters a specific concept (e.g., "Black Holes") → Gemini provides a deep-dive explanation
3. **Process/Sequence**: User enters a process (e.g., "Photosynthesis", "Water Cycle") → Gemini generates 4-6 sequential steps with visualizations

#### Single Fact/Concept Pipeline
For facts and concepts, the generation pipeline follows three steps:
1. **Fact Generation** (gemini-2.5-flash): Creates scientifically accurate, age-appropriate content
2. **Visual Planning** (gemini-2.5-flash): Generates a detailed design specification (layout, colors, visual metaphors)
3. **Image Rendering** (gemini-3-pro-image-preview): Generates high-fidelity 3:4 infographic based on the plan

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
- `generateStepInfographicPlan()`: Creates visual design specification for a step
- `generateInfographicImage()` with 120s timeout: Renders high-quality step image

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

### Configuration & Prompts

**constants.ts** centralizes:
- Model names (TEXT_MODEL, IMAGE_MODEL_FLASH, IMAGE_MODEL_PRO)
- Art style descriptions (STYLE_CONFIG)
- Prompt templates:
  - Single mode: FACT_GENERATION_PROMPT, CONCEPT_EXPLANATION_PROMPT, INFOGRAPHIC_PLAN_PROMPT
  - Process mode: PROCESS_DISCOVERY_PROMPT, PROCESS_STEP_EXPLANATION_PROMPT, PROCESS_STEP_PLAN_PROMPT

Prompts use `{{PLACEHOLDER}}` syntax which gets replaced by `injectContext()` based on audience and style. Process prompts additionally use:
- `{{PROCESS}}`: The process name entered by user
- `{{STEP_NUMBER}}`, `{{TOTAL_STEPS}}`: Current step tracking
- `{{PREVIOUS_CONTEXT}}`: Accumulated context from previous steps (for consistency)

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

## Key Files Reference

- [App.tsx](App.tsx) - Main component, state management, UI routing
- [services/geminiService.ts](services/geminiService.ts) - All Gemini API interactions
- [types.ts](types.ts) - TypeScript interfaces and enums
- [constants.ts](constants.ts) - Model names, prompts, style configs
- [translations.ts](translations.ts) - Multilingual strings
- [db.ts](db.ts) - InstantDB initialization
- [components/](components/) - Reusable UI components

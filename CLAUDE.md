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

The application has two main discovery modes:

1. **Explore Domain**: User enters a scientific field (e.g., "Astrophysics") → Gemini generates 3 interesting facts in that domain
2. **Explain Concept**: User enters a specific concept (e.g., "Black Holes") → Gemini provides a deep-dive explanation

For each fact/concept, the generation pipeline follows three steps:
1. **Fact Generation** (gemini-2.5-flash): Creates scientifically accurate, age-appropriate content
2. **Visual Planning** (gemini-2.5-flash): Generates a detailed design specification (layout, colors, visual metaphors)
3. **Image Rendering** (gemini-3-pro-image-preview/Imagen 3): Generates high-fidelity 3:4 infographic based on the plan

All generated infographics are stored in InstantDB and displayed in a filterable gallery. Users can view details, edit images via natural language prompts, or download them.

### State Management Architecture

**App.tsx** is the main component containing all state management:

- **Generation State**: `searchMode`, `query`, `facts[]`, `selectedFact`, `loading`, `loadingMessage`, `currentPlan`, `currentImage`
- **UI State**: `appState` (tracks screens: input → selection → planning → generating → result → gallery)
- **Gallery Filters**: `filterDomain`, `filterAudience`, `filterStyle`, `filterLanguage`, `gallerySearchQuery`
- **Configuration State**: `language`, `audience`, `imageModel`, `aspectRatio`, `artStyle`
- **Error State**: `error`, `isCheckingKey`, `hasApiKey`
- **Database Query**: Uses `db.useQuery()` to reactively fetch infographics from InstantDB

The gallery data is transformed from InstantDB's object format into an `InfographicItem[]` array using a `useMemo` hook. Filtered results are derived using another `useMemo` for performance.

### Key Service Layer

**services/geminiService.ts** handles all Gemini API interactions:
- `generateScientificFacts()`: Generates 3 facts for a domain
- `generateFactFromConcept()`: Deep-dive explanation for a concept
- `generateInfographicPlan()`: Creates visual design specification
- `generateInfographicImage()`: Renders the actual image
- `editGeneratedImage()`: Refines images via natural language prompts
- `retryWithBackoff()`: Handles 503/429 errors with exponential backoff

**Context Injection Pattern**: All generation functions accept `audience` and `artStyle` parameters. The `injectContext()` helper replaces placeholders in prompts with audience-specific tone/visual guidance and art style descriptions.

**Base64 Handling**: The `ensureBase64()` helper normalizes images to base64 format (handles both URLs and data URIs).

### Component Structure

- **FactCard.tsx**: Displays a single scientific fact with domain tag and selection button
- **GalleryGrid.tsx**: Grid layout for displaying gallery items
- **FilterPill.tsx**: Reusable filter button with selection styling
- **ImageModal.tsx**: Modal for viewing infographic details, editing images, and downloading
- **StyleSelector.tsx**: UI for selecting art styles with visual previews

### Configuration & Prompts

**constants.ts** centralizes:
- Model names (TEXT_MODEL, IMAGE_MODEL_FLASH, IMAGE_MODEL_PRO)
- Art style descriptions (STYLE_CONFIG)
- Prompt templates (FACT_GENERATION_PROMPT, CONCEPT_EXPLANATION_PROMPT, INFOGRAPHIC_PLAN_PROMPT)

Prompts use `{{PLACEHOLDER}}` syntax which gets replaced by `injectContext()` based on audience and style.

### Database Schema

InstantDB schema stores infographics with:
- `id`, `timestamp`: Unique identifier and creation time
- `imageUrl`: Base64-encoded image
- `plan`: JSON string of the visual design plan
- `title`, `domain`, `text`: Fact data (stored denormalized from ScientificFact)
- `aspectRatio`, `style`, `audience`, `modelName`, `language`: Generation metadata

### Important Implementation Details

1. **API Key Management**: The app expects `GEMINI_API_KEY` environment variable (set via Vite config). Users can also provide the key through the UI if the extension environment supports it via the AIStudio interface.

2. **Audience & Style System**: The `AUDIENCE_CONFIG` object in geminiService defines tone and visual style for "young" (8-10 years) vs "adult" audiences. Art styles override the audience's default visual style when selected.

3. **Error Handling**: Generation functions use `retryWithBackoff()` to handle transient Gemini API errors (503, 429).

4. **Responsive Design**: Uses Tailwind CSS for responsive layouts. Key breakpoints are used for gallery grid and modal sizing.

5. **Multilingual Support**: `translations.ts` contains all user-facing strings for English and French. The `getTranslation()` function returns the appropriate language dictionary.

## Key Files Reference

- [App.tsx](App.tsx) - Main component, state management, UI routing
- [services/geminiService.ts](services/geminiService.ts) - All Gemini API interactions
- [types.ts](types.ts) - TypeScript interfaces and enums
- [constants.ts](constants.ts) - Model names, prompts, style configs
- [translations.ts](translations.ts) - Multilingual strings
- [db.ts](db.ts) - InstantDB initialization
- [components/](components/) - Reusable UI components

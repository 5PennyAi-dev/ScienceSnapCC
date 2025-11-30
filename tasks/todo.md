# Feature: Perplexity Research for Explore Domain Facts

## Overview
Add Perplexity API research when user selects a scientific fact in "Explore Domain" mode. The research results will enrich the infographic plan generation and be saved in the database.

## Current Flow (Explore Domain)
1. User selects domain → `handleDomainSubmit()` → `generateScientificFacts()` → returns 3 facts
2. User clicks on a fact → `handleFactSelect()` → `processFactToInfographic()`
3. `processFactToInfographic()`:
   - Calls `generateInfographicPlan(fact, ...)` → generates text plan
   - Calls `generateInfographicImage(plan, ...)` → generates image
4. Save to database

## Proposed Flow (After Change)
1. User selects domain → same as before
2. User clicks on a fact → `handleFactSelect()` → `processFactToInfographic()`
3. `processFactToInfographic()`:
   - **NEW: Call Perplexity to research the fact** (title + text)
   - Calls `generateInfographicPlan(fact, ..., researchContext)` → plan enriched with research
   - Calls `generateInfographicImage(plan, ...)` → generates image
4. Save to database **including research data**

---

## Todo List

### 1. Add Type Definition
- [ ] Add `FactResearchData` interface to `types.ts`
  - Fields: `factTitle`, `accuracy`, `visualSuggestions`, `analogies`, `sources`, `timestamp`, `error?`
  - Also add the missing `PerplexityResearchData` interface that perplexityService.ts already imports

### 2. Create Fact Research Function
- [ ] Add `researchFactForInfographic()` function to `services/perplexityService.ts`
  - Adapts from existing `researchProcessForEducation()` but tailored for single facts
  - Takes: `factTitle`, `factText`, `domain`, `audience`, `language`
  - Returns: `FactResearchData`
  - Focuses on: scientific accuracy, visual metaphors, analogies for audience

### 3. Update Plan Generation
- [ ] Modify `generateInfographicPlan()` in `services/geminiService.ts`
  - Add optional `researchContext?: string` parameter
  - If research context provided, inject it into the prompt before plan generation

### 4. Update App Flow
- [ ] Modify `processFactToInfographic()` in `App.tsx`
  - Add state for storing research data: `currentResearch`
  - Before calling `generateInfographicPlan()`, call `researchFactForInfographic()`
  - Pass research summary to plan generation
  - Update loading message during research phase

### 5. Update Database Save
- [ ] Modify `handleSave()` in `App.tsx`
  - Add `researchData` field to the save payload for single-image infographics
  - Store the research findings alongside the infographic

### 6. Update InfographicItem Type
- [ ] Modify `InfographicItem` interface in `types.ts`
  - Add optional `researchData?: FactResearchData` field

---

## Files to Modify
| File | Changes |
|------|---------|
| `types.ts` | Add `FactResearchData` and `PerplexityResearchData` interfaces, update `InfographicItem` |
| `services/perplexityService.ts` | Add `researchFactForInfographic()` function |
| `services/geminiService.ts` | Add optional `researchContext` param to `generateInfographicPlan()` |
| `App.tsx` | Update `processFactToInfographic()` and `handleSave()` |

---

## Technical Notes

### Perplexity API Call
- Existing pattern in `perplexityService.ts` uses direct HTTP API calls
- Uses `sonar-pro` model
- Includes retry logic and 30-second timeout
- Gracefully falls back if API fails (returns empty research data)

### Research Prompt Focus (for facts)
The research should focus on:
1. **Scientific accuracy**: Key scientific details to include
2. **Visual metaphors**: How to best visualize this concept
3. **Age-appropriate analogies**: Helpful comparisons for the target audience
4. **Common misconceptions**: What to avoid showing incorrectly

### Graceful Degradation
- If Perplexity API fails or is not configured, proceed without research context
- The app should still work if `PERPLEXITY_API_KEY` is not set

---

## Review

### Changes Made

**1. types.ts**
- Added `PerplexityResearchData` interface (for Process mode - was missing)
- Added `FactResearchData` interface (for Explore Domain mode)
- Added optional `research?: FactResearchData` field to `InfographicItem`

**2. services/perplexityService.ts**
- Added import for `FactResearchData`
- Added `buildFactResearchPrompt()` helper function
- Added `researchFactForInfographic()` export function that:
  - Calls Perplexity API with 30-second timeout
  - Returns structured research data (scientificDetails, visualMetaphors, analogies, misconceptions, sources)
  - Gracefully falls back to empty data on error

**3. services/geminiService.ts**
- Added optional `researchContext?: string` parameter to `generateInfographicPlan()`
- If research context provided, appends it to the prompt

**4. App.tsx**
- Added import for `researchFactForInfographic` and `FactResearchData`
- Added `currentResearch` state variable
- Updated `processFactToInfographic()`:
  - Calls Perplexity research before plan generation
  - Formats research into context string
  - Passes context to `generateInfographicPlan()`
- Updated `handleSave()`:
  - Includes `research` field in database save for single images

### Flow Summary
1. User selects fact in "Explore Domain" mode
2. App shows "Researching..." loading message
3. Perplexity API researches the fact (scientific details, visual metaphors, analogies, misconceptions)
4. Research context is passed to Gemini for plan generation (enriches the plan)
5. Image is generated as before
6. When saved, research data is stored in database `research` field

### Graceful Degradation
- If `PERPLEXITY_API_KEY` is not set or API fails, the app continues without research context
- `researchFactForInfographic()` returns empty data with `error` field set

---

# Feature: Concept Suggestions for Explain Concept Mode

## Overview
Added a dropdown with AI-generated concept suggestions to the "Explain Concept" mode, mirroring the existing DomainSelector pattern. Suggestions are generated once when the user clicks the "Explain Concept" tab and cached for the session. Suggestions are tailored to the selected audience (young vs adult).

## Completed Tasks

- [x] Add CONCEPT_SUGGESTIONS_PROMPT to constants.ts
- [x] Add generateConceptSuggestions() to geminiService.ts
- [x] Create ConceptSelector.tsx component
- [x] Add translations to translations.ts (EN/FR)
- [x] Integrate ConceptSelector into App.tsx

## Review

### Changes Made

**1. constants.ts**
- Added `CONCEPT_SUGGESTIONS_PROMPT` template that generates 10 diverse scientific concepts tailored to the audience (young/adult) and language (EN/FR)

**2. services/geminiService.ts**
- Added `ConceptSuggestion` interface (concept + description)
- Added `generateConceptSuggestions()` function using TEXT_MODEL (gemini-2.5-flash) with JSON schema for structured responses

**3. components/ConceptSelector.tsx** (NEW FILE)
- New component mirroring DomainSelector pattern
- Shows dropdown with concept name + teaser description
- Loading state while fetching
- Click-outside detection to close

**4. translations.ts**
- Added EN/FR translations for:
  - `conceptSuggestionsTitle`: "Suggested Concepts" / "Concepts suggérés"
  - `conceptSuggestionsLoading`: "Loading suggestions..." / "Chargement des suggestions..."
  - `conceptSuggestionsHeader`: "Popular science concepts" / "Concepts scientifiques populaires"

**5. App.tsx**
- Added state: `conceptSuggestions`, `conceptSuggestionsLoading`, `conceptSuggestionsCached`
- Added useEffect to fetch suggestions when "Explain Concept" tab is clicked (cached for session)
- Rendered ConceptSelector when `searchMode === 'concept'`

### How It Works
1. User clicks "Explain Concept" tab
2. App fetches 10 concept suggestions from Gemini (cached for session)
3. User sees dropdown with suggestions (name + teaser description)
4. Clicking a suggestion auto-fills the search input
5. User can still type their own concept instead

### Build Status
Build compiles successfully with no TypeScript errors.

---

# Feature: Process Suggestions for Process/Sequence Mode

## Overview
Added a dropdown with AI-generated process suggestions to the "Process/Sequence" mode, following the same pattern as the Concept Suggestions feature. Suggestions are generated once when the user clicks the "Process/Sequence" tab and cached for the session. Suggestions are tailored to the selected audience (young vs adult).

## Completed Tasks

- [x] Add PROCESS_SUGGESTIONS_PROMPT to constants.ts
- [x] Add generateProcessSuggestions() to geminiService.ts
- [x] Create ProcessSelector.tsx component
- [x] Add translations to translations.ts (EN/FR)
- [x] Integrate ProcessSelector into App.tsx

## Review

### Changes Made

**1. constants.ts**
- Added `PROCESS_SUGGESTIONS_PROMPT` template that generates 10 diverse scientific processes (life cycles, geological cycles, biological processes, etc.) tailored to the audience and language

**2. services/geminiService.ts**
- Added `ProcessSuggestion` interface (process + description)
- Added `generateProcessSuggestions()` function using TEXT_MODEL (gemini-2.5-flash) with JSON schema for structured responses

**3. components/ProcessSelector.tsx** (NEW FILE)
- New component mirroring ConceptSelector/DomainSelector pattern
- Shows dropdown with process name + teaser description
- Loading state while fetching
- Click-outside detection to close

**4. translations.ts**
- Added EN/FR translations for:
  - `processSuggestionsTitle`: "Suggested Processes" / "Processus suggérés"
  - `processSuggestionsLoading`: "Loading suggestions..." / "Chargement des suggestions..."
  - `processSuggestionsHeader`: "Popular science processes" / "Processus scientifiques populaires"

**5. App.tsx**
- Added state: `processSuggestions`, `processSuggestionsLoading`, `processSuggestionsCached`
- Added useEffect to fetch suggestions when "Process/Sequence" tab is clicked (cached for session)
- Rendered ProcessSelector when `searchMode === 'process'`

### How It Works
1. User clicks "Process/Sequence" tab
2. App fetches 10 process suggestions from Gemini (cached for session)
3. User sees dropdown with process name + teaser description
4. Clicking a suggestion auto-fills the search input
5. User can still type their own process instead

### Build Status
Build compiles successfully with no TypeScript errors.

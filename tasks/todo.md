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

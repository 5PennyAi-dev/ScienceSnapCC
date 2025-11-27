# Process/Sequence Learning Mode - Implementation Roadmap

## Overview

This roadmap outlines the implementation of a new "Process/Sequence Learning" mode for ScienceSnap that generates step-by-step educational infographic sequences for scientific processes (e.g., photosynthesis, water cycle, butterfly lifecycle, earthquake formation).

### Key Requirements

- **Variable Steps**: Gemini determines optimal number of steps (3-8) based on process complexity
- **Step-by-Step Generation**: Generate plan → image for each step sequentially
- **Gallery Thumbnails**: Display mini preview/thumbnail strip of first 3 steps
- **Modal Navigation**: Arrow navigation through sequence with thumbnail strip
- **Backward Compatible**: Maintain all existing single-image infographics

---

## Architecture Design

### Data Model (Backward Compatible)

**New Type: InfographicStep**
```typescript
interface InfographicStep {
  stepNumber: number;
  title: string;          // "Step 1: Water Absorption"
  description: string;    // Brief explanation of this step
  plan: string;           // Visual plan for this step
  imageUrl: string;       // Generated image for this step
}
```

**Extended Type: InfographicItem**
```typescript
interface InfographicItem {
  // Existing fields (kept for backward compatibility)
  id: string;
  timestamp: number;
  fact: ScientificFact;
  imageUrl?: string;      // Optional now (legacy single-image items)
  plan?: string;          // Optional now (legacy single-image items)

  // New fields for sequences
  isSequence?: boolean;   // Flag to distinguish mode
  steps?: InfographicStep[];  // Array for multi-step processes
  totalSteps?: number;    // Cached count

  // Metadata (unchanged)
  aspectRatio?: AspectRatio;
  style?: ArtStyle;
  audience?: Audience;
  modelName?: string;
  language?: Language;
}
```

**Compatibility Strategy**: Legacy items have `imageUrl` and `plan` populated; sequence items have `isSequence: true` and `steps[]` populated. UI components check `isSequence` flag to render appropriately.

---

## Implementation Phases

### Phase 1: Foundation (No UI Changes)

**Files to Modify:**
- [types.ts](types.ts)
- [constants.ts](constants.ts)
- [services/geminiService.ts](services/geminiService.ts)
- [translations.ts](translations.ts)

**Tasks:**

1. **Update types.ts**
   - Add `InfographicStep` interface
   - Extend `InfographicItem` with optional `isSequence`, `steps`, `totalSteps` fields
   - Update `SearchMode` type: `'domain' | 'concept' | 'process'`

2. **Add prompts to constants.ts**

   Three new prompt templates needed:

   - `PROCESS_DISCOVERY_PROMPT`: Analyzes process and determines optimal step count (3-8), returns process name, domain, overview, and step titles
   - `PROCESS_STEP_EXPLANATION_PROMPT`: Generates detailed explanation for a specific step with context from previous steps
   - `PROCESS_STEP_PLAN_PROMPT`: Creates visual infographic plan for specific step (emphasizes step number and sequence continuity)

3. **Implement new service functions in geminiService.ts**

   - `generateProcessStructure(processName, lang, audience)`: Returns structure with step titles and suggested step count
   - `generateStepExplanation(processName, stepNumber, totalSteps, stepTitle, previousContext, lang, audience)`: Returns detailed step explanation
   - `generateStepInfographicPlan(processName, stepNumber, totalSteps, stepTitle, stepDescription, lang, audience, style)`: Returns visual plan for step

   **Note**: Reuse existing `generateInfographicImage()` - no changes needed!

4. **Add translation keys to translations.ts**
   ```
   tabProcess, placeholderProcess, loadingDiscoveringProcess,
   loadingGeneratingStep, loadingPlanningStep, loadingRenderingStep,
   errorGenProcess, processSteps, allSteps
   ```

**Testing**: Unit test the new service functions with mock data

---

### Phase 2: Generation Pipeline

**Files to Modify:**
- [App.tsx](App.tsx)

**Tasks:**

1. **Add process-related state**
   ```typescript
   const [searchMode, setSearchMode] = useState<'domain' | 'concept' | 'process'>('domain');
   const [processStructure, setProcessStructure] = useState<{...} | null>(null);
   const [currentSequence, setCurrentSequence] = useState<InfographicStep[]>([]);
   const [currentStepIndex, setCurrentStepIndex] = useState(0);
   ```

2. **Implement handleProcessSubmit()**

   Generation flow:
   ```
   1. Call generateProcessStructure() → get step titles and count
   2. For each step (sequential):
      a. generateStepExplanation() → detailed text
      b. generateStepInfographicPlan() → visual plan
      c. generateInfographicImage() → render image
      d. Add to currentSequence array
      e. Update loading message: "Generating step X/Y..."
   3. Move to result screen
   ```

   **Key Detail**: Accumulate previousContext from all prior steps to inform later steps

3. **Update handleSubmit() dispatcher**
   ```typescript
   if (searchMode === 'process') {
     await handleProcessSubmit();
   }
   ```

4. **Update handleSave() for sequences**

   Check if `currentSequence.length > 0`:
   - **Sequence**: Upload all images in parallel using `Promise.all()`, save with `isSequence: true, steps: [...], totalSteps: X`
   - **Single Image**: Use existing save logic

**Testing**: Generate a 3-step process end-to-end, verify saves to database correctly

---

### Phase 3: UI Updates

**Files to Modify:**
- [App.tsx](App.tsx) - Input screen, loading screen, result screen
- [components/GalleryGrid.tsx](components/GalleryGrid.tsx)

**Tasks:**

1. **Add "Process/Sequence" tab to input screen**
   ```typescript
   <button onClick={() => setSearchMode('process')}>
     <ArrowRight className="w-4 h-4" />
     {t.tabProcess}
   </button>
   ```
   Update placeholder text based on mode

2. **Enhance loading screen with step progress**
   ```typescript
   {searchMode === 'process' && currentStepIndex > 0 && (
     <div className="flex gap-2">
       {Array.from({ length: totalSteps }).map((_, idx) => (
         <div className={`w-3 h-3 rounded-full ${
           idx < currentStepIndex ? 'bg-green-400' :
           idx === currentStepIndex ? 'bg-pink-400 animate-pulse' :
           'bg-white/30'
         }`} />
       ))}
     </div>
   )}
   ```

3. **Create sequence result view in App.tsx**

   Conditional rendering:
   - If `currentSequence.length > 0`: Show grid of all step previews (3-column grid)
   - Else: Show existing single image result layout

4. **Update GalleryGrid.tsx for sequences**

   Detect sequence items with `isSequence && steps?.length > 0`:
   - **Sequence**: Render thumbnail strip of first 3 steps + badge showing total step count
   - **Legacy**: Render single image (existing behavior)

   Add step count badge:
   ```typescript
   {isSequence && (
     <div className="absolute top-2 right-2 bg-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full">
       {item.totalSteps} steps
     </div>
   )}
   ```

**Testing**: Verify both sequence and single-image items display correctly in gallery

---

### Phase 4: Modal Enhancements

**Files to Modify:**
- [components/ImageModal.tsx](components/ImageModal.tsx)

**Tasks:**

1. **Add carousel navigation state**
   ```typescript
   const [currentStepIndex, setCurrentStepIndex] = useState(0);
   const isSequence = item.isSequence && item.steps && item.steps.length > 0;
   ```

2. **Implement prev/next navigation**
   ```typescript
   const handlePrevStep = () => setCurrentStepIndex(prev => Math.max(0, prev - 1));
   const handleNextStep = () => setCurrentStepIndex(prev => Math.min(item.steps!.length - 1, prev + 1));
   ```

   Show chevron buttons conditionally:
   - Left chevron: only if `currentStepIndex > 0`
   - Right chevron: only if `currentStepIndex < totalSteps - 1`

3. **Add step indicator**
   ```typescript
   <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 px-4 py-2 rounded-full">
     Step {currentStepIndex + 1} / {item.steps.length}
   </div>
   ```

4. **Add thumbnail strip navigation**

   In modal sidebar:
   ```typescript
   <div className="flex gap-2 overflow-x-auto">
     {item.steps.map((step, idx) => (
       <button
         onClick={() => setCurrentStepIndex(idx)}
         className={idx === currentStepIndex ? 'border-pink-500 scale-110' : 'border-gray-300'}
       >
         <img src={step.imageUrl} />
       </button>
     ))}
   </div>
   ```

5. **Update download and edit functions**

   - Download: Use `item.steps[currentStepIndex].imageUrl` instead of `item.imageUrl`
   - Edit: Update only `steps[currentStepIndex].imageUrl` (not entire sequence)

6. **Add useEffect to reset state on item change**
   ```typescript
   useEffect(() => {
     setCurrentStepIndex(0);
     setEditPrompt('');
   }, [item?.id]);
   ```

**Testing**: Navigate through sequence with arrows, click thumbnails, verify edit applies to correct step

---

### Phase 5: Polish & Validation

**Files to Modify:**
- [App.tsx](App.tsx) - Gallery query transformation

**Tasks:**

1. **Update gallery query transformation**

   In the `useMemo` hook that transforms InstantDB results:
   ```typescript
   if (item.isSequence && item.steps) {
     // Return sequence format
     return { id, timestamp, isSequence: true, steps, totalSteps, fact, ...metadata };
   } else {
     // Return legacy format
     return { id, timestamp, imageUrl, plan, fact, ...metadata };
   }
   ```

2. **Error handling for edge cases**
   - API failure mid-sequence: Show error, return to input
   - Rate limiting: Existing `retryWithBackoff()` handles this
   - Empty steps array: Validate `steps.length > 0` before rendering

3. **Backward compatibility verification**
   - Load existing gallery with old items
   - Verify old items display and open correctly
   - Create new sequence and verify it saves
   - Mix of old and new items in gallery works

**Testing**: Run full compatibility test suite (see testing checklist below)

---

## Database Storage

### InstantDB Schema (Schemaless)

**Legacy Format**:
```json
{
  "id": "abc123",
  "imageUrl": "data:image/png;base64,...",
  "plan": "Visual plan text...",
  "title": "Photosynthesis",
  "domain": "Biology",
  "text": "Fact text..."
}
```

**Sequence Format**:
```json
{
  "id": "xyz789",
  "isSequence": true,
  "steps": [
    {
      "stepNumber": 1,
      "title": "Step 1: Light Absorption",
      "description": "Chlorophyll absorbs light...",
      "plan": "Visual plan for step 1...",
      "imageUrl": "data:image/png;base64,..."
    },
    ...
  ],
  "totalSteps": 5,
  "title": "Photosynthesis Process",
  "domain": "Biology",
  "text": "Overview of photosynthesis..."
}
```

No migration needed - both formats coexist naturally. Transformation logic handles both cases.

---

## Performance Considerations

### Generation Time
- **5-step process**: ~5-10 minutes total
  - Structure discovery: 10s
  - Per step: 60-120s (explanation + plan + image)
- **Mitigation**: Clear progress indicator with step dots animation

### API Costs (Per 5-step Sequence)
- Structure: 1 × TEXT_MODEL (~$0.001)
- Steps: 5 × (explanation + plan) × TEXT_MODEL (~$0.01)
- Images: 5 × IMAGE_MODEL_PRO (~$0.25) or IMAGE_MODEL_FLASH (~$0.05)
- **Total**: ~$0.26 (Pro) or ~$0.06 (Flash)

### Database Size
- Sequences store 5-8× more data than single images
- InstantDB limits are generous (shouldn't be immediate concern)
- Future: Consider thumbnail compression

---

## Critical Implementation Notes

### 1. Context Window Management
**Problem**: `previousContext` grows with each step, could exceed token limits

**Solution**: Limit context to recent steps only:
```typescript
const contextForStep = i < 2
  ? fullContext
  : `Summary: ${overview}\n\nRecent: ${lastTwoSteps}`;
```

### 2. Modal State Reset
**Problem**: Switching between items could cause state bugs

**Solution**: Reset `currentStepIndex` when item changes:
```typescript
useEffect(() => { setCurrentStepIndex(0); }, [item?.id]);
```

### 3. Type Safety
Always check both conditions:
```typescript
const isSequence = item.isSequence && item.steps && item.steps.length > 0;
```

### 4. Parallel Uploads
Use `Promise.all()` for faster saves:
```typescript
const uploadedUrls = await Promise.all(
  currentSequence.map((step, idx) =>
    uploadImageToStorage(step.imageUrl, `${id}-step-${idx}.png`)
  )
);
```

---

## Testing Checklist

### Unit Tests
- [ ] `generateProcessStructure()` returns 3-8 steps
- [ ] `generateStepExplanation()` includes context from previous steps
- [ ] `generateStepInfographicPlan()` includes step number indicator

### Integration Tests
- [ ] Process mode end-to-end: input → generation → save → gallery
- [ ] Partial generation failure shows error and returns to input
- [ ] Save sequence → reload gallery → displays correctly
- [ ] Edit step updates only current step (not entire sequence)

### UI Tests
- [ ] Mode selector switches between domain/concept/process
- [ ] Loading screen shows animated step progress dots
- [ ] Result screen shows grid of all steps
- [ ] Gallery card shows thumbnail strip for sequences
- [ ] Gallery card shows single image for legacy items
- [ ] Modal carousel navigation works (prev/next buttons)
- [ ] Modal thumbnail strip updates currentStepIndex
- [ ] Fullscreen mode works for sequences

### Backward Compatibility Tests
- [ ] Existing single-image items display in gallery
- [ ] Clicking existing item opens modal with single image (no carousel)
- [ ] Downloading existing item works
- [ ] Editing existing item works
- [ ] Filters work for both single images and sequences
- [ ] Mixed gallery (old + new) works correctly

### Edge Cases
- [ ] Process with 3 steps (minimum) works
- [ ] Process with 8 steps (maximum) completes
- [ ] Network failure during step generation shows error
- [ ] API rate limit handled gracefully by `retryWithBackoff()`
- [ ] Empty gallery shows correct empty state

---

## Prompt Templates (Ready for constants.ts)

### PROCESS_DISCOVERY_PROMPT

```typescript
export const PROCESS_DISCOVERY_PROMPT = `
#Role
You are a multilingual scientific expert specialized in decomposing complex processes into clear, sequential steps suitable for {{TARGET_AUDIENCE}}.

#Task
Analyze this scientific process: "{{PROCESS}}"

Your goal is to determine the optimal way to explain this process through a sequence of visual steps. Return a JSON object with:
- "processName": The name of the process (string)
- "domain": The scientific domain this belongs to (string, e.g., "Biology", "Physics")
- "overviewText": A 200-word overview of the entire process that provides context
- "suggestedSteps": The optimal number of steps to explain this process (integer between 3 and 8)
- "stepTitles": An array of clear, descriptive titles for each step (e.g., ["Step 1: Light Absorption", "Step 2: Electron Excitation", ...])

#Specifics
- Analyze the complexity of the process and the maturity level of {{TARGET_AUDIENCE}} to determine step count
- Steps should have clear causal relationships and logical flow
- Each step should represent a distinct phase or transformation in the process
- Titles should be action-oriented and describe what happens at that step
- Avoid creating redundant or overlapping steps
- Consider the attention span and learning capacity of {{TARGET_AUDIENCE}}
- Adopt a {{TONE}} tone in your descriptions
- **IMPORTANT: All output content (processName, domain, overviewText, stepTitles) must be strictly in {{LANGUAGE}}.**

#Context
These steps will be used to create an educational infographic sequence where each step is visualized and explained separately. The goal is to help learners understand complex processes through progressive, visual storytelling.
`;
```

### PROCESS_STEP_EXPLANATION_PROMPT

```typescript
export const PROCESS_STEP_EXPLANATION_PROMPT = `
#Role
You are a multilingual scientific educator creating detailed explanations for individual steps in a sequential process for {{TARGET_AUDIENCE}}.

#Task
Write a detailed explanation for Step {{STEP_NUMBER}} of {{TOTAL_STEPS}} in the process: "{{PROCESS_NAME}}"

The step title is: "{{STEP_TITLE}}"

Context from previous steps:
{{PREVIOUS_CONTEXT}}

Return a JSON object with:
- "stepNumber": The step number (integer)
- "title": The step title
- "description": A 200-250 word explanation of what happens in this specific step
- "keyEvents": An array of 2-3 key phenomena or actions that occur in this step (for visual emphasis)

#Specifics
- Focus ONLY on the events and mechanisms that occur within this specific step
- Reference what happened in the previous step (how it led to this step)
- Set up what comes next (how this step enables the following step)
- Explain the WHY and HOW, not just the WHAT
- Use analogies appropriate for {{TARGET_AUDIENCE}} to make concepts concrete
- Avoid repeating information from previous steps
- Break down complex mechanisms into understandable components
- The description must be scientifically accurate yet accessible
- Adopt a {{TONE}} tone
- keyEvents should be short phrases suitable for highlighting in an infographic
- **IMPORTANT: All output content must be strictly in {{LANGUAGE}}.**

#Context
This explanation will be used to create a visual infographic for this specific step. The keyEvents will help designers emphasize the most important transformations or phenomena to highlight visually.
`;
```

### PROCESS_STEP_PLAN_PROMPT

```typescript
export const PROCESS_STEP_PLAN_PROMPT = `
## **Task**
Create a detailed visual plan for Step {{STEP_NUMBER}} of {{TOTAL_STEPS}} in the process: "{{PROCESS_NAME}}"

This is part of a sequence, so maintain visual consistency with the overall process narrative.

Step Details:
- Title: {{STEP_TITLE}}
- Description: {{STEP_DESCRIPTION}}
- Key Events: {{KEY_EVENTS}}

Following these guidelines:

1. **Emphasize the Step Number**: Clearly display "STEP {{STEP_NUMBER}}/{{TOTAL_STEPS}}" so viewers understand the sequence position
2. **Show the Transformation**: Visually represent what changes or transforms during this specific step
3. **Maintain Continuity**: Use consistent visual language with other steps (colors, metaphors, style)
4. **Highlight Key Events**: Emphasize the 2-3 key events that define this step
5. **Show Inputs and Outputs**: If applicable, show what enters this step and what is produced
6. **Use Visual Metaphors**: Employ diagrams, arrows, icons, or metaphors suitable for {{TARGET_AUDIENCE}}
7. **Create Focal Points**: Guide the viewer's eye to the most important transformation happening in this step
8. **Balance Information**: Include enough detail to be educational without creating visual clutter

## **Specifics**
Your plan must be detailed enough for an AI image generator to create a compelling visual representation. Be specific about:
- Layout and composition (where elements should be positioned)
- Color coding (if using colors to distinguish components or processes)
- Key visual elements (arrows showing flow, icons representing concepts, diagrams)
- Text placement and sizing hierarchy
- Any step-specific indicators or badges
- The {{VISUAL_STYLE}} style should be applied consistently throughout the sequence

## **Context**
These infographics will be viewed in sequence, so each image should feel like part of a coherent narrative. The viewer should be able to see at a glance where they are in the process and what is transforming at this stage.

### **Required Elements:**
- Process: {{PROCESS_NAME}}
- Domain: {{DOMAIN}}
- Target Audience: {{TARGET_AUDIENCE}}
- Visual Style: {{VISUAL_STYLE}}
- Step Number: {{STEP_NUMBER}} / {{TOTAL_STEPS}}
- Step Title: {{STEP_TITLE}}

**IMPORTANT: The Plan must be written in {{LANGUAGE}}. All text elements to be displayed on the infographic MUST be in {{LANGUAGE}}.**
`;
```

---

## Files to Modify (Priority Order)

1. **[types.ts](types.ts)** - Core data model (InfographicStep, extend InfographicItem, update SearchMode)
2. **[constants.ts](constants.ts)** - Add 3 new prompt templates
3. **[services/geminiService.ts](services/geminiService.ts)** - Implement 3 new generation functions
4. **[translations.ts](translations.ts)** - Add ~10 new translation keys
5. **[App.tsx](App.tsx)** - State, handlers, UI updates (input/loading/result/gallery transformation)
6. **[components/GalleryGrid.tsx](components/GalleryGrid.tsx)** - Thumbnail strip rendering
7. **[components/ImageModal.tsx](components/ImageModal.tsx)** - Carousel navigation and thumbnail strip

---

## Future Enhancements (Out of Scope)

- Cancel generation mid-sequence
- Save partial sequences as drafts
- Bulk download all steps as ZIP
- Export sequence as GIF/video
- Drag-and-drop to reorder steps
- Branching processes (alternative paths)
- Side-by-side comparison of two processes
- Export as printable PDF

---

## Estimated Effort

- **Development**: 14-19 hours
- **Testing**: 9 hours
- **Total**: ~23-28 hours

---

## Success Criteria

✅ Users can enter a process name (e.g., "Photosynthesis") and generate a sequential infographic
✅ Gemini determines optimal number of steps (3-8) based on complexity
✅ Each step shows clear progression with numbered images
✅ Gallery displays thumbnail previews of sequences
✅ Modal allows navigation through steps with arrows and thumbnails
✅ All existing single-image infographics continue to work without issues
✅ Mixed gallery (old + new items) functions correctly

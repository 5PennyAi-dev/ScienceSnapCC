
import { ArtStyle } from './types';

// Models
export const TEXT_MODEL = 'gemini-2.5-flash';
export const IMAGE_MODEL_FLASH = 'gemini-2.5-flash-image';
export const IMAGE_MODEL_PRO = 'gemini-3-pro-image-preview';

// Styles
export const STYLE_CONFIG: Record<ArtStyle, string> = {
  DEFAULT: "", // Will fall back to audience default
  PIXEL: "8-bit pixel art style, vibrant colors, retro video game aesthetic, blocky details",
  CLAY: "3D claymation style, plasticine texture, handmade look, soft lighting, stop-motion animation feel",
  ORIGAMI: "Paper cutout style, layered paper texture, origami folds, slight shadows for depth, craft aesthetic",
  WATERCOLOR: "Soft watercolor painting, artistic brush strokes, pastel colors, fluid blending, on textured paper background",
  CYBERPUNK: "Futuristic cyberpunk style, neon lights, glowing accents, dark background, high contrast, digital sci-fi look",
  VINTAGE: "Vintage science textbook illustration, lithograph style, muted earth tones, aged paper texture, detailed line work",
  NEON: "Minimalist neon line art, glowing vector lines on deep black background, high contrast, modern and sleek",
  MANGA: "Japanese manga style, bold black outlines, expressive eyes, dynamic action lines, high contrast ink illustrations, dramatic perspectives",
  GHIBLI: "Studio Ghibli-inspired animation style, soft watercolor tones, whimsical characters, detailed natural backgrounds, warm color palette, magical realism aesthetic"
};

// Prompts
export const FACT_GENERATION_PROMPT = `
#Role
You are a multilingual scientific expert specialized in scientific outreach for {{TARGET_AUDIENCE}}, with an exceptional ability to transform complex concepts into fascinating and accessible facts. Your talent for captivating the imagination while staying rigorously true to scientific facts is unparalleled.

#Task
Generate 3 interesting, captivating, and surprising scientific facts in the field of: {{DOMAIN}} by following these step-by-step instructions:

Identify 3 true and fascinating concepts or phenomena in the specified field.
For each fact, provide:
- The scientific domain
- An appropriate title (2 or 3 words)
- A 250 words short text summarizing the essence of the fact

The fact and its associated text must be:
- Informative and factual
- Suitable for {{TARGET_AUDIENCE}}
- Captivating and stimulating curiosity
- Formulated with a {{TONE}} tone
- **IMPORTANT: WRITTEN IN {{LANGUAGE}}**

#Specifics
Your explanations must be scientifically accurate and verifiable – this is crucial for the education of our audience.
Use {{TONE}} language that sparks wonder and curiosity.
We greatly appreciate your ability to make science accessible without over-simplifying it.
Avoid excessive technical jargon unless explained, suitable for {{TARGET_AUDIENCE}}.
Your contribution is incredibly valuable in inspiring the next generation of scientists.

#Context
These scientific facts will be used to create educational infographics for students/learners. The goal is to stimulate their interest in science by presenting surprising and memorable information that sparks their curiosity and encourages them to explore further. These infographics will be used in formal and informal educational settings, so they must be both entertaining and rigorously accurate.
`;

export const CONCEPT_EXPLANATION_PROMPT = `
#Role
You are a multilingual scientific expert specialized in scientific outreach for {{TARGET_AUDIENCE}}.

#Task
The user wants an explanation about a specific concept: "{{CONCEPT}}".
Your goal is to write a single, rigorous, yet fascinating scientific entry about this concept that can be turned into an infographic.

Provide a JSON object with:
- "domain": The general scientific domain this concept belongs to.
- "title": A catchy title (2-4 words).
- "text": A 250-word explanation.

#Specifics
- The explanation must be accurate but accessible to {{TARGET_AUDIENCE}}.
- Use analogies if helpful.
- Focus on the visual aspects of the concept as it will be illustrated.
- Avoid technical jargon unless explained.
- Adopt a {{TONE}} tone.
- **IMPORTANT: The output content must be strictly in {{LANGUAGE}}.**
`;

export const INFOGRAPHIC_PLAN_PROMPT = `
## **Task** 
Create a detailed plan for a captivating infographic based on a short scientific text following these steps:
1. **Analyze the text** to identify the main scientific fact and key elements to highlight.
2. **Determine an appropriate visual structure** that will capture the attention of {{TARGET_AUDIENCE}}.
3. **Propose a {{VISUAL_STYLE}}** suitable for {{TARGET_AUDIENCE}}.
4. **Suggest relevant visual elements** (illustrations, icons, diagrams) that complement the text.
5. **Reorganize the textual content** so it is easily understandable at a glance.
6. **Balance visual and textual elements** to create an informative yet uncluttered infographic.

## **Specifics**
Your plan must be detailed enough for a designer to use it directly. We rely on your expertise for this important project.  
The infographic must captivate the attention of the audience from the very first glance while remaining educational.  
We greatly appreciate your creativity in transforming this scientific information into a memorable visual experience.  
Ensure that the main scientific fact is immediately identifiable and understandable.  
Keep it simple to avoid cognitive overload while retaining enough information to be instructive.  
Clearly specify the text to display, as it must be rendered accurately. Avoid text repetition.
**IMPORTANT: The Plan must be written in {{LANGUAGE}}. The text elements to be displayed on the image MUST be in {{LANGUAGE}}.**

## **Context**
These infographics will be used in schools or educational contexts to stimulate interest in science.
Our goal is to spark scientific curiosity by presenting surprising and fun facts in a memorable way.  

### **Scientific Text:**
Scientific Domain: {{DOMAIN}}
Title: {{TITLE}}
Text:
{{TEXT}}
`;

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
- **CRITICAL: Create MUTUALLY EXCLUSIVE steps** - each step must cover DIFFERENT content:
  * NO overlapping information between steps
  * NO repeating the same concepts, objects, or events across multiple steps
  * Each step should have its OWN unique focus, actors, and transformations
  * Think of steps as chapters in a book - each covers a distinct part of the story
- Consider the attention span and learning capacity of {{TARGET_AUDIENCE}}
- Adopt a {{TONE}} tone in your descriptions
- **IMPORTANT: All output content (processName, domain, overviewText, stepTitles) must be strictly in {{LANGUAGE}}.**

#Context
These steps will be used to create an educational infographic sequence where each step is visualized and explained separately. Each infographic will ONLY show what happens in that specific step - NO overlap between images. The goal is to help learners understand complex processes through progressive, visual storytelling.
`;

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
- **CRITICAL: NO CONTENT OVERLAP** - This step's content must be DISTINCT from all other steps:
  * DO NOT repeat information, concepts, or events already covered in previous steps
  * DO NOT describe events that belong to future steps
  * Focus EXCLUSIVELY on what happens in THIS specific step's timeframe
  * If something was explained in a previous step, do NOT explain it again - just briefly reference it
- Break down complex mechanisms into understandable components
- The description must be scientifically accurate yet accessible
- Adopt a {{TONE}} tone
- keyEvents should be short phrases suitable for highlighting in an infographic
- **keyEvents must be UNIQUE to this step** - do not repeat events from other steps
- **IMPORTANT: All output content must be strictly in {{LANGUAGE}}.**

#Context
This explanation will be used to create a visual infographic for this specific step ONLY. The infographic will show ONLY this step's content - nothing from other steps. The keyEvents will help designers emphasize the most important transformations or phenomena to highlight visually.
`;

export const PROCESS_STEP_PLAN_PROMPT = `
## **Task**
Create a detailed visual plan for Step {{STEP_NUMBER}} of {{TOTAL_STEPS}} in the process: "{{PROCESS_NAME}}"

This is part of a sequence, so maintain visual consistency with the overall process narrative.

{{VISUAL_CONSISTENCY_CONTEXT}}

**CRITICAL REQUIREMENTS FOR THIS STEP:**

Step Details:
- Title: {{STEP_TITLE}}
- Description: {{STEP_DESCRIPTION}}
- Key Events: {{KEY_EVENTS}}

Following these guidelines:

1. **Emphasize Educational Text Content** (CRITICAL for young learners):
   - **STEP TITLE TEXT**: Display the step title prominently at the top with a consistent, recognizable design:
     * Use a specific font style (e.g., bold sans-serif, rounded, playful)
     * Apply a specific font size (e.g., 48px or large)
     * Use a specific text color (hex code, e.g., #2D3748)
     * Add background treatment if desired (color, opacity, shape behind title)
     * Position it consistently (e.g., top-center, 30px from top edge)
     * Add text effects if desired (shadow, outline, etc.)
     * This title design MUST remain EXACTLY THE SAME across all steps - only the title text changes!
   - **STEP INDICATOR BADGE**: Display "STEP {{STEP_NUMBER}}/{{TOTAL_STEPS}}" badge with a consistent, recognizable design:
     * Use a clearly defined shape (e.g., rounded rectangle, shield, circle, hexagon - pick ONE and use it for all steps)
     * Apply a distinct background color that stands out from the scene
     * Add a visible border/outline
     * Use large, bold, easy-to-read text
     * Position it consistently (e.g., top-right corner, 20px from edges)
     * Size it to be prominent but not overwhelming
     * This design MUST remain EXACTLY THE SAME across all steps in the sequence - only the number changes!
   - Add 3-5 TEXT LABELS that identify key components, objects, or areas in the scene
   - Include 4-5 SHORT EXPLANATORY SENTENCES (8-12 words each) that describe what's happening
   - Add ANNOTATIONS with arrows pointing to important elements
   - Use CALLOUT BOXES to highlight the 2-3 key events
   - All text must be large enough for 8-10 year olds to read easily
   - Text should answer: "What is this?", "What's happening here?", and "Why is this important?"

2. **Maintain Visual Consistency with Previous Steps** (CRITICAL for sequence coherence):
   - Use the EXACT same color palette established in previous steps (specify which colors represent which concepts)
   - Maintain the same illustration technique and level of detail
   - Use consistent visual metaphors (if water was blue with wave patterns in Step 1, use the same style here)
   - Keep the same layout structure (title position, badge placement, annotation style)
   - Ensure the art style matches previous steps exactly (same line weight, shading, texture)
   - Reference specific design choices from previous steps to maintain continuity

3. **Show the Transformation**: Visually represent what changes or transforms during this specific step (before/after comparison if helpful)

4. **Highlight Key Events**: Use visual emphasis (colored boxes, circles, arrows) for the 2-3 key events

5. **Show Inputs and Outputs**: If applicable, clearly label what enters this step and what is produced

6. **Create Focal Points**: Guide the viewer's eye to the most important transformation with size, color, or position

7. **Balance Information**: Include enough educational text to be instructive without creating visual clutter

## **Specifics**

**TEXT CONTENT REQUIREMENTS** (Critical for Educational Value):
- The infographic MUST contain visible, readable text elements including:
  * Step title and step number badge
  * 3-5 labels identifying key objects or areas
  * 4-5 complete explanatory sentences (not just titles - actual kid-friendly explanations)
  * Callouts or annotations for the key events
- Text hierarchy: Title (largest) → Explanatory sentences (medium) → Labels (smaller)
- All text must be in simple language appropriate for 8-10 year olds
- Avoid scientific jargon unless it's explained in the annotation

**NO DUPLICATE CONTENT** (CRITICAL - Avoid Repetition):
- **Within this image**: Each label, annotation, and text element must be UNIQUE
  * DO NOT repeat the same label twice in the image
  * DO NOT show the same information in both a label AND an explanation
  * Each visual element should have ONE clear label, not multiple
  * Avoid redundant text - if something is labeled, don't repeat it elsewhere
- **Across the sequence**: This step's content must be EXCLUSIVE to this step
  * DO NOT illustrate events or concepts that belong to OTHER steps
  * DO NOT repeat content from previous steps - it was already shown
  * DO NOT preview content from future steps - it will be shown later
  * Focus ONLY on what happens in THIS specific step's timeframe
  * If an element appeared in a previous step, show its NEW state, not repeat the old state

**TITLE TEXT REQUIREMENTS** (CRITICAL for Sequence Consistency):
- The step title at the top of the image MUST be designed with a specific, consistent visual template that will be used for ALL steps:
  * For Step 1: Define the exact font style, font size, text color (hex code), background treatment, position, and any text effects
  * For Steps 2+: Replicate this design EXACTLY - same font, size, color, background, position, effects. Only the title text changes.
- Examples of consistent title designs:
  * Option A: Bold sans-serif, 48px, dark blue (#2D3748), no background, top-center, subtle shadow
  * Option B: Rounded playful font, 52px, white text on semi-transparent dark banner, top-center
  * Option C: Bold uppercase, 44px, golden yellow (#FFD700), slight black outline, top-center
- Specify your chosen design precisely in the visual plan so that all subsequent steps can replicate it exactly
- The title style should be instantly recognizable across all steps as part of the same series

**STEP INDICATOR BADGE REQUIREMENTS** (CRITICAL for Sequence Consistency):
- The "STEP X/Y" badge MUST be designed with a specific, consistent visual template that will be used for ALL steps:
  * For Step 1: Define the exact shape, colors, border, text styling, position, and size
  * For Steps 2+: Replicate this design EXACTLY - same shape, colors, border, text styling, position, size. Only the number changes.
- Examples of consistent badge designs:
  * Option A: Rounded rectangle (light cream background, dark blue text, thin border, top-right corner)
  * Option B: Shield shape (orange background, white text, thick border, top-right corner)
  * Option C: Circle (light blue background, dark text, no border, top-right corner)
- Specify your chosen design precisely in the visual plan so that all subsequent steps can replicate it exactly
- The badge should be instantly recognizable across all steps as part of the same series

**VISUAL CONSISTENCY REQUIREMENTS** (Critical for Sequence Coherence):
- Color Palette: Define and maintain 3-5 core colors throughout the sequence:
  * Primary concept color (e.g., "oxygen = bright red")
  * Secondary concept color (e.g., "carbon dioxide = blue-green")
  * Background/environment color
  * Accent color for emphasis
- Visual Style: Maintain consistent:
  * Line weight and stroke style
  * Character/object proportions if characters are present
  * Shading and lighting direction
  * Background texture or pattern
  * Icon and symbol design language
- Layout Template: Keep consistent positioning for:
  * Step badge location (suggest: top-right corner)
  * Title placement (suggest: top-center)
  * Main content area boundaries
  * Annotation/callout positioning style
- **TITLE TEXT TEMPLATE** (Critical for Series Consistency):
  * Font style: Define ONE font style for ALL step titles (e.g., bold sans-serif, rounded playful)
  * Font size: ONE consistent size for all titles (e.g., 48px)
  * Text color: ONE consistent color (hex code) for all titles
  * Background: ONE consistent treatment for all titles (none, banner, shadow, etc.)
  * Position: EXACT same position for all titles (e.g., top-center, 30px from top)
  * Effects: Same text effects for all titles (shadow, outline, etc.)
  * ONLY the title text content changes - everything else is identical
- **STEP INDICATOR BADGE TEMPLATE** (Critical for Series Consistency):
  * Shape: Define ONE shape and use it for ALL steps (e.g., rounded rectangle, shield, circle)
  * Background color: ONE consistent color for all step badges
  * Border/outline: ONE consistent border style for all step badges
  * Text color and font: Must be identical across all steps
  * Position: EXACT same position for all steps (same corner, same distance from edges)
  * Size: EXACT same dimensions for all steps
  * ONLY the step number changes (STEP 1/5, STEP 2/5, etc.) - everything else is identical

Your plan must be detailed enough for an AI image generator to create a compelling visual representation. Be specific about:
- Layout and composition (where elements should be positioned)
- Color coding with specific hex values or names (consistency across steps is essential)
- Key visual elements (arrows showing flow, icons representing concepts, diagrams)
- Text placement and sizing hierarchy
- Any step-specific indicators or badges
- The {{VISUAL_STYLE}} style should be applied consistently throughout the sequence

## **Context**
These infographics will be viewed in sequence, so each image should feel like part of a coherent narrative. The viewer should be able to see at a glance where they are in the process and what is transforming at this stage. The target audience is young learners (8-10 years old), so text must be abundant, clear, and educational.

### **Required Elements:**
- Process: {{PROCESS_NAME}}
- Domain: {{DOMAIN}}
- Target Audience: {{TARGET_AUDIENCE}}
- Visual Style: {{VISUAL_STYLE}}
- Step Number: {{STEP_NUMBER}} / {{TOTAL_STEPS}}
- Step Title: {{STEP_TITLE}}

**IMPORTANT: The Plan must be written in {{LANGUAGE}}. All text elements to be displayed on the infographic MUST be in {{LANGUAGE}}.**
`;

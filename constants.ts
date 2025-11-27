
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
- Avoid creating redundant or overlapping steps
- Consider the attention span and learning capacity of {{TARGET_AUDIENCE}}
- Adopt a {{TONE}} tone in your descriptions
- **IMPORTANT: All output content (processName, domain, overviewText, stepTitles) must be strictly in {{LANGUAGE}}.**

#Context
These steps will be used to create an educational infographic sequence where each step is visualized and explained separately. The goal is to help learners understand complex processes through progressive, visual storytelling.
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
- Avoid repeating information from previous steps
- Break down complex mechanisms into understandable components
- The description must be scientifically accurate yet accessible
- Adopt a {{TONE}} tone
- keyEvents should be short phrases suitable for highlighting in an infographic
- **IMPORTANT: All output content must be strictly in {{LANGUAGE}}.**

#Context
This explanation will be used to create a visual infographic for this specific step. The keyEvents will help designers emphasize the most important transformations or phenomena to highlight visually.
`;

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

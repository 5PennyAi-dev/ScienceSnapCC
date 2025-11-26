
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

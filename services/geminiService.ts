import { GoogleGenAI, Type } from "@google/genai";
import { ScientificFact, Language, Audience, ImageModelType, AspectRatio, ArtStyle } from "../types";
import { TEXT_MODEL, IMAGE_MODEL_FLASH, IMAGE_MODEL_PRO, FACT_GENERATION_PROMPT, INFOGRAPHIC_PLAN_PROMPT, CONCEPT_EXPLANATION_PROMPT, PROCESS_DISCOVERY_PROMPT, PROCESS_STEP_EXPLANATION_PROMPT, PROCESS_STEP_PLAN_PROMPT, STYLE_CONFIG } from "../constants";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing. Please select a key.");
  return new GoogleGenAI({ apiKey });
};

const getLanguageName = (lang: Language) => lang === 'fr' ? 'French' : 'English';

const AUDIENCE_CONFIG = {
  young: {
    target: "young audiences (8-10 years old)",
    tone: "enthusiastic, playful, and accessible",
    visualStyle: "joyful color palette, fun illustrations, cartoon style, and energetic layout"
  },
  adult: {
    target: "adult audiences and university students",
    tone: "professional, rigorous, sophisticated, and engaging",
    visualStyle: "sober color palette, modern minimalist style, schematic diagrams, and high-quality editorial design"
  }
};

// Helper to handle 503 (Overloaded) and 429 (Rate Limit) errors with retries
const retryWithBackoff = async <T>(operation: () => Promise<T>, retries = 3, initialDelay = 2000): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    const isTransient =
      error.status === 503 ||
      error.code === 503 ||
      error.status === 429 ||
      error.code === 429 ||
      (error.message && error.message.toLowerCase().includes('overloaded'));

    if (retries > 0 && isTransient) {
      console.warn(`Gemini API Busy/Overloaded. Retrying in ${initialDelay}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, initialDelay));
      return retryWithBackoff(operation, retries - 1, initialDelay * 2);
    }
    throw error;
  }
};

// Helper to wrap promises with timeout
const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${operation} timed out after ${timeoutMs / 1000} seconds. The model may be unresponsive. Please try again later.`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
};

// Helper to inject audience and style settings
// Uses replacer functions () => string to safely handle special characters in replacement values
const injectContext = (prompt: string, audience: Audience, style: ArtStyle = 'DEFAULT') => {
  const audienceConfig = AUDIENCE_CONFIG[audience];
  const stylePrompt = STYLE_CONFIG[style];
  
  // If a specific style is selected, it overrides the audience default visual style
  const visualStyle = style !== 'DEFAULT' ? stylePrompt : audienceConfig.visualStyle;

  return prompt
    .replace(/{{TARGET_AUDIENCE}}/g, () => audienceConfig.target)
    .replace(/{{TONE}}/g, () => audienceConfig.tone)
    .replace(/{{VISUAL_STYLE}}/g, () => visualStyle);
};

// Helper to ensure we have a base64 string
const ensureBase64 = async (input: string): Promise<{ data: string, mimeType: string }> => {
  // If it's a URL (http/https), fetch it
  if (input.startsWith('http')) {
    try {
      const response = await fetch(input);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          // Result is "data:image/png;base64,..."
          const match = result.match(/^data:(image\/\w+);base64,(.+)$/);
          if (match) {
            resolve({ mimeType: match[1], data: match[2] });
          } else {
            reject(new Error("Failed to parse base64 from blob"));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error("Failed to convert URL to base64", e);
      throw new Error("Could not process image URL");
    }
  }

  // If it's already a data URL
  const match = input.match(/^data:(image\/\w+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], data: match[2] };
  }

  // Assume raw base64 string implies png if no header
  return { mimeType: 'image/png', data: input };
};

export const generateScientificFacts = async (domain: string, lang: Language, audience: Audience): Promise<ScientificFact[]> => {
  const ai = getAiClient();
  let prompt = FACT_GENERATION_PROMPT
    .replace('{{DOMAIN}}', () => domain)
    .replace('{{LANGUAGE}}', () => getLanguageName(lang));
  
  // Facts generation doesn't strictly need Visual Style, so we pass DEFAULT
  prompt = injectContext(prompt, audience, 'DEFAULT');

  try {
    const response = await retryWithBackoff(() => ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              domain: { type: Type.STRING },
              title: { type: Type.STRING },
              text: { type: Type.STRING },
            },
            required: ["domain", "title", "text"]
          }
        }
      }
    }));

    const text = response.text;
    if (!text) {
        const candidate = response.candidates?.[0];
        if (candidate?.finishReason) {
             throw new Error(`Gemini blocked fact generation. Reason: ${candidate.finishReason}`);
        }
        throw new Error("No text returned from Gemini");
    }
    
    return JSON.parse(text) as ScientificFact[];
  } catch (error) {
    console.error("Error generating facts:", error);
    throw error;
  }
};

export const generateFactFromConcept = async (concept: string, lang: Language, audience: Audience): Promise<ScientificFact> => {
  const ai = getAiClient();
  let prompt = CONCEPT_EXPLANATION_PROMPT
    .replace('{{CONCEPT}}', () => concept)
    .replace('{{LANGUAGE}}', () => getLanguageName(lang));
    
  prompt = injectContext(prompt, audience, 'DEFAULT');

  try {
    const response = await retryWithBackoff(() => ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            domain: { type: Type.STRING },
            title: { type: Type.STRING },
            text: { type: Type.STRING },
          },
          required: ["domain", "title", "text"]
        }
      }
    }));

    const text = response.text;
    if (!text) {
        const candidate = response.candidates?.[0];
        if (candidate?.finishReason) {
             throw new Error(`Gemini blocked concept generation. Reason: ${candidate.finishReason}`);
        }
        throw new Error("No text returned from Gemini");
    }
    
    return JSON.parse(text) as ScientificFact;
  } catch (error) {
    console.error("Error generating concept fact:", error);
    throw error;
  }
};

export const generateInfographicPlan = async (fact: ScientificFact, lang: Language, audience: Audience, style: ArtStyle): Promise<string> => {
  const ai = getAiClient();

  // Use replacer functions (() => value) to avoid issues if the content contains special replacement patterns like '$&'
  let prompt = INFOGRAPHIC_PLAN_PROMPT
    .replace('{{DOMAIN}}', () => fact.domain)
    .replace('{{TITLE}}', () => fact.title)
    .replace('{{TEXT}}', () => fact.text)
    .replace(/{{LANGUAGE}}/g, () => getLanguageName(lang));

  prompt = injectContext(prompt, audience, style);

  try {
    console.log(`[Plan Generation] Starting with fact: "${fact.title}"`);
    const startTime = Date.now();

    const response = await withTimeout(
      retryWithBackoff(() => ai.models.generateContent({
        model: TEXT_MODEL,
        contents: prompt,
      })),
      60000,
      "Plan generation"
    );

    const elapsed = Date.now() - startTime;
    console.log(`[Plan Generation] API responded in ${elapsed}ms`);

    const text = response.text;

    if (!text) {
        const candidate = response.candidates?.[0];
        // Check for safety blockage or other finish reasons
        if (candidate?.finishReason) {
            throw new Error(`Plan generation blocked. Reason: ${candidate.finishReason}`);
        }
        throw new Error("No plan returned from Gemini (Empty response)");
    }
    return text;
  } catch (error) {
    console.error("Error generating plan:", error);
    throw error;
  }
};

export const generateInfographicImage = async (plan: string, model: ImageModelType, aspectRatio: AspectRatio, style: ArtStyle, timeoutMs: number = 60000): Promise<string> => {
  const ai = getAiClient();

  const config: any = {
      imageConfig: {
          aspectRatio: aspectRatio,
      }
  };

  if (model === IMAGE_MODEL_PRO) {
      config.imageConfig.imageSize = "1K";
  }

  let styleInstruction = "";
  if (style !== 'DEFAULT') {
      styleInstruction = `\n\n**IMPORTANT VISUAL STYLE**: The infographic MUST be rendered in the following style: ${STYLE_CONFIG[style]}`;
  }

  // For process sequences, add enhanced guidance for educational text and consistency
  const isProcessSequence = timeoutMs > 60000; // Process sequences use 120s timeout

  let educationalTextGuidance = "";
  if (isProcessSequence) {
    educationalTextGuidance = `

**CRITICAL EDUCATIONAL TEXT REQUIREMENTS (For Young Learners 8-10 years old):**
This is an educational infographic designed specifically for children. The image MUST include extensive readable text:
1. STEP BADGE: Clearly display the step number (e.g., "STEP 2/5") - large, visible, typically top-right
2. TITLE: Make the step title prominent and readable
3. LABELS (3-5): Clear, readable labels identifying key objects, areas, or components in the scene
4. EXPLANATIONS (4-5 sentences): Complete sentences (8-12 words each) explaining what's happening, written in simple kid-friendly language
5. ANNOTATIONS: Text callouts with arrows pointing to important events or transformations
6. TEXT HIERARCHY: Title (largest) → Explanations (medium, readable from 1 meter away) → Labels (smaller)
- All text must be clearly visible using a bold, friendly, rounded font suitable for children
- Avoid scientific jargon - use everyday words that a curious 10-year-old would understand
- Explain concepts as if teaching to a classroom of elementary school children

**CRITICAL VISUAL CONSISTENCY REQUIREMENTS (For Sequence Coherence):**
This image is part of a multi-step sequence. Every step must look like it was created by the SAME ARTIST:
1. COLOR PALETTE: Use EXACTLY the same colors for the same concepts throughout the sequence. Do NOT invent new colors
2. ILLUSTRATION STYLE: Match the drawing style precisely (same line weights, shading, level of detail, artistic technique)
3. LAYOUT: Keep the same visual layout structure (step badge position, title placement, annotation style)
4. VISUAL METAPHORS: If specific visual metaphors or icons were used in previous steps, replicate them exactly
5. The viewer should see smooth visual continuity - no jarring style changes between steps

**NO DUPLICATE CONTENT (CRITICAL):**
1. NO DUPLICATE LABELS: Each label in this image must be UNIQUE - do not repeat the same label text twice
2. NO REDUNDANT TEXT: If something is labeled, don't explain it again elsewhere in the image
3. EXCLUSIVE CONTENT: Only illustrate what's specific to THIS step - do not repeat content from other steps
4. ONE LABEL PER ELEMENT: Each visual element gets exactly ONE clear label, not multiple labels saying the same thing`;
  }

  // Explicit instruction to ensure the model behaves as an image generator
  const prompt = `Generate a high-quality educational infographic image based on the following detailed plan:${styleInstruction}${educationalTextGuidance}\n\n${plan}`;

  try {
    console.log(`[Image Generation] Starting with model: ${model}, aspect ratio: ${aspectRatio}, style: ${style}, timeout: ${timeoutMs}ms`);
    const startTime = Date.now();

    const response = await withTimeout(
      retryWithBackoff(() => ai.models.generateContent({
        model: model,
        contents: {
          parts: [
            {
              text: prompt
            }
          ]
        },
        config: config
      })),
      timeoutMs,
      "Image generation"
    );

    const elapsed = Date.now() - startTime;
    console.log(`[Image Generation] API responded in ${elapsed}ms`);

    // Extract image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const mimeType = part.inlineData.mimeType || 'image/png';
        return `data:${mimeType};base64,${part.inlineData.data}`;
      }
    }

    // Check if the model refused to generate the image (e.g. Safety or Recitation)
    const candidate = response.candidates?.[0];
    if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
        const reason = candidate.finishReason;
        let userMessage = `Image generation failed (${reason}).`;
        if (reason === 'SAFETY') {
            userMessage = "Image generation blocked by safety filters. Please try modifying the concept or fact.";
        } else if (reason === 'RECITATION') {
            userMessage = "Image generation blocked due to recitation (copyright) check.";
        }
        throw new Error(userMessage);
    }

    // Log text response if it failed to generate image (helps debugging)
    const textPart = candidate?.content?.parts?.find(p => p.text);
    if (textPart) {
      console.warn("Model returned text instead of image:", textPart.text);
      throw new Error(`Model returned text instead of image: "${textPart.text.substring(0, 100)}..."`);
    }

    // Log detailed diagnostics when no image found
    console.error('[Image Generation] No image data in response:', {
      finishReason: candidate?.finishReason,
      hasParts: !!candidate?.content?.parts,
      partsCount: candidate?.content?.parts?.length,
      response: JSON.stringify(response, null, 2).substring(0, 500)
    });

    throw new Error("No image data found in response. Please try again.");
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};

export const editInfographic = async (imageInput: string, instruction: string, model: ImageModelType, aspectRatio: AspectRatio, style: ArtStyle): Promise<string> => {
  const ai = getAiClient();
  try {
    // Ensure we have valid base64 data and mimeType, even if input is a URL
    const { data: cleanBase64, mimeType } = await ensureBase64(imageInput);

    const config: any = {
        imageConfig: {
            aspectRatio: aspectRatio,
        }
    };

    if (model === IMAGE_MODEL_PRO) {
        config.imageConfig.imageSize = "1K";
    }

    let styleInstruction = "";
    if (style !== 'DEFAULT') {
        styleInstruction = ` Maintain the ${style} visual style.`;
    }

    console.log(`[Image Edit] Starting edit with instruction: "${instruction.substring(0, 50)}..."`);
    const startTime = Date.now();

    const response = await withTimeout(
      retryWithBackoff(() => ai.models.generateContent({
        model: model,
        contents: {
          parts: [
            {
              text: `Edit this image: ${instruction}.${styleInstruction}`
            },
            {
              inlineData: {
                mimeType: mimeType,
                data: cleanBase64
              }
            }
          ]
        },
        config: config
      })),
      60000,
      "Image editing"
    );

    const elapsed = Date.now() - startTime;
    console.log(`[Image Edit] API responded in ${elapsed}ms`);

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const respMime = part.inlineData.mimeType || 'image/png';
          return `data:${respMime};base64,${part.inlineData.data}`;
        }
      }

    // Check for blocking
    const candidate = response.candidates?.[0];
    if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
        throw new Error(`Image editing blocked. Reason: ${candidate.finishReason}`);
    }

    throw new Error("No edited image data found in response");

  } catch (error) {
    console.error("Error editing image:", error);
    throw error;
  }
};

// Process/Sequence Learning Mode Functions

export const generateProcessStructure = async (
  processName: string,
  lang: Language,
  audience: Audience
): Promise<{
  processName: string;
  domain: string;
  overviewText: string;
  suggestedSteps: number;
  stepTitles: string[];
}> => {
  const ai = getAiClient();
  let prompt = PROCESS_DISCOVERY_PROMPT
    .replace(/{{PROCESS}}/g, () => processName)
    .replace(/{{LANGUAGE}}/g, () => getLanguageName(lang));

  prompt = injectContext(prompt, audience, 'DEFAULT');

  try {
    const response = await withTimeout(
      retryWithBackoff(() => ai.models.generateContent({
        model: TEXT_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              processName: { type: Type.STRING },
              domain: { type: Type.STRING },
              overviewText: { type: Type.STRING },
              suggestedSteps: { type: Type.INTEGER },
              stepTitles: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["processName", "domain", "overviewText", "suggestedSteps", "stepTitles"]
          }
        }
      })),
      60000,
      "Process structure generation"
    );

    const responseText = response.text;
    return JSON.parse(responseText);
  } catch (error) {
    console.error("Error generating process structure:", error);
    throw error;
  }
};

export const generateStepExplanation = async (
  processName: string,
  stepNumber: number,
  totalSteps: number,
  stepTitle: string,
  previousContext: string,
  lang: Language,
  audience: Audience
): Promise<{
  stepNumber: number;
  title: string;
  description: string;
  keyEvents: string[];
}> => {
  const ai = getAiClient();
  let prompt = PROCESS_STEP_EXPLANATION_PROMPT
    .replace(/{{PROCESS_NAME}}/g, () => processName)
    .replace(/{{STEP_NUMBER}}/g, () => stepNumber.toString())
    .replace(/{{TOTAL_STEPS}}/g, () => totalSteps.toString())
    .replace(/{{STEP_TITLE}}/g, () => stepTitle)
    .replace(/{{PREVIOUS_CONTEXT}}/g, () => previousContext)
    .replace(/{{LANGUAGE}}/g, () => getLanguageName(lang));

  prompt = injectContext(prompt, audience, 'DEFAULT');

  try {
    const response = await withTimeout(
      retryWithBackoff(() => ai.models.generateContent({
        model: TEXT_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              stepNumber: { type: Type.INTEGER },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              keyEvents: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["stepNumber", "title", "description", "keyEvents"]
          }
        }
      })),
      60000,
      "Step explanation generation"
    );

    const responseText = response.text;
    return JSON.parse(responseText);
  } catch (error) {
    console.error("Error generating step explanation:", error);
    throw error;
  }
};

// Helper to build visual consistency context from completed steps
// Ensures each step in a sequence maintains consistent visual design
const buildVisualConsistencyContext = (
  completedSteps: any[],
  totalSteps: number,
  audience: Audience,
  style: ArtStyle
): string => {
  if (completedSteps.length === 0) {
    // First step - establish the visual foundation
    const audienceConfig = AUDIENCE_CONFIG[audience];
    const styleDesc = style !== 'DEFAULT' ? STYLE_CONFIG[style] : audienceConfig.visualStyle;

    return `**VISUAL FOUNDATION (Step 1 - Establish These Conventions):**
This is the FIRST step in the sequence. You must establish clear and consistent visual conventions that WILL BE ENFORCED in all subsequent steps:

**1. TITLE TEXT DESIGN** (CRITICAL - Must be identical across ALL steps):
Define the EXACT visual design for the step title at the top of the image:
  * Font style: (e.g., bold sans-serif, rounded, playful)
  * Font size: (e.g., 48px, large)
  * Text color: (specific hex code, e.g., #2D3748)
  * Background: (if any - color, opacity, shape behind title)
  * Position: (e.g., top-center, 30px from top edge)
  * Text effects: (shadow, outline, etc.)
  This title design MUST remain EXACTLY THE SAME in all subsequent steps - only the title text changes!

**2. STEP INDICATOR BADGE DESIGN** (CRITICAL - Must be identical across ALL steps):
Define the EXACT visual design for the step indicator badge (e.g., "STEP 1/5"):
  * Shape: (e.g., rounded rectangle, shield, circle, hexagon)
  * Background color: (specific hex code or color name)
  * Border style: (thickness, color, rounded corners radius)
  * Text style: (font weight, size, color)
  * Position: (e.g., top-right corner, 20px from edges)
  * Size: (width x height in pixels or approximate size)
  This step indicator design MUST remain EXACTLY THE SAME in all subsequent steps - only the number changes!

**3. COLOR PALETTE**: Select 3-5 core colors and specify what each represents (e.g., "water = cyan blue #0088CC", "sunlight = golden yellow #FFD700")

**4. ILLUSTRATION STYLE**: Specify line weight, shading technique, level of detail, overall artistic approach

**5. LAYOUT CONVENTIONS**: Where the title goes, where the step badge appears, how annotations and callouts are positioned

**6. TEXT STYLES FOR LABELS & EXPLANATIONS**: Font style, text size hierarchy, how labels and explanations are formatted

- Overall style: ${styleDesc}

DOCUMENT ALL these choices clearly in the visual plan. They MUST be exactly replicated in all subsequent steps.`;
  }

  // Subsequent steps - maintain consistency with Step 1
  // CRITICAL: Inject the COMPLETE Step 1 plan so Gemini can read and copy exact specifications
  const firstStepPlan = completedSteps[0].plan || "";

  return `**VISUAL CONSISTENCY CONTEXT (ENFORCE These Conventions from Step 1):**

You are generating Step ${completedSteps.length + 1} of ${totalSteps} in an existing sequence.

**CRITICAL: Below is the COMPLETE visual plan from Step 1. You MUST read it carefully and EXACTLY replicate all visual design decisions:**

<STEP_1_VISUAL_PLAN>
${firstStepPlan}
</STEP_1_VISUAL_PLAN>

**EXTRACT FROM THE STEP 1 PLAN ABOVE AND REPLICATE EXACTLY:**

**1. TITLE TEXT (Copy EXACTLY from Step 1 plan above):**
- Find the title text specifications in the Step 1 plan (font style, font size, text color, background, position, effects)
- Use the EXACT SAME font style, font size (e.g., 48px), text color (hex code), background treatment, and position
- ONLY change the actual title text content - all styling must be IDENTICAL to Step 1
- The title must be VISUALLY IDENTICAL in style to Step 1's title

**2. STEP INDICATOR BADGE (Copy EXACTLY from Step 1 plan above):**
- Find the badge specifications in the Step 1 plan (shape, colors, border, text style, position, size)
- Use the EXACT SAME shape, background color (hex code), border style, text color, position, and size
- ONLY change the number from "1" to "${completedSteps.length + 1}"
- DO NOT invent new colors or styles - copy exactly what Step 1 defined
- The badge must be VISUALLY IDENTICAL to Step 1's badge

**3. COLOR PALETTE (Copy EXACTLY from Step 1 plan above):**
- Find all hex color codes defined in Step 1's plan
- Use EXACTLY those same colors for the same concepts
- DO NOT create new colors - use the palette from Step 1
- Map: [Concept] → [Exact hex color from Step 1]

**4. ILLUSTRATION STYLE (Match EXACTLY from Step 1 plan above):**
- Copy the illustration technique, line weight, shading approach
- Match the level of detail and artistic style precisely
- Keep consistent character/object proportions

**5. LAYOUT TEMPLATE (Replicate from Step 1 plan above):**
- Title placement: same position as Step 1
- Step badge position: same corner and distance from edges
- Annotation style: same arrow types, callout boxes
- Content area: same composition and boundaries

**6. TEXT STYLES FOR LABELS & EXPLANATIONS (Copy from Step 1):**
- Use the same font styles for labels and explanatory text
- Maintain the same text hierarchy (sizes, colors, formatting)

**Previous Steps Summary:**
${completedSteps.map((step, idx) => `- Step ${idx + 1}: "${step.title}"`).join('\n')}

**CONTENT ALREADY COVERED (DO NOT REPEAT):**
The following content was already illustrated in previous steps. DO NOT include this content again in Step ${completedSteps.length + 1}:
${completedSteps.map((step, idx) => `- Step ${idx + 1} covered: "${step.title}" - ${step.description ? step.description.substring(0, 150) + '...' : 'N/A'}`).join('\n')}

**CONTENT EXCLUSION RULES:**
- DO NOT illustrate events or concepts from the list above - they were already shown
- DO NOT repeat labels, annotations, or explanations from previous steps
- Show ONLY new content specific to Step ${completedSteps.length + 1}
- If an element must appear again (continuity), show it in its NEW state, not repeat the old explanation

**NO DUPLICATE LABELS IN THIS IMAGE:**
- Each label in this image must be UNIQUE - do not use the same label text twice
- Each visual element gets ONE label, not multiple
- Avoid redundant text - don't explain the same thing in multiple places

**CRITICAL:** The viewer must see ZERO visual discontinuity. This step MUST look like it was created by the SAME ARTIST using the EXACT SAME template as Step 1. Read the Step 1 plan above and copy every visual specification precisely.`;
};

export const generateStepInfographicPlan = async (
  processName: string,
  stepNumber: number,
  totalSteps: number,
  stepTitle: string,
  stepDescription: string,
  keyEventsStr: string,
  domain: string,
  completedSteps: any[],
  lang: Language,
  audience: Audience,
  style: ArtStyle
): Promise<string> => {
  const ai = getAiClient();

  // Build visual consistency context based on previous steps
  const visualConsistencyContext = buildVisualConsistencyContext(completedSteps, totalSteps, audience, style);

  let prompt = PROCESS_STEP_PLAN_PROMPT
    .replace(/{{PROCESS_NAME}}/g, () => processName)
    .replace(/{{STEP_NUMBER}}/g, () => stepNumber.toString())
    .replace(/{{TOTAL_STEPS}}/g, () => totalSteps.toString())
    .replace(/{{STEP_TITLE}}/g, () => stepTitle)
    .replace(/{{STEP_DESCRIPTION}}/g, () => stepDescription)
    .replace(/{{KEY_EVENTS}}/g, () => keyEventsStr)
    .replace(/{{DOMAIN}}/g, () => domain)
    .replace(/{{VISUAL_CONSISTENCY_CONTEXT}}/g, () => visualConsistencyContext)
    .replace(/{{LANGUAGE}}/g, () => getLanguageName(lang));

  prompt = injectContext(prompt, audience, style);

  try {
    const response = await withTimeout(
      retryWithBackoff(() => ai.models.generateContent({
        model: TEXT_MODEL,
        contents: prompt
      })),
      60000,
      "Step plan generation"
    );

    return response.text;
  } catch (error) {
    console.error("Error generating step plan:", error);
    throw error;
  }
};
import { GoogleGenAI, Type } from "@google/genai";
import { ScientificFact, Language, Audience, ImageModelType, AspectRatio, ArtStyle, PerplexityResearchData, VisualStyleDNA, QuizQuestion } from "../types";
import { TEXT_MODEL, IMAGE_MODEL_FLASH, IMAGE_MODEL_PRO, FACT_GENERATION_PROMPT, INFOGRAPHIC_PLAN_PROMPT, CONCEPT_EXPLANATION_PROMPT, PROCESS_DISCOVERY_PROMPT, PROCESS_STEP_EXPLANATION_PROMPT, PROCESS_STEP_PLAN_PROMPT, CONCEPT_SUGGESTIONS_PROMPT, PROCESS_SUGGESTIONS_PROMPT, VISUAL_STYLE_DNA_GENERATOR_PROMPT, STYLE_CONFIG, QUIZ_GENERATION_PROMPT, VISUAL_WORKSHEET_PROMPT } from "../constants";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing. Please select a key.");
  return new GoogleGenAI({ apiKey });
};

const getLanguageName = (lang: Language) => lang === 'fr' ? 'French' : 'English';

// Helper to log prompts for debugging and analysis
const logPrompt = (functionName: string, prompt: string, additionalInfo?: Record<string, any>) => {
  console.log('\n' + '='.repeat(80));
  console.log(`🤖 LLM PROMPT | ${functionName} | ${new Date().toISOString()}`);
  console.log('='.repeat(80));
  if (additionalInfo) {
    console.log('📋 Context:', JSON.stringify(additionalInfo, null, 2));
    console.log('-'.repeat(80));
  }
  console.log('📝 PROMPT:');
  console.log(prompt);
  console.log('='.repeat(80) + '\n');
};


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

  // Log the complete prompt
  logPrompt('generateScientificFacts', prompt, { domain, language: getLanguageName(lang), audience });

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

  // Log the complete prompt
  logPrompt('generateFactFromConcept', prompt, { concept, language: getLanguageName(lang), audience });

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

export interface ConceptSuggestion {
  concept: string;
  description: string;
}

export const generateConceptSuggestions = async (
  lang: Language,
  audience: Audience
): Promise<ConceptSuggestion[]> => {
  const ai = getAiClient();
  let prompt = CONCEPT_SUGGESTIONS_PROMPT
    .replace(/{{LANGUAGE}}/g, () => getLanguageName(lang));

  prompt = injectContext(prompt, audience, 'DEFAULT');

  // Log the complete prompt
  logPrompt('generateConceptSuggestions', prompt, { language: getLanguageName(lang), audience });

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
              concept: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["concept", "description"]
          }
        }
      }
    }));

    const text = response.text;
    if (!text) {
      throw new Error("No suggestions returned from Gemini");
    }

    return JSON.parse(text) as ConceptSuggestion[];
  } catch (error) {
    console.error("Error generating concept suggestions:", error);
    throw error;
  }
};

export interface ProcessSuggestion {
  process: string;
  description: string;
}

export const generateProcessSuggestions = async (
  lang: Language,
  audience: Audience
): Promise<ProcessSuggestion[]> => {
  const ai = getAiClient();
  let prompt = PROCESS_SUGGESTIONS_PROMPT
    .replace(/{{LANGUAGE}}/g, () => getLanguageName(lang));

  prompt = injectContext(prompt, audience, 'DEFAULT');

  // Log the complete prompt
  logPrompt('generateProcessSuggestions', prompt, { language: getLanguageName(lang), audience });

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
              process: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["process", "description"]
          }
        }
      }
    }));

    const text = response.text;
    if (!text) {
      throw new Error("No suggestions returned from Gemini");
    }

    return JSON.parse(text) as ProcessSuggestion[];
  } catch (error) {
    console.error("Error generating process suggestions:", error);
    throw error;
  }
};

export const generateInfographicPlan = async (fact: ScientificFact, lang: Language, audience: Audience, style: ArtStyle, researchContext?: string): Promise<string> => {
  const ai = getAiClient();

  // Use replacer functions (() => value) to avoid issues if the content contains special replacement patterns like '$&'
  let prompt = INFOGRAPHIC_PLAN_PROMPT
    .replace('{{DOMAIN}}', () => fact.domain)
    .replace('{{TITLE}}', () => fact.title)
    .replace('{{TEXT}}', () => fact.text)
    .replace(/{{LANGUAGE}}/g, () => getLanguageName(lang));

  prompt = injectContext(prompt, audience, style);

  // If research context is provided, append it to enrich the plan
  if (researchContext) {
    prompt += `\n\n**RESEARCH CONTEXT (Use this to enhance accuracy and visual design):**\n${researchContext}`;
  }

  // Log the complete prompt
  logPrompt('generateInfographicPlan', prompt, { 
    factTitle: fact.title, 
    domain: fact.domain,
    language: getLanguageName(lang), 
    audience,
    style,
    hasResearchContext: !!researchContext 
  });

  try {
    console.log(`[Plan Generation] Starting with fact: "${fact.title}"`);
    const startTime = Date.now();

    const response = await withTimeout(
      retryWithBackoff(() => ai.models.generateContent({
        model: TEXT_MODEL,
        contents: prompt,
      })),
      120000,
      "Plan generation"
    );

    const elapsed = Date.now() - startTime;
    console.log(`[Plan Generation] API responded in ${elapsed}ms`);

    const candidate = response.candidates?.[0];
    const text = response.text || candidate?.content?.parts?.[0]?.text;

    console.log(`[Plan Generation] Finish reason: ${candidate?.finishReason}, has text: ${!!text}`);

    if (!text) {
        // Only treat non-STOP finish reasons as blocks (SAFETY, RECITATION, etc.)
        if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
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

export const generateInfographicImage = async (plan: string, model: ImageModelType, aspectRatio: AspectRatio, style: ArtStyle, timeoutMs: number = 120000, seed?: number): Promise<string> => {
  const ai = getAiClient();

  const config: any = {
      imageConfig: {
          aspectRatio: aspectRatio,
      }
  };

  // Add seed for reproducible generation (process sequences)
  if (seed !== undefined) {
    config.seed = seed;
    console.log(`[Image Generation] Using fixed seed: ${seed}`);
  }

  if (model === IMAGE_MODEL_PRO) {
      config.imageConfig.imageSize = "1K";
  }

  let styleInstruction = "";
  if (style !== 'DEFAULT') {
      styleInstruction = `\n\n**IMPORTANT VISUAL STYLE**: The infographic MUST be rendered in the following style: ${STYLE_CONFIG[style]}`;
  }

  // For process sequences, add enhanced guidance for educational text and consistency
  const isProcessSequence = timeoutMs >= 120000; // Process sequences use longer timeout

  let educationalTextGuidance = "";
  if (isProcessSequence) {
    educationalTextGuidance = `

**CRITICAL EDUCATIONAL TEXT REQUIREMENTS (For Young Learners 8-10 years old):**
This is an educational infographic designed specifically for children. The image MUST include readable text:
1. STEP BADGE: Clearly display the step number (e.g., \"STEP 2/5\") - large, visible, typically top-right
2. TITLE: Make the step title prominent and readable
3. LABELS (1-3): Clear, readable labels identifying key objects, areas, or components in the scene
4. EXPLANATIONS (2-3 sentences): Complete sentences (8-12 words each) explaining what's happening, written in simple kid-friendly language
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

  // Log the complete prompt
  logPrompt('generateInfographicImage', prompt, { 
    model, 
    aspectRatio, 
    style, 
    timeoutMs,
    seed,
    planLength: plan.length 
  });

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
      120000,
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

  // Log the complete prompt
  logPrompt('generateProcessStructure', prompt, { processName, language: getLanguageName(lang), audience });

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
      120000,
      "Process structure generation"
    );

    const responseText = response.text;
    return JSON.parse(responseText);
  } catch (error) {
    console.error("Error generating process structure:", error);
    throw error;
  }
};

export const generateVisualStyleDNA = async (
  processName: string,
  domain: string,
  totalSteps: number,
  language: Language,
  audience: Audience,
  style: ArtStyle
): Promise<VisualStyleDNA> => {
  const ai = getAiClient();

  let prompt = VISUAL_STYLE_DNA_GENERATOR_PROMPT
    .replace(/{{PROCESS_NAME}}/g, () => processName)
    .replace(/{{DOMAIN}}/g, () => domain)
    .replace(/{{TOTAL_STEPS}}/g, () => totalSteps.toString())
    .replace(/{{LANGUAGE}}/g, () => getLanguageName(language));

  prompt = injectContext(prompt, audience, style);

  // Log the complete prompt
  logPrompt('generateVisualStyleDNA', prompt, { processName, domain, totalSteps, language: getLanguageName(language), audience, style });

  try {
    console.log('[Style DNA] Generating visual style specification...');

    const response = await withTimeout(
      retryWithBackoff(() => ai.models.generateContent({
        model: TEXT_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              artStylePrompt: { type: Type.STRING },
              colorPalette: {
                type: Type.OBJECT,
                properties: {
                  primary: { type: Type.STRING },
                  secondary: { type: Type.STRING },
                  accent: { type: Type.STRING },
                  background: { type: Type.STRING },
                  text: { type: Type.STRING }
                },
                required: ["primary", "secondary", "accent", "background", "text"]
              },
              lightingAndAtmosphere: { type: Type.STRING },
              compositionRules: {
                type: Type.OBJECT,
                properties: {
                  titleStyle: { type: Type.STRING },
                  badgeStyle: { type: Type.STRING },
                  layoutTemplate: { type: Type.STRING }
                },
                required: ["titleStyle", "badgeStyle", "layoutTemplate"]
              },
              typographyStyle: { type: Type.STRING }
            },
            required: ["artStylePrompt", "colorPalette", "lightingAndAtmosphere", "compositionRules", "typographyStyle"]
          }
        }
      })),
      120000,
      "Style DNA generation"
    );

    const dna = JSON.parse(response.text) as VisualStyleDNA;
    console.log('[Style DNA] Generated:', JSON.stringify(dna, null, 2));
    return dna;

  } catch (error) {
    console.error("Error generating Style DNA:", error);
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

  // Log the complete prompt
  logPrompt('generateStepExplanation', prompt, { processName, stepNumber, totalSteps, stepTitle, language: getLanguageName(lang), audience });

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
      120000,
      "Step explanation generation"
    );

    const responseText = response.text;
    return JSON.parse(responseText);
  } catch (error) {
    console.error("Error generating step explanation:", error);
    throw error;
  }
};

// Helper to build Style DNA context for step plan generation
// Uses pre-generated DNA for visual consistency across all steps
const buildStyleDNAContext = (
  styleDNA: VisualStyleDNA,
  completedSteps: any[],
  stepNumber: number,
  totalSteps: number
): string => {
  const colorPaletteStr = Object.entries(styleDNA.colorPalette)
    .map(([key, value]) => `  - ${key}: ${value}`)
    .join('\n');

  const baseContext = `**STYLE DNA (MANDATORY VISUAL SPECIFICATIONS):**

**Art Style:** ${styleDNA.artStylePrompt}

**Color Palette (USE THESE EXACT HEX CODES):**
${colorPaletteStr}

**Lighting & Atmosphere:** ${styleDNA.lightingAndAtmosphere}

**Typography:** ${styleDNA.typographyStyle}

**Title Styling (REPLICATE EXACTLY):** ${styleDNA.compositionRules.titleStyle}

**Step Badge Styling (REPLICATE EXACTLY):** ${styleDNA.compositionRules.badgeStyle}

**Layout Template:** ${styleDNA.compositionRules.layoutTemplate}

**CRITICAL:** These specs are MANDATORY. Use exact hex codes, follow typography rules, maintain layout precisely for consistency across all ${totalSteps} steps.`;

  // Add content deduplication (independent of visual consistency)
  if (completedSteps.length > 0) {
    const contentContext = `

**CONTENT ALREADY COVERED (DO NOT REPEAT):**
${completedSteps.map((step, idx) => `- Step ${idx + 1}: "${step.title}" - ${step.description?.substring(0, 100) || 'N/A'}...`).join('\n')}

**FOCUS FOR STEP ${stepNumber}:**
- Show ONLY what happens in THIS step
- DO NOT repeat content from previous steps
- Each label must be UNIQUE within this image`;

    return baseContext + contentContext;
  }

  return baseContext;
};

// DEPRECATED: Legacy visual consistency context builder (fallback only)
// Use buildStyleDNAContext instead for new code. This is kept for fallback if DNA generation fails.
const buildVisualConsistencyContextLegacy = (
  completedSteps: any[],
  totalSteps: number
): string => {
  if (completedSteps.length === 0) {
    return `**VISUAL FOUNDATION (Step 1 - Establish These Conventions):**
This is the FIRST step in the sequence. You must establish clear visual conventions that will be enforced in all subsequent steps.
Define the EXACT visual design for:
1. TITLE: Font style, size, color (hex), position, effects
2. STEP BADGE: Shape, background color, border style, text style, position
3. COLOR PALETTE: 3-5 core colors with hex codes
4. ILLUSTRATION STYLE: Line weight, shading, level of detail
5. LAYOUT CONVENTIONS: Title placement, badge position, annotation style
6. TEXT STYLES: Font styles for labels and explanations
Document ALL these choices clearly in the visual plan. They MUST be exactly replicated in all subsequent steps.`;
  }

  const firstStepPlan = completedSteps[0].plan || "";
  return `**VISUAL CONSISTENCY CONTEXT (ENFORCE from Step 1):**

You are generating Step ${completedSteps.length + 1} of ${totalSteps}.

**CRITICAL: Below is the visual plan from Step 1. You MUST replicate all visual design decisions:**

<STEP_1_VISUAL_PLAN>
${firstStepPlan}
</STEP_1_VISUAL_PLAN>

**Extract from Step 1 plan above and replicate EXACTLY:**
1. TITLE TEXT: Same font style, size (px), text color (hex), background, position - only change text content
2. STEP INDICATOR BADGE: Same shape, colors (hex), border, position, size - only change the step number
3. COLOR PALETTE: Use EXACTLY same colors and hex codes from Step 1
4. ILLUSTRATION STYLE: Match drawing technique, line weight, shading, level of detail
5. LAYOUT TEMPLATE: Same title placement, badge position, annotation style
6. TEXT STYLES: Same font styles for labels and explanations

**Previous Steps:** ${completedSteps.map((step, idx) => `Step ${idx + 1}: "${step.title}"`).join(', ')}

**DO NOT REPEAT:** The following content was already shown - DO NOT include it again:
${completedSteps.map((step, idx) => `- Step ${idx + 1}: ${step.description?.substring(0, 100) || 'N/A'}...`).join('\n')}

**CRITICAL:** Zero visual discontinuity. This step MUST look like it was created by the SAME ARTIST using the EXACT SAME template as Step 1.`;
};

export const generateStepInfographicPlan = async (
  processName: string,
  stepNumber: number,
  totalSteps: number,
  stepTitle: string,
  stepDescription: string,
  keyEventsStr: string,
  domain: string,
  styleDNA: VisualStyleDNA,
  completedSteps: any[],
  lang: Language,
  audience: Audience,
  style: ArtStyle,
  processResearch?: PerplexityResearchData
): Promise<string> => {
  const ai = getAiClient();

  // Build style DNA context for visual consistency (fallback to legacy if styleDNA is null)
  let visualConsistencyContext: string;
  if (styleDNA) {
    visualConsistencyContext = buildStyleDNAContext(styleDNA, completedSteps, stepNumber, totalSteps);
  } else {
    console.warn("[Step Plan] styleDNA is null, using legacy visual consistency approach");
    visualConsistencyContext = buildVisualConsistencyContextLegacy(completedSteps, totalSteps);
  }

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

  // Inject research context if available
  if (processResearch && !processResearch.error) {
    const researchContextParts: string[] = [];

    if (processResearch.accuracy.findings.length > 0) {
      researchContextParts.push(`Scientific accuracy guidelines:\n- ${processResearch.accuracy.findings.join('\n- ')}`);
    }
    if (processResearch.stepBreakdown && processResearch.stepBreakdown.steps.length > 0) {
      researchContextParts.push(`Recommended educational step breakdown:\n- ${processResearch.stepBreakdown.steps.join('\n- ')}`);
    }
    if (processResearch.visualGuidance.descriptions.length > 0) {
      researchContextParts.push(`Visual representation approaches:\n- ${processResearch.visualGuidance.descriptions.join('\n- ')}`);
    }
    if (processResearch.misconceptions.length > 0) {
      researchContextParts.push(`Common misconceptions to avoid:\n- ${processResearch.misconceptions.join('\n- ')}`);
    }
    if (processResearch.analogies.length > 0) {
      researchContextParts.push(`Age-appropriate analogies:\n- ${processResearch.analogies.join('\n- ')}`);
    }

    if (researchContextParts.length > 0) {
      const researchContext = researchContextParts.join('\n\n');
      prompt += `\n\n**RESEARCH-ENHANCED CONTEXT (Use this to enhance accuracy and visual design):**\n${researchContext}`;
      console.log('[Step Plan] Research context injected:', researchContext.substring(0, 300) + '...');
    } else {
      console.log('[Step Plan] No research context available (empty research data)');
    }
  } else if (processResearch?.error) {
    console.log('[Step Plan] Research had errors, skipping context injection');
  } else {
    console.log('[Step Plan] No research data provided');
  }

  // Log the complete prompt
  logPrompt('generateStepInfographicPlan', prompt, { 
    processName, 
    stepNumber, 
    totalSteps, 
    stepTitle,
    domain,
    language: getLanguageName(lang), 
    audience,
    style,
    hasStyleDNA: !!styleDNA,
    hasResearchContext: !!(processResearch && !processResearch.error)
  });

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

export interface QuizData {
  title: string;
  questions: QuizQuestion[];
}

export const generateQuizFromFacts = async (
  facts: ScientificFact[],
  lang: Language,
  audience: Audience
): Promise<QuizData> => {
  const ai = getAiClient();
  
  const factsText = facts.map(f => `- ${f.title}: ${f.text}`).join('\n');
  
  let prompt = QUIZ_GENERATION_PROMPT
    .replace('{{FACTS}}', () => factsText)
    .replace(/{{LANGUAGE}}/g, () => getLanguageName(lang));

  prompt = injectContext(prompt, audience, 'DEFAULT');

  logPrompt('generateQuizFromFacts', prompt, { factCount: facts.length, language: getLanguageName(lang), audience });

  try {
    const response = await retryWithBackoff(() => ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  correctAnswerIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING }
                },
                required: ["id", "question", "options", "correctAnswerIndex", "explanation"]
              }
            }
          },
          required: ["title", "questions"]
        }
      }
    }));

    const text = response.text;
    if (!text) {
      throw new Error("No quiz returned from Gemini");
    }

    return JSON.parse(text) as QuizData;
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw error;
  }
};

/**
 * Generates a detailed image prompt for a Visual Worksheet (static quiz poster).
 * This prompt is then used with generateInfographicImage to create the actual image.
 */
export const generateVisualQuizPrompt = async (
  facts: ScientificFact[],
  lang: Language,
  audience: Audience,
  style: ArtStyle
): Promise<string> => {
  const ai = getAiClient();
  
  // Format facts for the prompt
  const factsText = facts.map(f => `- ${f.title}: ${f.text}`).join('\n');
  
  let prompt = VISUAL_WORKSHEET_PROMPT
    .replace('{{FACTS}}', () => factsText)
    .replace(/{{LANGUAGE}}/g, () => getLanguageName(lang));

  prompt = injectContext(prompt, audience, style);

  logPrompt('generateVisualQuizPrompt', prompt, { 
    factCount: facts.length, 
    language: getLanguageName(lang), 
    audience,
    style 
  });

  try {
    console.log(`[Visual Quiz] Generating image prompt for ${facts.length} facts...`);
    const startTime = Date.now();

    const response = await withTimeout(
      retryWithBackoff(() => ai.models.generateContent({
        model: TEXT_MODEL,
        contents: prompt
      })),
      60000,
      "Visual worksheet prompt generation"
    );

    const elapsed = Date.now() - startTime;
    console.log(`[Visual Quiz] Prompt generated in ${elapsed}ms`);

    const text = response.text;
    if (!text) {
      throw new Error("No visual quiz prompt returned from Gemini");
    }

    return text;
  } catch (error) {
    console.error("Error generating visual quiz prompt:", error);
    throw error;
  }
};

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

  // Explicit instruction to ensure the model behaves as an image generator
  const prompt = `Generate a high-quality educational infographic image based on the following detailed plan:${styleInstruction}\n\n${plan}`;

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

export const generateStepInfographicPlan = async (
  processName: string,
  stepNumber: number,
  totalSteps: number,
  stepTitle: string,
  stepDescription: string,
  keyEventsStr: string,
  lang: Language,
  audience: Audience,
  style: ArtStyle
): Promise<string> => {
  const ai = getAiClient();
  let prompt = PROCESS_STEP_PLAN_PROMPT
    .replace(/{{PROCESS_NAME}}/g, () => processName)
    .replace(/{{STEP_NUMBER}}/g, () => stepNumber.toString())
    .replace(/{{TOTAL_STEPS}}/g, () => totalSteps.toString())
    .replace(/{{STEP_TITLE}}/g, () => stepTitle)
    .replace(/{{STEP_DESCRIPTION}}/g, () => stepDescription)
    .replace(/{{KEY_EVENTS}}/g, () => keyEventsStr)
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
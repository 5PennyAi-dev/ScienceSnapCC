import { GoogleGenAI, Type } from "@google/genai";
import { ScientificFact, Language } from "../types";
import { TEXT_MODEL, IMAGE_MODEL, FACT_GENERATION_PROMPT, INFOGRAPHIC_PLAN_PROMPT, CONCEPT_EXPLANATION_PROMPT } from "../constants";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing. Please select a key.");
  return new GoogleGenAI({ apiKey });
};

const getLanguageName = (lang: Language) => lang === 'fr' ? 'French' : 'English';

export const generateScientificFacts = async (domain: string, lang: Language): Promise<ScientificFact[]> => {
  const ai = getAiClient();
  const prompt = FACT_GENERATION_PROMPT
    .replace('{{DOMAIN}}', domain)
    .replace('{{LANGUAGE}}', getLanguageName(lang));

  try {
    const response = await ai.models.generateContent({
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
    });

    const text = response.text;
    if (!text) throw new Error("No text returned from Gemini");
    
    return JSON.parse(text) as ScientificFact[];
  } catch (error) {
    console.error("Error generating facts:", error);
    throw error;
  }
};

export const generateFactFromConcept = async (concept: string, lang: Language): Promise<ScientificFact> => {
  const ai = getAiClient();
  const prompt = CONCEPT_EXPLANATION_PROMPT
    .replace('{{CONCEPT}}', concept)
    .replace('{{LANGUAGE}}', getLanguageName(lang));

  try {
    const response = await ai.models.generateContent({
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
    });

    const text = response.text;
    if (!text) throw new Error("No text returned from Gemini");
    
    return JSON.parse(text) as ScientificFact;
  } catch (error) {
    console.error("Error generating concept fact:", error);
    throw error;
  }
};

export const generateInfographicPlan = async (fact: ScientificFact, lang: Language): Promise<string> => {
  const ai = getAiClient();
  // Using global regex replacement instead of replaceAll for compatibility
  const prompt = INFOGRAPHIC_PLAN_PROMPT
    .replace('{{DOMAIN}}', fact.domain)
    .replace('{{TITLE}}', fact.title)
    .replace('{{TEXT}}', fact.text)
    .replace(/{{LANGUAGE}}/g, getLanguageName(lang));

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
    });

    const text = response.text;
    if (!text) throw new Error("No plan returned from Gemini");
    return text;
  } catch (error) {
    console.error("Error generating plan:", error);
    throw error;
  }
};

export const generateInfographicImage = async (plan: string): Promise<string> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: plan,
      config: {
        imageConfig: {
          aspectRatio: "3:4", // Portrait for infographics
          imageSize: "1K"
        }
      }
    });

    // Extract image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};

export const editInfographic = async (base64Image: string, instruction: string): Promise<string> => {
  const ai = getAiClient();
  try {
    // Strip prefix if present for the API call
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: {
        parts: [
          {
            text: instruction
          },
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanBase64
            }
          }
        ]
      },
      config: {
        imageConfig: {
            aspectRatio: "3:4", 
            imageSize: "1K" 
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      
    throw new Error("No edited image data found in response");

  } catch (error) {
    console.error("Error editing image:", error);
    throw error;
  }
};
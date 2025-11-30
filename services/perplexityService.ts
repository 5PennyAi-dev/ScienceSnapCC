import { Audience, Language, PerplexityResearchData, FactResearchData } from '../types';

// Fallback: Use direct HTTP API calls to Perplexity instead of SDK
// This is more reliable for ES module environments
const makePerplexityRequest = async (messages: any[]) => {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error("Perplexity API Key is missing. Falling back to direct generation.");
  }

  // Use proxy in development to avoid CORS issues
  const apiUrl = '/api/perplexity/chat/completions';

  console.log('[Perplexity] Making request to:', apiUrl);

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'sonar-pro',
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  console.log('[Perplexity] Response status:', response.status, response.statusText);

  if (!response.ok) {
    // Try to get error details
    const errorText = await response.text();
    console.error('[Perplexity] Error response:', errorText);
    throw new Error(`Perplexity API error (${response.status}): ${errorText || response.statusText}`);
  }

  // Get raw text first to debug
  const responseText = await response.text();
  console.log('[Perplexity] Raw response length:', responseText.length);

  if (!responseText || responseText.trim() === '') {
    throw new Error('Perplexity API returned empty response');
  }

  try {
    return JSON.parse(responseText);
  } catch (parseErr) {
    console.error('[Perplexity] Failed to parse response:', responseText.substring(0, 500));
    throw new Error(`Failed to parse Perplexity response: ${responseText.substring(0, 100)}`);
  }
};

// Helper to handle 503 (Overloaded) and 429 (Rate Limit) errors with retries
// Reuses pattern from geminiService.ts
const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  retries = 3,
  initialDelay = 2000
): Promise<T> => {
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
      console.warn(`Perplexity API Busy/Rate Limited. Retrying in ${initialDelay}ms... (${retries} attempts left)`);
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
      reject(new Error(`${operation} timed out after ${timeoutMs / 1000} seconds.`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
};

// Helper to format audience description for research prompt
const getAudienceDescription = (audience: Audience): string => {
  return audience === 'young' ? 'children aged 8-10' : 'university students and adults';
};

// Helper to get language name
const getLanguageName = (language: Language): string => {
  return language === 'fr' ? 'French' : 'English';
};

// Build research prompt - requests structured educational research
const buildResearchPrompt = (
  processName: string,
  audienceDesc: string,
  language: string
): string => {
  return `You are a research assistant gathering educational resources for explaining the "${processName}" process to ${audienceDesc}.

Your task is to research and provide structured educational information in JSON format.

Research and provide the following:

1. SCIENTIFIC ACCURACY: Key scientific principles, mechanisms, and terminology
2. EDUCATIONAL BREAKDOWN: How educators typically break down this process into sequential steps
3. VISUAL DESCRIPTIONS: How this process is typically visualized in educational materials
4. COMMON MISCONCEPTIONS: What students often misunderstand about this process
5. AGE-APPROPRIATE ANALOGIES: Helpful metaphors or comparisons for ${audienceDesc}

Focus on:
- Peer-reviewed educational sources
- Science textbooks and curricula
- Educational websites (.edu, .gov)
- Reputable science communication sources

Return ONLY a valid JSON object with this exact structure:
{
  "accuracy": {
    "findings": ["principle 1", "principle 2", "principle 3"],
    "sources": ["source url 1", "source url 2"]
  },
  "stepBreakdown": {
    "steps": ["step description 1", "step description 2", "step description 3"],
    "sources": ["source url 1"]
  },
  "visualGuidance": {
    "descriptions": ["visual approach 1", "visual approach 2"],
    "sources": ["source url 1"]
  },
  "misconceptions": ["misconception 1", "misconception 2"],
  "analogies": ["analogy 1", "analogy 2"]
}

Language for output: ${language}

IMPORTANT: Return ONLY the JSON object, no other text. Ensure all text is in ${language}.`;
};

// Main research function - called by App.tsx during process generation
export const researchProcessForEducation = async (
  processName: string,
  audience: Audience,
  language: Language
): Promise<PerplexityResearchData> => {
  try {
    const audienceDesc = getAudienceDescription(audience);
    const languageName = getLanguageName(language);

    console.log(`[Perplexity Research] Starting research for: "${processName}" (audience: ${audience}, language: ${languageName})`);
    const startTime = Date.now();

    // Call Perplexity API with 30-second timeout
    const response = await withTimeout(
      retryWithBackoff(() =>
        makePerplexityRequest([
          {
            role: 'system',
            content: 'You are an educational research assistant specializing in science education. Always return valid JSON.'
          },
          {
            role: 'user',
            content: buildResearchPrompt(processName, audienceDesc, languageName)
          }
        ])
      ),
      30000,
      'Perplexity research'
    );

    const elapsed = Date.now() - startTime;
    console.log(`[Perplexity Research] Completed in ${elapsed}ms`);

    // Parse response
    let researchData: any;
    const responseContent = response.choices[0].message.content;

    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      let jsonString = responseContent.trim();

      // Remove markdown code blocks if present (handle various formats)
      // Match ```json ... ``` or ``` ... ```
      const codeBlockMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1].trim();
        console.log('[Perplexity Research] Extracted JSON from code block');
      }

      // Try to find JSON object in the response (handle malformed JSON with extra text)
      // Find the first { and last }
      const firstBrace = jsonString.indexOf('{');
      const lastBrace = jsonString.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonString = jsonString.substring(firstBrace, lastBrace + 1);
        console.log('[Perplexity Research] Extracted JSON object from response');
      }

      researchData = JSON.parse(jsonString);
      console.log('[Perplexity Research] ✓ Successfully parsed research data');
    } catch (parseError) {
      console.warn('[Perplexity Research] Failed to parse JSON response, using defaults');
      console.warn('Parse error:', parseError instanceof Error ? parseError.message : String(parseError));
      console.warn('Response was:', responseContent.substring(0, 300));
      researchData = {};
    }

    // Extract citations if available
    const citations: string[] = [];
    if (response.citations && Array.isArray(response.citations)) {
      citations.push(...response.citations);
    }

    // Return structured research data
    const result: PerplexityResearchData = {
      processName,
      accuracy: researchData.accuracy || { findings: [], sources: [] },
      stepBreakdown: researchData.stepBreakdown || { steps: [], sources: [] },
      visualGuidance: researchData.visualGuidance || { descriptions: [], sources: [] },
      misconceptions: Array.isArray(researchData.misconceptions) ? researchData.misconceptions : [],
      analogies: Array.isArray(researchData.analogies) ? researchData.analogies : [],
      citations,
      timestamp: Date.now()
    };

    console.log('[Perplexity Research] ✓ Research complete with', {
      accuracy_findings: result.accuracy.findings.length,
      step_suggestions: result.stepBreakdown.steps.length,
      visual_descriptions: result.visualGuidance.descriptions.length,
      misconceptions: result.misconceptions.length,
      analogies: result.analogies.length
    });

    return result;
  } catch (error: any) {
    console.warn('[Perplexity Research] Failed:', error.message);
    console.warn('[Perplexity Research] Proceeding without research context');

    // Return empty research data to enable graceful fallback
    // This allows the app to continue generation without research context
    return {
      processName,
      accuracy: { findings: [], sources: [] },
      stepBreakdown: { steps: [], sources: [] },
      visualGuidance: { descriptions: [], sources: [] },
      misconceptions: [],
      analogies: [],
      citations: [],
      timestamp: Date.now(),
      error: error.message
    };
  }
};

// Build research prompt for a single scientific fact (Explore Domain mode)
const buildFactResearchPrompt = (
  factTitle: string,
  factText: string,
  domain: string,
  audienceDesc: string,
  language: string
): string => {
  return `Research this scientific topic and provide educational content.

TOPIC: "${factTitle}"
DOMAIN: ${domain}
CONTEXT: "${factText}"
TARGET AUDIENCE: ${audienceDesc}

I need you to search for accurate scientific information and return a JSON object with these fields:

1. "scientificDetails" - Array of 3-5 specific scientific facts about this topic. Be specific and educational. Example: "Butterflies taste with sensors called chemoreceptors located on their feet, containing over 200 taste receptors"

2. "visualMetaphors" - Array of 2-3 ways to visually represent this concept for an infographic. Example: "Show a butterfly foot with magnified taste sensors like tiny tongues"

3. "analogies" - Array of 2-3 simple comparisons to explain this to ${audienceDesc}. Example: "It's like if you could taste your food just by stepping on it!"

4. "misconceptions" - Array of 1-2 common wrong beliefs about this topic. Example: "Butterflies don't actually eat with their mouths - they only drink liquids"

RESPOND WITH ONLY THIS JSON FORMAT (no other text, no markdown):
{"scientificDetails":["fact1","fact2","fact3"],"visualMetaphors":["visual1","visual2"],"analogies":["analogy1","analogy2"],"misconceptions":["misconception1"]}

All content must be in ${language}.`;
};

// Research function for single facts - called during Explore Domain flow
export const researchFactForInfographic = async (
  factTitle: string,
  factText: string,
  domain: string,
  audience: Audience,
  language: Language
): Promise<FactResearchData> => {
  try {
    const audienceDesc = getAudienceDescription(audience);
    const languageName = getLanguageName(language);

    console.log(`[Perplexity Fact Research] Starting research for: "${factTitle}" (audience: ${audience}, language: ${languageName})`);
    const startTime = Date.now();

    // Call Perplexity API with 30-second timeout
    const response = await withTimeout(
      retryWithBackoff(() =>
        makePerplexityRequest([
          {
            role: 'system',
            content: 'You are an educational research assistant specializing in science education. Always return valid JSON.'
          },
          {
            role: 'user',
            content: buildFactResearchPrompt(factTitle, factText, domain, audienceDesc, languageName)
          }
        ])
      ),
      30000,
      'Perplexity fact research'
    );

    const elapsed = Date.now() - startTime;
    console.log(`[Perplexity Fact Research] Completed in ${elapsed}ms`);

    // Parse response
    let researchData: any;
    const responseContent = response.choices[0].message.content;
    console.log('[Perplexity Fact Research] Raw response content:', responseContent);

    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      let jsonString = responseContent;

      // Remove markdown code blocks if present
      const jsonMatch = responseContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonString = jsonMatch[1].trim();
        console.log('[Perplexity Fact Research] Extracted JSON from code block');
      }

      // Try to find JSON object in the response
      const jsonObjectMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        jsonString = jsonObjectMatch[0];
      }

      researchData = JSON.parse(jsonString);
      console.log('[Perplexity Fact Research] Successfully parsed research data:', researchData);
    } catch (parseError) {
      console.warn('[Perplexity Fact Research] Failed to parse JSON response, using defaults');
      console.warn('Response was:', responseContent);
      researchData = {};
    }

    // Extract citations if available
    const sources: string[] = [];
    if (researchData.sources && Array.isArray(researchData.sources)) {
      sources.push(...researchData.sources);
    }
    if (response.citations && Array.isArray(response.citations)) {
      sources.push(...response.citations);
    }

    // Return structured research data
    const result: FactResearchData = {
      factTitle,
      scientificDetails: Array.isArray(researchData.scientificDetails) ? researchData.scientificDetails : [],
      visualMetaphors: Array.isArray(researchData.visualMetaphors) ? researchData.visualMetaphors : [],
      analogies: Array.isArray(researchData.analogies) ? researchData.analogies : [],
      misconceptions: Array.isArray(researchData.misconceptions) ? researchData.misconceptions : [],
      sources,
      timestamp: Date.now()
    };

    console.log('[Perplexity Fact Research] Research complete with', {
      scientificDetails: result.scientificDetails.length,
      visualMetaphors: result.visualMetaphors.length,
      analogies: result.analogies.length,
      misconceptions: result.misconceptions.length
    });

    return result;
  } catch (error: any) {
    console.warn('[Perplexity Fact Research] Failed:', error.message);
    console.warn('[Perplexity Fact Research] Proceeding without research context');

    // Return empty research data to enable graceful fallback
    return {
      factTitle,
      scientificDetails: [],
      visualMetaphors: [],
      analogies: [],
      misconceptions: [],
      sources: [],
      timestamp: Date.now(),
      error: error.message
    };
  }
};

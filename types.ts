
export interface ScientificFact {
  domain: string;
  title: string;
  text: string;
}

export interface InfographicStep {
  stepNumber: number;
  title: string;
  description: string;
  plan: string;
  imageUrl: string; // Base64
}

export interface InfographicItem {
  id: string;
  timestamp: number;
  fact: ScientificFact;
  imageUrl?: string; // Base64 (optional for sequence items)
  plan?: string; // (optional for sequence items)
  // New fields for sequences
  isSequence?: boolean;
  steps?: InfographicStep[];
  totalSteps?: number;
  // Perplexity research data (for Explore Domain and Concept modes)
  research?: FactResearchData;
  // Perplexity research data (for Process/Sequence mode)
  processResearch?: PerplexityResearchData;
  // Style DNA for sequence consistency (Process/Sequence mode only)
  styleDNA?: VisualStyleDNA;
  seed?: number; // Fixed seed used for generation
  // Metadata fields
  aspectRatio?: AspectRatio;
  style?: ArtStyle;
  audience?: Audience;
  modelName?: string;
  language?: Language;
}

export type AppState = 'input' | 'selection' | 'planning' | 'generating' | 'result' | 'gallery';

export type SearchMode = 'domain' | 'concept' | 'process';

export enum AspectRatio {
  SQUARE = '1:1',
  PORTRAIT = '3:4',
  INSTAGRAM = '4:5',
  LANDSCAPE = '4:3',
  TALL = '9:16'
}

export type Language = 'en' | 'fr';

export type Audience = 'young' | 'adult';

export type ImageModelType = 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview';

export type ArtStyle = 'DEFAULT' | 'PIXEL' | 'CLAY' | 'ORIGAMI' | 'WATERCOLOR' | 'CYBERPUNK' | 'VINTAGE' | 'NEON' | 'MANGA' | 'GHIBLI';

export interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

// Perplexity Research Data for Process/Sequence mode
export interface PerplexityResearchData {
  processName: string;
  accuracy: { findings: string[]; sources: string[] };
  stepBreakdown: { steps: string[]; sources: string[] };
  visualGuidance: { descriptions: string[]; sources: string[] };
  misconceptions: string[];
  analogies: string[];
  citations: string[];
  timestamp: number;
  error?: string;
}

// Perplexity Research Data for single Fact/Concept (Explore Domain mode)
export interface FactResearchData {
  factTitle: string;
  scientificDetails: string[];
  visualMetaphors: string[];
  analogies: string[];
  misconceptions: string[];
  sources: string[];
  timestamp: number;
  error?: string;
}

// Visual Style DNA for Process/Sequence consistency
export interface VisualStyleDNA {
  artStylePrompt: string; // Overall artistic approach
  colorPalette: {
    primary: string; // Hex code with concept label
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  lightingAndAtmosphere: string; // Lighting and mood description
  compositionRules: {
    titleStyle: string; // Font, size, color, position specifications
    badgeStyle: string; // Step badge styling specifications
    layoutTemplate: string; // Element arrangement rules
  };
  typographyStyle: string; // Font characteristics and hierarchy
}
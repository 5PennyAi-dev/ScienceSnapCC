
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
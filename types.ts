export interface ScientificFact {
  domain: string;
  title: string;
  text: string;
}

export interface InfographicItem {
  id: string;
  timestamp: number;
  fact: ScientificFact;
  imageUrl: string; // Base64
  plan: string;
}

export type AppState = 'input' | 'selection' | 'planning' | 'generating' | 'result' | 'gallery';

export enum AspectRatio {
  SQUARE = '1:1',
  PORTRAIT = '3:4',
  LANDSCAPE = '4:3',
  TALL = '9:16'
}
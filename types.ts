export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Memo {
  id: string;
  title: string;
  content: string;
  location: Coordinates;
  address?: string;
  radius: number; // in meters
  isTriggered: boolean; // Has the user been notified recently?
  color: string;
  createdAt: number;
  aiSuggested?: boolean;
  groundingUrls?: Array<{ uri: string; title: string }>;
}

export interface SuggestionResult {
  text: string;
  groundingUrls: Array<{ uri: string; title: string }>;
}

export enum ViewMode {
  MAP = 'MAP',
  LIST = 'LIST',
}

export const COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#a855f7', // purple
  '#ec4899', // pink
];

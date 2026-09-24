import type { Analysis, Feedback, Save } from '../../shared/schema';
export interface AIProvider {
  analyzeCollection(items: Save[]): Promise<Analysis>;
  refineTasteMap(items: Save[], previous: Analysis, feedback: Feedback[]): Promise<Analysis>;
}

import { z } from 'zod';
import { analysisSchema, collectionSchema, feedbackSchema } from '../../shared/schema';

export const historyKey = 'cangjian.memories.v1';
const memorySchema = z.object({
  id: z.string(), title: z.string().min(1).max(60), date: z.string().datetime(),
  items: collectionSchema, result: analysisSchema,
  feedback: z.record(feedbackSchema.shape.value),
});
export type Memory = z.infer<typeof memorySchema>;
export function readMemories(): Memory[] {
  const raw = localStorage.getItem(historyKey);
  return raw ? z.array(memorySchema).parse(JSON.parse(raw)) : [];
}
export function writeMemories(records: Memory[]) {
  localStorage.setItem(historyKey, JSON.stringify(records));
}
export function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

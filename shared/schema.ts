import { z } from 'zod';
export const itemSchema = z.object({ id: z.string().min(1).max(80), title: z.string().trim().min(1).max(160), content: z.string().max(3000), tags: z.array(z.string().max(40)).max(12).default([]), thumbnail: z.string().max(1000).optional() });
export const collectionSchema = z.array(itemSchema).min(3, '再放几条进来吧，至少需要 3 条收藏。').max(20, '一次最多分析 20 条收藏。').refine(items => new Set(items.map(i => i.id)).size === items.length, '收藏 ID 不能重复。');
const ids = z.array(z.string()).min(1).max(20);
export const analysisSchema = z.object({
  collectionSummary: z.string().min(1).max(800),
  clusters: z.array(z.object({ id: z.string().min(1), name: z.string().min(1).max(24), description: z.string().max(600), itemIds: ids })).max(4),
  patterns: z.array(z.object({ id: z.string().min(1), name: z.string().min(1).max(24), description: z.string().min(1).max(800), evidence: ids.min(2), strength: z.number().min(0).max(1) })).max(5),
  tensions: z.array(z.object({ id: z.string().min(1), name: z.string().min(1).max(50), description: z.string().max(800), evidence: ids.min(2), sides: z.tuple([z.object({ name: z.string().max(24), itemIds: ids }), z.object({ name: z.string().max(24), itemIds: ids })]) })).max(2),
});
export const feedbackSchema = z.object({ patternId: z.string(), value: z.enum(['yes', 'no', 'maybe']) });
export type Save = z.infer<typeof itemSchema>;
export type Analysis = z.infer<typeof analysisSchema>;
export type Pattern = Analysis['patterns'][number];
export type Feedback = z.infer<typeof feedbackSchema>;
export type Mode = 'demo' | 'live';
export type AnalysisResponse = { analysis: Analysis; mode: Mode };
export function validateAnalysis(input: unknown, items: Save[]): Analysis {
  const analysis = analysisSchema.parse(input);
  const allowed = new Set(items.map(i => i.id));
  const all = [...analysis.clusters, ...analysis.patterns, ...analysis.tensions];
  if (new Set(all.map(i => i.id)).size !== all.length) throw new Error('分析中出现重复的 ID。');
  for (const group of all) {
    const evidence = 'itemIds' in group ? group.itemIds : group.evidence;
    if (evidence.some(id => !allowed.has(id)) || new Set(evidence).size !== evidence.length) throw new Error('分析引用了无效的收藏。');
  }
  for (const t of analysis.tensions) {
    for (const side of t.sides) {
      if (new Set(side.itemIds).size !== side.itemIds.length || side.itemIds.some(id => !allowed.has(id) || !t.evidence.includes(id))) throw new Error('不同方向的依据无效。');
    }
  }
  return analysis;
}

import { validateAnalysis, type AnalysisResponse, type Save, type Analysis, type Feedback } from '../../shared/schema';
export async function analyze(items: Save[], signal?: AbortSignal, refinement?: { previous: Analysis; feedback: Feedback[] }): Promise<AnalysisResponse> {
  let response: Response;
  try { response = await fetch(refinement ? '/api/refine' : '/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items, ...refinement }), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(55_000)]) : AbortSignal.timeout(55_000) }); }
  catch (e) { if (signal?.aborted) throw e; throw new Error('暂时连不上分析服务。你的收藏还在，可以再试一次。'); }
  let data;
  try { data = await response.json(); } catch { throw new Error('服务返回的内容暂时无法读取，请重试。'); }
  if (!response.ok) throw new Error(data.message || '这次没看清，再试一次。');
  try { return { analysis: validateAnalysis(data.analysis, items), mode: data.mode === 'live' ? 'live' : 'demo' }; } catch { throw new Error('这次的分析依据不完整，重新看一次吧。'); }
}
export function parseSaves(text: string): Save[] {
  return text.trim().split(/\n\s*\n/).filter(Boolean).map((block, n) => {
    const [title, ...rest] = block.trim().split('\n');
    const tags = [...block.matchAll(/#([^\s#]+)/g)].map(m => m[1]);
    return { id: `own_${n + 1}`, title: title.trim(), content: rest.join('\n').trim(), tags };
  });
}

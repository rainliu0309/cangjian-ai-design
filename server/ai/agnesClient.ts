import type { AIProvider } from './provider';
import { validateAnalysis, type Save, type Analysis, type Feedback } from '../../shared/schema';
import { systemPrompt } from './prompts';
export class ProviderError extends Error { constructor(public code: string, message: string, public status = 502) { super(message); } }
export function parseModelJSON(raw: string): unknown {
  const text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  if (text.length > 80_000) throw new ProviderError('INVALID_RESPONSE', '这次返回的内容太长，请重试。');
  try { return JSON.parse(text); } catch { throw new ProviderError('INVALID_RESPONSE', '这次没能读清分析结果，请重试。'); }
}
export class AgnesAdapter implements AIProvider {
  constructor(private config: { key: string; baseURL: string; model: string }) {}
  private async request(items: Save[], context?: { previous: Analysis; feedback: Feedback[] }): Promise<Analysis> {
    let result: Response;
    try {
      result = await fetch(`${this.config.baseURL.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST', signal: AbortSignal.timeout(45_000),
        headers: { Authorization: `Bearer ${this.config.key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.config.model, temperature: 0.3, response_format: { type: 'json_object' }, messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify({ analysis_goal: '发现本组收藏中有依据的偏好线索', language: 'zh-CN', items: items.map(({ id, title, content, tags }) => ({ id, title, content, tags })), ...context }) },
        ] }),
      });
    } catch (error) {
      throw new ProviderError('NETWORK_ERROR', error instanceof Error && /timeout|abort/i.test(error.name) ? '分析比预计更久，你的收藏还在。再试一次吧。' : '暂时连不上分析服务，你的收藏还在。');
    }
    if (!result.ok) throw new ProviderError('PROVIDER_ERROR', result.status === 401 || result.status === 403 ? '分析服务的凭据需要检查，请联系部署者。' : result.status === 429 ? '分析服务暂时繁忙，稍后再试一次。' : '这次没看清，再试一次。');
    try {
      const body = await result.json();
      const content = body?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') throw new Error('Missing content');
      return validateAnalysis(parseModelJSON(content), items);
    } catch { throw new ProviderError('INVALID_RESPONSE', '这次的分析依据不完整，重新看一次吧。'); }
  }
  analyzeCollection(items: Save[]) { return this.request(items); }
  refineTasteMap(items: Save[], previous: Analysis, feedback: Feedback[]) { return this.request(items, { previous, feedback }); }
}

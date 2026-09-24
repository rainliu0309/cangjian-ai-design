import express from 'express';
import { z } from 'zod';
import { collectionSchema, analysisSchema, feedbackSchema, validateAnalysis } from '../shared/schema';
import { AgnesAdapter, ProviderError } from './ai/agnesClient';
import { DemoProvider } from './ai/demoProvider';
export function createApp(env: NodeJS.ProcessEnv = process.env) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));
  const configured = !!(env.AGNES_API_KEY && env.AGNES_BASE_URL && env.AGNES_TEXT_MODEL);
  const partial = !!env.AGNES_API_KEY && !configured;
  const provider = configured ? new AgnesAdapter({ key: env.AGNES_API_KEY!, baseURL: env.AGNES_BASE_URL!, model: env.AGNES_TEXT_MODEL! }) : new DemoProvider();
  const mode = configured ? 'live' : 'demo';
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', mode, agnesConfigured: configured, configurationIncomplete: partial }));
  // Local-only demo by default; reject cross-origin browser writes and bound concurrent provider work.
  let active = 0;
  app.use('/api', (req, res, next) => {
    if (req.method !== 'POST') return next();
    const origin = req.get('origin');
    const allowedDevOrigins = ['http://127.0.0.1:5173', 'http://localhost:5173'];
    if (origin && new URL(origin).host !== req.get('host') && !allowedDevOrigins.includes(origin)) return res.status(403).json({ code: 'ORIGIN_ERROR', message: '请求来源不匹配。' });
    if (active >= 4) return res.status(429).json({ code: 'BUSY', message: '正在处理其他收藏，请稍后再试。' });
    next();
  });
  const handle = (refine: boolean): express.RequestHandler => async (req, res) => {
    let counted = false;
    try {
      if (partial) throw new ProviderError('CONFIG_ERROR', 'Agnes 配置还不完整，请补全服务端环境变量。', 503);
      const items = collectionSchema.parse(req.body.items);
      active++; counted = true;
      let analysis;
      if (refine) {
        const previous = validateAnalysis(analysisSchema.parse(req.body.previous), items);
        const feedback = z.array(feedbackSchema).min(1).max(5).parse(req.body.feedback);
        if (feedback.some(f => !previous.patterns.some(p => p.id === f.patternId))) return void res.status(400).json({ code: 'INVALID_INPUT', message: '这条线索已经变化，请重新打开。' });
        analysis = await provider.refineTasteMap(items, previous, feedback);
      } else analysis = await provider.analyzeCollection(items);
      res.json({ analysis, mode });
    } catch (error) {
      if (error instanceof z.ZodError) res.status(400).json({ code: 'INVALID_INPUT', message: '收藏格式不完整。请提供 3–20 条，每条包含标题与正文，正文最多 3000 字。' });
      else if (error instanceof ProviderError) res.status(error.status).json({ code: error.code, message: error.message });
      else res.status(400).json({ code: 'INVALID_ANALYSIS', message: '这次的分析依据不完整，请重新分析。' });
    } finally { if (counted) active--; }
  };
  app.post('/api/analyze', handle(false)); app.post('/api/refine', handle(true));
  app.use('/api', (_req, res) => res.status(404).json({ code: 'NOT_FOUND', message: '找不到这个接口。' }));
  app.use((error: { type?: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => res.status(error.type === 'entity.too.large' ? 413 : 400).json({ code: 'INVALID_INPUT', message: '输入内容过长或格式不正确，请缩短后再试。' }));
  return app;
}

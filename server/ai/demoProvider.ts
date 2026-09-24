import type { AIProvider } from './provider';
import { validateAnalysis, type Analysis, type Save, type Feedback } from '../../shared/schema';
const rules = [
  { id: 'p-space', name: '让空间留白', keys: /留白|极简|干净|家具很少|简单|低视觉密度/, description: '从这组收藏来看，你似乎反复留下了家具较少、墙面干净的空间。比起某一种风格，“让视线有地方休息”可能更接近它们的共同点。' },
  { id: 'p-light', name: '被自然光吸引', keys: /自然光|阳光|窗边|采光|光影|纱帘/, description: '这里反复出现窗边、纱帘和柔和的光。风格标签虽然不同，但这些收藏都把自然光放在了很重要的位置。' },
  { id: 'p-material', name: '偏爱天然的触感', keys: /原木|暖木|木质|木色|木头|亚麻|棉麻|藤编/, description: '原木、棉麻和天然材质在多条收藏里重叠。一个可能的偏好是材料带来的温度与触感，而不只是“日式”或“北欧”这个名字。' },
  { id: 'p-low', name: '视线低一点', keys: /低矮|低床|落地边桌/, description: '这些收藏共同提到了低矮家具。它们给墙面和视野留下更多空间，可能是这组卧室灵感中一条容易被忽略的线索。' },
  { id: 'p-nature', name: '向自然靠近', keys: /山野|徒步|森林|湖泊|露营|自然风景|海边/, description: '从这组收藏来看，户外与自然场景反复出现。比起具体的目的地，靠近自然本身可能是一条共同线索。' },
  { id: 'p-food', name: '简单地好好吃饭', keys: /家常|食谱|烹饪|快手菜|做饭/, description: '多条收藏都与日常烹饪有关。这里可能有一条关于亲手准备食物的共同兴趣，仍需要你来确认。' },
  { id: 'p-travel', name: '给旅途留点空白', keys: /慢旅行|散步|小城|漫步|不赶|街巷/, description: '这些收藏提到慢行、散步或不赶时间的体验。一个可能的共同点是旅行的节奏，而不只是目的地。' },
];
export class DemoProvider implements AIProvider {
  async analyzeCollection(items: Save[]): Promise<Analysis> {
    const text = (item: Save) => `${item.title} ${item.content} ${item.tags.join(' ')}`;
    const patterns = rules.map(r => { const evidence = items.filter(i => r.keys.test(text(i))).map(i => i.id); return { id: r.id, name: r.name, description: r.description, evidence, strength: Math.min(0.94, 0.35 + evidence.length / items.length * 0.65) }; }).filter(p => p.evidence.length >= 2).sort((a, b) => b.evidence.length - a.evidence.length).slice(0, 5);
    // Fallback is explicit repeated tags, not a fabricated semantic interpretation.
    if (!patterns.length) {
      const tags = [...new Set(items.flatMap(i => i.tags))];
      for (const tag of tags) {
        const evidence = items.filter(i => i.tags.includes(tag)).map(i => i.id);
        if (evidence.length >= 2 && patterns.length < 3) patterns.push({ id: `p-tag-${patterns.length}`, name: tag.slice(0, 24), description: `这几条收藏都包含“${tag}”标签。这只是本地演示找到的重复标签，更深的语义联系需要接入真实模型后再判断。`, evidence, strength: 0.4 });
      }
    }
    const minimal = items.filter(i => /留白|极简|低视觉密度/.test(text(i))).map(i => i.id);
    const decorated = items.filter(i => /艺术画|画廊|装饰焦点|装饰表达/.test(text(i))).map(i => i.id);
    const tensions: Analysis['tensions'] = minimal.length && decorated.length ? [{ id: 't-expression', name: '留白 × 装饰表达', description: '这组收藏里同时出现了两种方向：大部分空间安静克制，也有几条为画作与摆件留出了位置。它们可以共存，并不需要选出唯一答案。', evidence: [...new Set([...minimal.slice(0, 3), ...decorated])], sides: [{ name: '安静的留白', itemIds: minimal.slice(0, 3) }, { name: '一点自我表达', itemIds: decorated }] }] : [];
    const clusters = patterns.slice(0, 4).map((p, n) => ({ id: `c-${n}`, name: p.name, description: p.description, itemIds: p.evidence }));
    return validateAnalysis({ collectionSummary: patterns.length ? `这些收藏看起来不太一样，但“${patterns[0].name}”是一条反复出现的线索。或许，吸引你的不只是风格标签。` : '这组收藏暂时没有形成很强的共同方向。它们也许本来就在表达不同的兴趣。', clusters, patterns, tensions }, items);
  }
  async refineTasteMap(items: Save[], previous: Analysis, feedback: Feedback[]): Promise<Analysis> {
    const updated = structuredClone(previous);
    for (const f of feedback) {
      const p = updated.patterns.find(p => p.id === f.patternId);
      if (p) p.strength = f.value === 'yes' ? Math.max(p.strength, 0.9) : f.value === 'no' ? Math.min(p.strength, 0.24) : Math.min(p.strength, 0.55);
    }
    return validateAnalysis(updated, items);
  }
}

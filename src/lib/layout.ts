import type { Analysis, Save } from '../../shared/schema';
export type Point = { x: number; y: number };
export function mapLayout(items: Save[], analysis: Analysis | null, compact: boolean) {
  const width = compact ? 360 : 1100;
  const patterns = analysis?.patterns || [];
  const height = compact ? Math.max(760, patterns.length * 270 + 180) : 680;
  const anchors: Point[] = compact ? patterns.map((_, n) => ({ x: n % 2 ? 235 : 120, y: 155 + n * 270 })) : [ { x: 270, y: 220 }, { x: 775, y: 205 }, { x: 505, y: 465 }, { x: 935, y: 465 }, { x: 145, y: 505 } ].slice(0, patterns.length);
  const groups = anchors.map(() => [] as number[]);
  const unassigned: number[] = [];
  items.forEach((item, i) => {
    const candidates = patterns.map((p, n) => ({ n, score: (p.evidence.includes(item.id) ? 10 : 0) + (analysis?.clusters.some(c => c.itemIds.includes(item.id) && c.itemIds.some(id => p.evidence.includes(id))) ? 1 : 0) })).filter(c => c.score >= 10);
    candidates.sort((a, b) => (b.score - a.score) || (groups[a.n].length - groups[b.n].length) || a.n - b.n);
    if (candidates.length) groups[candidates[0].n].push(i); else unassigned.push(i);
  });
  const tiles: (Point & { group: number })[] = items.map((_, i) => ({ x: compact ? 82 + (i % 2) * 192 : 100 + (i % 6) * 180, y: compact ? 90 + Math.floor(i / 2) * 155 : 125 + Math.floor(i / 6) * 265 + (i % 2) * 60, group: -1 }));
  groups.forEach((members, group) => members.forEach((i, n) => {
    const anchor = anchors[group];
    const angle = (n / Math.max(members.length, 3)) * Math.PI * 2 - Math.PI / 2 - 0.35;
    const radiusX = compact ? 106 : 145; const radiusY = compact ? 115 : 130;
    tiles[i] = { x: Math.max(compact ? 45 : 55, Math.min(width - (compact ? 45 : 55), anchor.x + Math.cos(angle) * radiusX)), y: Math.max(70, Math.min(height - 80, anchor.y + Math.sin(angle) * radiusY)), group };
  }));
  unassigned.forEach((i, n) => { if (patterns.length) tiles[i] = { x: compact ? 75 + n % 2 * 200 : 85 + n * 110, y: height - 75, group: -1 }; });
  // Deterministic collision relaxation, bounded within the canvas. No random coordinates.
  for (let iteration = 0; iteration < 90; iteration++) {
    for (let i = 0; i < tiles.length; i++) {
      for (let j = i + 1; j < tiles.length; j++) {
        const dx = tiles[j].x - tiles[i].x, dy = tiles[j].y - tiles[i].y;
        const minX = compact ? 91 : 112, minY = compact ? 108 : 130;
        if (Math.abs(dx) < minX && Math.abs(dy) < minY) {
          if ((minX - Math.abs(dx)) < (minY - Math.abs(dy))) { const push = (minX - Math.abs(dx)) / 2 + 0.1; tiles[i].x -= Math.sign(dx || 1) * push; tiles[j].x += Math.sign(dx || 1) * push; }
          else { const push = (minY - Math.abs(dy)) / 2 + 0.1; tiles[i].y -= Math.sign(dy || 1) * push; tiles[j].y += Math.sign(dy || 1) * push; }
        }
      }
      for (const a of anchors) {
        const dx = tiles[i].x - a.x, dy = tiles[i].y - a.y;
        const d = Math.hypot(dx, dy) || 1, min = compact ? 112 : 143;
        if (d < min) { tiles[i].x += (dx || 1) / d * (min - d) * 0.6; tiles[i].y += dy / d * (min - d) * 0.6; }
      }
      tiles[i].x = Math.max(compact ? 45 : 55, Math.min(width - (compact ? 45 : 55), tiles[i].x));
      tiles[i].y = Math.max(65, Math.min(height - 65, tiles[i].y));
    }
  }
  return { width, height: !patterns.length && compact ? Math.max(height, Math.ceil(items.length / 2) * 155 + 70) : height, anchors, tiles };
}

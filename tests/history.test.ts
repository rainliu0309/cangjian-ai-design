import test from 'node:test';
import assert from 'node:assert/strict';
import { readMemories, writeMemories, dayKey } from '../src/lib/history';
import { sample } from '../src/data/sample';

test('history keeps browser storage failures visible and rejects corrupt data', () => {
  let value: string | null = null;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: () => value,
    setItem: (_: string, next: string) => { value = next; },
  }});
  assert.deepEqual(readMemories(), []);
  writeMemories([]);
  assert.deepEqual(readMemories(), []);
  const record = { id: 'round-trip', title: '我的卧室', date: new Date().toISOString(), items: sample, result: { collectionSummary: '测试保存的收藏组', clusters: [], patterns: [], tensions: [] }, feedback: {} };
  writeMemories([record]);
  assert.deepEqual(readMemories(), [record]);
  writeMemories([{ ...record, title: '更新后的名字' }]);
  assert.equal(readMemories().length, 1);
  assert.equal(readMemories()[0].title, '更新后的名字');
  value = '[{"id":"broken"}]';
  assert.throws(() => readMemories());
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    setItem: () => { throw new Error('quota'); },
  }});
  assert.throws(() => writeMemories([]), /quota/);
});
test('calendar keys use local dates across year boundaries', () => {
  assert.equal(dayKey(new Date(2026, 0, 1, 0, 1)), '2026-01-01');
  assert.equal(dayKey(new Date(2026, 11, 31, 23, 59)), '2026-12-31');
});

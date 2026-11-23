import { expect, it } from 'vitest';
import { runAdapters } from '../../skeleton/src';
import { config } from '../src/config';
import { decisionsLoaded } from '../src/status';

it('__NAME__ adapters produce decisions that cite evidence', async () => {
  const d = await runAdapters(config, null);
  expect(d.length).toBeGreaterThan(0);
  expect(d.every((x) => x.evidence.length > 0)).toBe(true);
  expect([0, 1, 2].map(decisionsLoaded)).toEqual(['0 decisions loaded', '1 decision loaded', '2 decisions loaded']);
});

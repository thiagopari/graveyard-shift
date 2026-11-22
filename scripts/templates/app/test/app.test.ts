import { expect, it } from 'vitest';
import { runAdapters } from '../../skeleton/src';
import { config } from '../src/config';

it('__NAME__ adapters produce decisions that cite evidence', async () => {
  const d = await runAdapters(config, null);
  expect(d.length).toBeGreaterThan(0);
  expect(d.every((x) => x.evidence.length > 0)).toBe(true);
});

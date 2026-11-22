import { check, makeEvidence, type AppConfig } from '../../skeleton/src';

export const config: AppConfig<null> = {
  name: '__NAME__',
  title: '__TITLE__',
  adapters: [
    {
      id: 'demo',
      load: () => [
        {
          id: 'demo-1',
          title: 'Example decision',
          summary: 'Replace this adapter with real data.',
          risk: 0.3,
          checks: [check('demo', true, 'Example check passed')],
          evidence: [makeEvidence({ id: 'demo-ev', source: 'scaffold', time: '2026-01-01T00:00:00Z', license: 'CC0-1.0' })],
        },
      ],
    },
  ],
};

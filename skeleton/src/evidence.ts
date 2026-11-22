export interface Evidence {
  id: string;
  source: string;
  time: string; // ISO 8601
  license: string;
}

const FIELDS = ['id', 'source', 'time', 'license'] as const;

export function makeEvidence(input: Partial<Record<(typeof FIELDS)[number], unknown>>): Evidence {
  for (const f of FIELDS) {
    const v = input[f];
    if (typeof v !== 'string' || v.trim() === '') throw new Error(`Evidence.${f} is required`);
  }
  const time = input.time as string;
  if (Number.isNaN(Date.parse(time))) throw new Error('Evidence.time must be a valid ISO 8601 time');
  return { id: input.id as string, source: input.source as string, time, license: input.license as string };
}

import type { Decision } from './triage';

/** An adapter turns some input source into decisions. */
export interface Adapter<I = unknown> {
  id: string;
  load(input: I): Promise<Decision[]> | Decision[];
}

/** An app is a config plus adapters. */
export interface AppConfig<I = unknown> {
  name: string;
  title: string;
  adapters: Adapter<I>[];
}

export async function runAdapters<I>(app: AppConfig<I>, input: I): Promise<Decision[]> {
  const all = await Promise.all(app.adapters.map((a) => a.load(input)));
  return all.flat();
}

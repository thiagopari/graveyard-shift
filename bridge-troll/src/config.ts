import type { AppConfig } from '../../skeleton/src';
import { decideAll } from './decide';
import { loadData } from './model';

/** Input is the slider time in epoch milliseconds. */
export const config: AppConfig<number> = {
  name: 'bridge-troll',
  title: 'Bridge Troll',
  adapters: [{ id: 'usgs-nws-nbi', load: (atMs) => decideAll(loadData(), atMs) }],
};

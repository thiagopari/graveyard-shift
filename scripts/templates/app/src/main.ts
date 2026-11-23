import '../../skeleton/src/theme.css';
import { renderInbox, runAdapters } from '../../skeleton/src';
import { config } from './config';
import { decisionsLoaded } from './status';

runAdapters(config, null).then((d) => {
  renderInbox(document.getElementById('inbox')!, d);
  document.getElementById('status')!.textContent = decisionsLoaded(d.length);
});

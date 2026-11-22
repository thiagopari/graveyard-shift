import { buildCards } from './inbox';
import { LEVEL_LABEL, type Decision } from './triage';

export function toMarkdown(title: string, decisions: Decision[], now = new Date()): string {
  const cards = buildCards(decisions);
  const out = [`# ${title}`, '', `Generated ${now.toISOString()}`, ''];
  if (cards.length === 0) out.push('Nothing to decide.', '');
  for (const { decision: d, level } of cards) {
    out.push(`## [${LEVEL_LABEL[level]}] ${d.title}`, '', d.summary, '', '**Checks**');
    for (const c of d.checks) out.push(`- ${c.pass ? 'Pass' : 'Fail'}: ${c.id}. ${c.reason}`);
    out.push('', '**Evidence**');
    if (d.evidence.length === 0) out.push('- none');
    for (const e of d.evidence) out.push(`- ${e.id} (source: ${e.source}, time: ${e.time}, license: ${e.license})`);
    out.push('');
  }
  return out.join('\n');
}

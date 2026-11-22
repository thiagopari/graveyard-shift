import { LEVEL_LABEL, levelRank, triage, type Decision, type Level } from './triage';

export interface Card {
  decision: Decision;
  level: Level;
}

export function buildCards(decisions: Decision[]): Card[] {
  return decisions
    .map((decision) => ({ decision, level: triage(decision) }))
    .sort((a, b) => levelRank(b.level) - levelRank(a.level) || b.decision.risk - a.decision.risk);
}

function el<K extends keyof HTMLElementTagNameMap>(
  doc: Document, tag: K, text?: string, cls?: string,
): HTMLElementTagNameMap[K] {
  const e = doc.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}

/** Renders cards with textContent only (no innerHTML), so evidence text cannot inject markup. */
export function renderInbox(container: HTMLElement, decisions: Decision[]): Card[] {
  const doc = container.ownerDocument;
  const cards = buildCards(decisions);
  container.replaceChildren();
  container.setAttribute('role', 'region');
  if (!container.getAttribute('aria-label')) container.setAttribute('aria-label', 'Inbox');
  if (cards.length === 0) container.append(el(doc, 'p', 'Nothing to decide.'));
  for (const { decision: d, level } of cards) {
    const card = el(doc, 'article', undefined, `card level-${level}`);
    card.tabIndex = 0;
    card.setAttribute('aria-labelledby', `h-${d.id}`);
    const h = el(doc, 'h3', undefined);
    h.id = `h-${d.id}`;
    h.append(el(doc, 'span', LEVEL_LABEL[level], 'badge'), doc.createTextNode(` ${d.title}`));
    card.append(h, el(doc, 'p', d.summary));
    const checks = el(doc, 'ul', undefined, 'checks');
    for (const c of d.checks) checks.append(el(doc, 'li', `${c.pass ? 'Pass' : 'Fail'}: ${c.id}. ${c.reason}`));
    const ev = el(doc, 'ul', undefined, 'evidence');
    for (const e of d.evidence) ev.append(el(doc, 'li', `${e.id} (${e.source}, ${e.time}, ${e.license})`));
    card.append(checks, el(doc, 'h4', 'Evidence'), ev);
    container.append(card);
  }
  return cards;
}

// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { check, makeEvidence, renderInbox, toMarkdown, triage, levelRank, runAdapters, type Decision } from '../src';

const ev = makeEvidence({ id: 'e1', source: 'test', time: '2026-01-01T00:00:00Z', license: 'CC0' });

describe('evidence', () => {
  it('accepts valid and rejects missing or bad time', () => {
    expect(ev.id).toBe('e1');
    expect(() => makeEvidence({ id: 'x', source: 's', time: 'nope', license: 'l' })).toThrow(/time/);
    expect(() => makeEvidence({ id: 'x', source: '', time: '2026-01-01', license: 'l' })).toThrow(/source/);
    expect(() => makeEvidence({ source: 's', time: '2026-01-01', license: 'l' })).toThrow(/id/);
  });
});

describe('triage', () => {
  it('maps levels', () => {
    expect(triage({ risk: 0.1, checks: [] })).toBe('fine');
    expect(triage({ risk: 0.3, checks: [] })).toBe('watch');
    expect(triage({ risk: 0.7, checks: [] })).toBe('needs-you');
  });
  it('failed blocking check needs you', () => {
    expect(triage({ risk: 0, checks: [check('blur', false, 'soft', true)] })).toBe('needs-you');
  });
  it('property: worse evidence never lowers priority', () => {
    const chk = fc.record({ id: fc.string(), pass: fc.boolean(), reason: fc.string(), blocking: fc.boolean() });
    fc.assert(
      fc.property(
        fc.array(chk, { maxLength: 6 }), fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }), fc.array(fc.boolean(), { maxLength: 6 }),
        (checks, risk, extra, flips) => {
          const worse = checks.map((c, i) => (flips[i] ? { ...c, pass: false } : c));
          const worseRisk = Math.min(1, risk + extra);
          expect(levelRank(triage({ risk: worseRisk, checks: worse }))).toBeGreaterThanOrEqual(
            levelRank(triage({ risk, checks })));
        }),
    );
  });
});

const decisions: Decision[] = [
  { id: 'a', title: 'Fine one', summary: 's', risk: 0, checks: [check('c', true, 'ok')], evidence: [ev] },
  { id: 'b', title: 'Bad <b>one</b>', summary: 's', risk: 0.9, checks: [check('c', false, 'bad')], evidence: [ev] },
];

describe('report and inbox', () => {
  it('markdown cites evidence, sorted worst first', () => {
    const md = toMarkdown('T', decisions, new Date('2026-01-02T00:00:00Z'));
    expect(md.indexOf('[Needs you]')).toBeLessThan(md.indexOf('[Fine]'));
    expect(md).toContain('e1 (source: test, time: 2026-01-01T00:00:00Z, license: CC0)');
  });
  it('renders accessible cards without injecting markup', () => {
    const root = document.createElement('section');
    renderInbox(root, decisions);
    const cards = root.querySelectorAll('article');
    expect(cards).toHaveLength(2);
    expect(cards[0].tabIndex).toBe(0);
    expect(cards[0].textContent).toContain('Needs you');
    expect(root.querySelector('b')).toBeNull();
    expect(root.getAttribute('aria-label')).toBe('Inbox');
  });
  it('runs adapters', async () => {
    const out = await runAdapters({ name: 'x', title: 'x', adapters: [{ id: 'a', load: () => decisions }] }, null);
    expect(out).toHaveLength(2);
  });
});

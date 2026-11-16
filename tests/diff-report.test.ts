import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

describe('STREAMS fix impact report', () => {
  it('changes exactly the 14 Risk & Control Functions / Technology & Digital departments, and only those', () => {
    execSync('node scripts/diff-streams-fix-impact.mjs', { stdio: 'pipe' });
    const { changed, unchanged } = JSON.parse(readFileSync('fixtures/streams-fix-impact.json', 'utf8'));
    expect(changed).toHaveLength(14);
    expect(unchanged).toHaveLength(29);
    expect(
      changed.every((r: any) => r.subdivision === 'Risk & Control Functions' || r.subdivision === 'Technology & Digital')
    ).toBe(true);
  });

  it('writes a markdown report listing the Legal department\'s change', () => {
    const md = readFileSync('docs/streams-fix-impact-report.md', 'utf8');
    expect(md).toContain('Legal');
    expect(md).toContain('865');
    expect(md).toContain('810');
  });
});

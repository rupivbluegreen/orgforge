import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findEvalViolations } from '../src/engines/av-safety-check';

describe('findEvalViolations (PRD §9 AV NFR)', () => {
  it('returns empty for a clean directory', () => {
    const dir = mkdtempSync(join(tmpdir(), 'av-safety-clean-'));
    try {
      writeFileSync(join(dir, 'clean.ts'), 'export const add = (a: number, b: number) => a + b;\n');
      expect(findEvalViolations(dir)).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('flags a direct eval() call with file and line number', () => {
    const dir = mkdtempSync(join(tmpdir(), 'av-safety-eval-'));
    try {
      writeFileSync(join(dir, 'bad.ts'), 'const x = 1;\nconst y = eval("1+1");\n');
      const violations = findEvalViolations(dir);
      expect(violations).toHaveLength(1);
      expect(violations[0].line).toBe(2);
      expect(violations[0].text).toContain('eval(');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('flags new Function(...) construction', () => {
    const dir = mkdtempSync(join(tmpdir(), 'av-safety-newfn-'));
    try {
      writeFileSync(join(dir, 'bad.ts'), 'const f = new Function("a", "return a");\n');
      expect(findEvalViolations(dir)).toHaveLength(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('recurses into subdirectories', () => {
    const dir = mkdtempSync(join(tmpdir(), 'av-safety-nested-'));
    try {
      writeFileSync(join(dir, 'clean.ts'), 'export const x = 1;\n');
      const sub = join(dir, 'nested');
      mkdirSync(sub);
      writeFileSync(join(sub, 'bad.ts'), 'eval("danger");\n');
      const violations = findEvalViolations(dir);
      expect(violations).toHaveLength(1);
      expect(violations[0].file).toContain('nested');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

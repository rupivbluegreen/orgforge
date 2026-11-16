import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export interface EvalViolation {
  file: string;
  line: number;
  text: string;
}

const EVAL_RE = /\beval\s*\(/;
// detects the construct; not itself unsafe
const NEW_FUNCTION_RE = /\bnew\s+Function\s*\(/;

function walkTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkTsFiles(p));
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

// no eval/new Function in the source
export function findEvalViolations(rootDir: string): EvalViolation[] {
  const violations: EvalViolation[] = [];
  for (const file of walkTsFiles(rootDir)) {
    const text = readFileSync(file, 'utf8');
    text.split('\n').forEach((line, i) => {
      if (EVAL_RE.test(line) || NEW_FUNCTION_RE.test(line)) {
        violations.push({ file, line: i + 1, text: line.trim() });
      }
    });
  }
  return violations;
}

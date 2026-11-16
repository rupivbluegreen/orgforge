import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

describe('package-offline.mjs (PRD §9 offline zip + SHA256SUMS)', () => {
  it(
    'builds, packages, and produces a manifest that matches the actual dist/ files',
    () => {
      execSync('npm run build', { cwd: process.cwd(), stdio: 'pipe' });
      execSync('node scripts/package-offline.mjs', { cwd: process.cwd(), stdio: 'pipe' });

      const sha256sums = readFileSync('dist-offline/SHA256SUMS', 'utf8').trim().split('\n');
      expect(sha256sums.length).toBeGreaterThan(20);

      const [hash, relPath] = sha256sums[0].split('  ');
      const actual = createHash('sha256').update(readFileSync(join('dist', relPath))).digest('hex');
      expect(actual).toBe(hash);

      const files = readdirSync('dist-offline');
      const zipName = files.find((f) => f.endsWith('.zip'));
      expect(zipName).toBeDefined();
      const zipBuf = readFileSync(join('dist-offline', zipName!));
      expect(zipBuf.subarray(0, 2).toString('latin1')).toBe('PK');
    },
    20000 // tsc build takes longer than the 5s default
  );
});

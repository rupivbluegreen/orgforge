#!/usr/bin/env node
// PRD §9: offline zip, README, SHA256SUMS
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execSync } from 'node:child_process';
import JSZip from 'jszip';

const root = join(import.meta.dirname, '..');
const distDir = join(root, 'dist');
const outDir = join(root, 'dist-offline');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function gitCommit() {
  try {
    return execSync('git rev-parse HEAD', { cwd: root }).toString().trim();
  } catch {
    return 'unknown';
  }
}

const files = walk(distDir);
if (!files.length) {
  console.error('dist/ is empty — run `npm run build` first.');
  process.exit(1);
}

const sha256Lines = [];
const zip = new JSZip();
for (const abs of files) {
  const rel = relative(distDir, abs).split('\\').join('/');
  const buf = readFileSync(abs);
  const hash = createHash('sha256').update(buf).digest('hex');
  sha256Lines.push(`${hash}  ${rel}`);
  zip.file(rel, buf);
}
sha256Lines.sort();
const sha256sums = sha256Lines.join('\n') + '\n';

const readme = `# ${pkg.name} — offline package

Version: ${pkg.version}
Built: ${new Date().toISOString()}
Commit: ${gitCommit()}

This is a compiled, offline-safe build of the core calculation
engines (Hay, Cost, Governance, SFIA, EOSB, Rewards, Rationale,
JD, Ledger, Spine, RBAC, LLM gateway) from the Orgforge
PRD, ported from the Build 6 prototype.

## Integrity

Verify every file against SHA256SUMS:

    sha256sum -c SHA256SUMS

## AV-safety

No \`eval\`/\`new Function\` anywhere in the source (enforced by
\`npm run check-av-safety\` in CI on every build). No native
addons, no postinstall scripts beyond npm's own dependency
resolution.
`;

zip.file('SHA256SUMS', sha256sums);
zip.file('README.md', readme);

mkdirSync(outDir, { recursive: true });
const zipPath = join(outDir, `${pkg.name}-${pkg.version}-offline.zip`);
const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
writeFileSync(zipPath, buf);
writeFileSync(join(outDir, 'SHA256SUMS'), sha256sums);
writeFileSync(join(outDir, 'README.md'), readme);

console.log(`Packaged ${files.length} files -> ${zipPath}`);

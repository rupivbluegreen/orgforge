#!/usr/bin/env node
import { join } from 'node:path';
import { findEvalViolations } from '../dist/engines/av-safety-check.js';

const root = join(import.meta.dirname, '..', 'src');
const violations = findEvalViolations(root);

if (violations.length) {
  console.error('AV-safety check failed:');
  violations.forEach((v) => console.error(`  ${v.file}:${v.line}: ${v.text}`));
  process.exit(1);
}
console.log('AV-safety check passed: no eval/new Function in src/.');

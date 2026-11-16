#!/usr/bin/env node
// Diffs legacy (pre-fix) vs corrected STREAMS
// Hay/CTC across all 43 depts. Writes a
// sign-off report for Rewards/Compliance.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dataset = JSON.parse(readFileSync(join(root, 'fixtures', 'embedded-dataset.json'), 'utf8'));
const legacy = JSON.parse(readFileSync(join(root, 'fixtures', 'legacy-hay-cost.json'), 'utf8'));

const HAY_STEPS = [50, 57, 66, 76, 87, 100, 115, 132, 152, 175, 200, 230, 264, 304, 350, 400, 460, 528, 608, 700, 800, 920, 1056, 1216, 1400];
const stepAt = (i) => HAY_STEPS[Math.max(0, Math.min(HAY_STEPS.length - 1, i))];
const nearestStep = (v) => HAY_STEPS.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));

// FIXED per PRD §5.2, mirrors streams.ts
const STREAMS_FIXED = {
  'Front Office & Distribution': { psEnv: 'E', impact: 'P', psBase: 0.38 },
  'Risk & Control Functions': { psEnv: 'E', impact: 'R', psBase: 0.38 },
  'Technology & Digital': { psEnv: 'E', impact: 'C', psBase: 0.38 },
  Operations: { psEnv: 'D', impact: 'C', psBase: 0.33 },
  'Business Support': { psEnv: 'D', impact: 'C', psBase: 0.33 },
};
const streamOf = (s) => STREAMS_FIXED[s] || { psEnv: 'D', impact: 'C', psBase: 0.33 };
const GRADE_LADDER = [[1850, 'E1'], [1500, 'E2'], [1180, 'E3'], [920, 'M1'], [780, 'M2'], [660, 'M3'], [560, 'P1'], [460, 'P2'], [390, 'P3'], [300, 'P4'], [230, 'C1'], [195, 'C2'], [0, 'C3']];
const gradeFor = (pts) => GRADE_LADDER.find(([min]) => pts >= min)[1];
const CTC_MULTIPLE = 1.34;
const DIV_PREMIUM = {
  'Support Functions': 1.00, 'Retail Banking Group': 1.05, 'Corporate & Institutional Banking': 1.10,
  'Treasury & Global Markets': 1.15, 'Risk Management Group': 1.08, 'Operations & Technology': 1.12,
  'Digital Banking & Innovation': 1.14,
};
const headAnnual = (hayTotal) => Math.round((38000 + (hayTotal || 0) * 30) * 12);

function groupByDivision(rows) {
  const divisions = new Map();
  for (const r of rows) {
    if (!divisions.has(r.division)) divisions.set(r.division, new Map());
    const subs = divisions.get(r.division);
    if (!subs.has(r.subdivision)) subs.set(r.subdivision, []);
    subs.get(r.subdivision).push({ department: r.department, hc: r.hc, base: r.base });
  }
  return [...divisions].map(([name, subs]) => ({
    name,
    subdivisions: [...subs].map(([sName, departments]) => ({ name: sName, departments })),
  }));
}
const divisions = groupByDivision(dataset);
const divBase = (d) => d.subdivisions.reduce((a, s) => a + s.departments.reduce((b, x) => b + x.base, 0), 0);

function evaluateHay(dept, div, subName) {
  const st = streamOf(subName);
  const divCost = divBase(div);
  const divDeptCount = div.subdivisions.reduce((a, s) => a + s.departments.length, 0);
  let khIdx, khTech;
  if (dept.hc >= 150) { khTech = 'F'; khIdx = 15; } else if (dept.hc >= 60) { khTech = 'E+'; khIdx = 14; } else { khTech = 'E'; khIdx = 13; }
  if (divDeptCount >= 6) khIdx += 2; else if (divDeptCount >= 3) khIdx += 1;
  khIdx += 1;
  const khPts = stepAt(khIdx);
  const chall = divCost >= 120e6 ? 4 : 3;
  const psPct = Math.min(0.5, st.psBase + (chall === 4 ? 0.05 : 0));
  const psPts = nearestStep(psPct * khPts);
  const accFreedom = dept.hc >= 100 ? 'E' : 'D';
  let accIdx = accFreedom === 'E' ? 13 : 11;
  if (dept.base >= 25e6) accIdx += 2; else if (dept.base >= 12e6) accIdx += 1;
  if (divCost >= 150e6) accIdx += 1;
  if (st.impact === 'P') accIdx += 1; else if (st.impact === 'C') accIdx -= 1; else if (st.impact === 'R') accIdx -= 2;
  const accPts = stepAt(accIdx);
  const total = khPts + psPts + accPts;
  return { kh: khPts, ps: psPts, acc: accPts, total, grade: gradeFor(total) };
}

const changed = [];
const unchanged = [];
for (const div of divisions) {
  for (const sub of div.subdivisions) {
    for (const dept of sub.departments) {
      const hay = evaluateHay(dept, div, sub.name);
      const prem = DIV_PREMIUM[div.name] ?? 1.00;
      const ctc = Math.round((dept.base * prem + headAnnual(hay.total)) * CTC_MULTIPLE);
      const before = legacy.find((r) => r.department === dept.department);
      const row = {
        department: dept.department,
        subdivision: sub.name,
        before: { total: before.hay.total, grade: before.hay.grade, ctc: before.ctc },
        after: { total: hay.total, grade: hay.grade, ctc },
      };
      if (before.hay.total !== hay.total || before.hay.grade !== hay.grade) changed.push(row);
      else unchanged.push(row);
    }
  }
}

const expectedAffected = new Set([
  'Legal', 'Compliance & AML', 'Internal Audit', 'Credit Risk', 'Market & Liquidity Risk',
  'Operational Risk', 'Fraud Risk & Investigations', 'Model Risk & Analytics',
  'IT Infrastructure & Cloud', 'Core Banking Applications', 'Cyber & Information Security',
  'Data & Analytics', 'Open Banking & APIs', 'Customer Experience Design',
]);
const gradeChanges = changed.filter((r) => r.before.grade !== r.after.grade);

let md = `# STREAMS classification fix — Hay/CTC impact report\n\n`;
md += `Source: PRD §5.2 fix (Risk & Control Functions 'S'→'R', Technology & Digital 'S'→'C'). Generated by \`scripts/diff-streams-fix-impact.mjs\`.\n\n`;
md += `${changed.length} of ${dataset.length} departments changed Hay points and/or CTC. ${gradeChanges.length} crossed a grade boundary.\n\n`;
md += `| Department | Sub-division | Grade before→after | Hay pts before→after | CTC before→after |\n|---|---|---|---|---|\n`;
for (const r of changed) {
  md += `| ${r.department} | ${r.subdivision} | ${r.before.grade}→${r.after.grade} | ${r.before.total}→${r.after.total} | ${r.before.ctc.toLocaleString()}→${r.after.ctc.toLocaleString()} |\n`;
}
mkdirSync(join(root, 'docs'), { recursive: true });
writeFileSync(join(root, 'docs', 'streams-fix-impact-report.md'), md);
writeFileSync(join(root, 'fixtures', 'streams-fix-impact.json'), JSON.stringify({ changed, unchanged }, null, 2));
console.log(`${changed.length} changed, ${unchanged.length} unchanged. Report: docs/streams-fix-impact-report.md`);

if (changed.length !== expectedAffected.size || !changed.every((r) => expectedAffected.has(r.department))) {
  console.error('Unexpected department set changed — verify STREAMS_FIXED against fixtures/embedded-dataset.json');
  process.exit(1);
}

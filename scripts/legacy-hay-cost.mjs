#!/usr/bin/env node
// Reproduces the legacy UN-FIXED Hay+Cost
// output (STREAMS 'S' bug, not corrected).
// Frozen "before" fixture — don't fix this.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dataset = JSON.parse(readFileSync(join(root, 'fixtures', 'embedded-dataset.json'), 'utf8'));

const HAY_STEPS = [50, 57, 66, 76, 87, 100, 115, 132, 152, 175, 200, 230, 264, 304, 350, 400, 460, 528, 608, 700, 800, 920, 1056, 1216, 1400];
const stepAt = (i) => HAY_STEPS[Math.max(0, Math.min(HAY_STEPS.length - 1, i))];
const nearestStep = (v) => HAY_STEPS.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));

// UN-FIXED as originally shipped.
const STREAMS_LEGACY = {
  'Front Office & Distribution': { psEnv: 'E', impact: 'P', psBase: 0.38 },
  'Risk & Control Functions': { psEnv: 'E', impact: 'S', psBase: 0.38 },
  'Technology & Digital': { psEnv: 'E', impact: 'S', psBase: 0.38 },
  Operations: { psEnv: 'D', impact: 'C', psBase: 0.33 },
  'Business Support': { psEnv: 'D', impact: 'C', psBase: 0.33 },
};
const streamOf = (s) => STREAMS_LEGACY[s] || { psEnv: 'D', impact: 'C', psBase: 0.33 };

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
  if (dept.hc >= 150) { khTech = 'F'; khIdx = 15; }
  else if (dept.hc >= 60) { khTech = 'E+'; khIdx = 14; }
  else { khTech = 'E'; khIdx = 13; }
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
  if (st.impact === 'P') accIdx += 1;
  else if (st.impact === 'C') accIdx -= 1;
  else if (st.impact === 'R') accIdx -= 2;
  const accPts = stepAt(accIdx);

  const total = khPts + psPts + accPts;
  return { kh: khPts, ps: psPts, acc: accPts, total, grade: gradeFor(total) };
}

const rows = [];
for (const div of divisions) {
  for (const sub of div.subdivisions) {
    for (const dept of sub.departments) {
      const hay = evaluateHay(dept, div, sub.name);
      const prem = DIV_PREMIUM[div.name] ?? 1.00;
      const ctc = Math.round((dept.base * prem + headAnnual(hay.total)) * CTC_MULTIPLE);
      rows.push({ division: div.name, subdivision: sub.name, department: dept.department, hay, ctc });
    }
  }
}

writeFileSync(join(root, 'fixtures', 'legacy-hay-cost.json'), JSON.stringify(rows, null, 2));
console.log(`Wrote ${rows.length} legacy department records to fixtures/legacy-hay-cost.json`);

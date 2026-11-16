import { GRADE_LEVEL } from './hay-constants';
import { SFIA, requiredTechProfile, requiredBehProfile, clampLv } from './sfia-catalogue';

export interface Person {
  id: string;
  name: string;
  grade: string;
  job: string;
  skills: Record<string, number>;
  behaviours: Record<string, number>;
  sal: number;
  allow: number;
  startDate: string;
  nationality: 'UAE National' | 'Expat';
  perf: number;
}

export type Rng = () => number;

// Seeded PRNG — deterministic given a seed.
export function mulberry32(seed: number): Rng {
  let t = seed >>> 0;
  return function (): number {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const NAMES = [
  'Aisha Al Marri', 'Omar Haddad', 'Fatima Al Suwaidi', 'Rohan Nair', 'Mariam Khalifa',
  'Arjun Menon', 'Layla Hassan', 'Yusuf Rahman', 'Noora Al Shamsi', 'Daniel Fernandes',
  'Huda Al Ali', 'Karthik Iyer', 'Salma Aziz', 'Reem Al Zaabi', 'Imran Shaikh',
  'Grace Mathew', 'Khalid Nasser', 'Anita Pillai', 'Tariq Mansoor', 'Zainab Qureshi',
  'Vivek Sharma', 'Hessa Al Nuaimi', 'Joseph Varghese',
];

export const GRADES_POOL = ['C2', 'C3', 'P2', 'P3', 'P3', 'P4', 'M1', 'M3'];

export const GRADE_JOBS: Record<string, string[]> = {
  C1: ['Direct Sales Agent', 'Senior Teller'],
  C2: ['Customer Service Officer', 'Operations Officer', 'Teller'],
  C3: ['Processing Officer', 'Call Centre Agent', 'Collections Officer'],
  P1: ['Senior Relationship Manager'],
  P2: ['Relationship Manager', 'Compliance Officer'],
  P3: ['Product Manager', 'Risk Analyst', 'Credit Analyst'],
  P4: ['Business Analyst', 'Treasury Dealer'],
  M1: ['Assistant Vice President'],
  M2: ['Senior Manager'],
  M3: ['Team Manager'],
  E3: ['Vice President'],
  E2: ['Senior Vice President'],
  E1: ['Executive Vice President'],
};

const NAT_RATE: Record<string, number> = {
  'Front Office & Distribution': 0.34,
  'Business Support': 0.42,
  Operations: 0.26,
  'Risk & Control Functions': 0.3,
  'Technology & Digital': 0.14,
};

const MS_PER_DAY = 86400000;
const MS_PER_YEAR = 365.25 * MS_PER_DAY;

// pid: caller-assigned, id-only, no draw effect
// now: injected, not Date.now(), for repro
export function makePerson(
  rng: Rng,
  divName: string,
  familyName: string,
  deptName: string,
  pid: number,
  now: Date = new Date()
): Person {
  const grade = GRADES_POOL[Math.floor(rng() * GRADES_POOL.length)];
  const jobs = GRADE_JOBS[grade];
  const job = jobs[Math.floor(rng() * jobs.length)];
  const name = NAMES[Math.floor(rng() * NAMES.length)];
  const req = requiredTechProfile(divName, familyName, deptName, grade);
  const beh = requiredBehProfile(familyName, grade);

  const skills: Record<string, number> = {};
  const behaviours: Record<string, number> = {};
  Object.entries(req).forEach(([c, l]) => {
    const r = rng();
    const d = r < 0.18 ? -1 : r > 0.9 ? 1 : 0;
    const v = l + d;
    if (v >= 1) skills[c] = clampLv(v);
  });
  const extras = ['DAAN', 'VISL', 'BPRE'];
  const ex = extras[Math.floor(rng() * extras.length)];
  if (SFIA.skills[ex] && !skills[ex] && rng() < 0.5) skills[ex] = clampLv((GRADE_LEVEL[grade] || 3) - 1);
  Object.entries(beh).forEach(([c, l]) => {
    const r = rng();
    const d = r < 0.22 ? -1 : r > 0.92 ? 1 : 0;
    behaviours[c] = clampLv(l + d);
  });

  const L = GRADE_LEVEL[grade] || 3;
  const sal = Math.round(((6500 + L * 5200 + rng() * 3000) * 12) / 500) * 500;
  const allow = Math.round((sal * 0.35) / 500) * 500;
  const yearsBack = 1 + Math.floor(rng() * 16);
  const startDate = new Date(now.getTime() - yearsBack * MS_PER_YEAR - Math.floor(rng() * 330) * MS_PER_DAY)
    .toISOString()
    .slice(0, 10);
  const nationality: Person['nationality'] = rng() < (NAT_RATE[familyName] ?? 0.25) ? 'UAE National' : 'Expat';
  const perf = [2, 3, 3, 3, 3, 4, 4, 4, 5][Math.floor(rng() * 9)];

  return { id: `EMP-${10000 + pid}`, name, grade, job, skills, behaviours, sal, allow, startDate, nationality, perf };
}

export function seedDepartmentPeople(
  divName: string,
  familyName: string,
  deptName: string,
  count: number,
  startPid: number,
  now: Date = new Date()
): Person[] {
  const rng = mulberry32(hashStr(deptName));
  return Array.from({ length: count }, (_, i) => makePerson(rng, divName, familyName, deptName, startPid + i, now));
}

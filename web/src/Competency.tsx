import { useEffect, useState } from 'react';
import type { UiOrgModel } from './model';
import { findDept, allDepartments } from './model';
import { requiredTechProfile, requiredBehProfile, SFIA } from '../../src/engines/sfia-catalogue';
import { draftGapLearningPath } from '../../src/engines/copilot';

interface TechRow { code: string; req: number; have: number; gap: number; rag: 'G' | 'A' | 'R'; }
interface BehRow { code: string; req: number; have: number; gap: number; rag: 'G' | 'A' | 'R'; }

function ragOf(gap: number): 'G' | 'A' | 'R' {
  return gap >= 0 ? 'G' : gap === -1 ? 'A' : 'R';
}

function LevelBar({ have, req }: { have: number; req: number }) {
  return (
    <span className="lvlbar">
      {Array.from({ length: 7 }, (_, i) => {
        let cls = '';
        if (i < have) cls = 'have';
        else if (i < req) cls = 'req';
        if (have > req && i < have && i >= req) cls += ' over';
        return <i key={i} className={cls.trim()} />;
      })}
    </span>
  );
}

function RadarChart({ rows }: { rows: TechRow[] }) {
  const S = 210, C = S / 2, R = 78, n = Math.max(3, rows.length);
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const r = (R * v) / 7;
    return `${(C + r * Math.cos(a)).toFixed(1)},${(C + r * Math.sin(a)).toFixed(1)}`;
  };
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
      {[1, 3, 5, 7].map((g) => (
        <polygon key={g} points={rows.map((_, i) => pt(i, g)).join(' ')} fill="none" stroke="#E4E8EF" />
      ))}
      {rows.map((row, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        const x = C + (R + 14) * Math.cos(a);
        const y = C + (R + 14) * Math.sin(a);
        return (
          <g key={row.code}>
            <line x1={C} y1={C} x2={C + R * Math.cos(a)} y2={C + R * Math.sin(a)} stroke="#EEF1F5" />
            <text x={x} y={y} textAnchor="middle" fontSize={8} fontFamily="monospace" fill="#66707F">{row.code}</text>
          </g>
        );
      })}
      <polygon points={rows.map((row, i) => pt(i, row.req)).join(' ')} fill="rgba(185,198,220,.3)" stroke="#B9C6DC" strokeWidth={1.5} />
      <polygon points={rows.map((row, i) => pt(i, row.have)).join(' ')} fill="rgba(20,33,61,.18)" stroke="#14213D" strokeWidth={2} />
    </svg>
  );
}

interface CompetencyPaneProps {
  model: UiOrgModel;
  onTransfer: (personId: string, toDept: string) => void;
}

export default function CompetencyPane({ model, onTransfer }: CompetencyPaneProps) {
  const [division, setDivision] = useState(model.divisions[0]?.name ?? '');
  const [deptName, setDeptName] = useState('');
  const [personId, setPersonId] = useState('');
  const [target, setTarget] = useState('');

  // Resync stale selectors after outside moves.
  useEffect(() => {
    const div = model.divisions.find((d) => d.name === division) ?? model.divisions[0];
    if (!div) return;
    if (div.name !== division) setDivision(div.name);
    const depts = div.subdivisions.flatMap((s) => s.departments);
    const dept = depts.find((d) => d.department === deptName) ?? depts[0];
    if (!dept) return;
    if (dept.department !== deptName) setDeptName(dept.department);
    const person = dept.people.find((p) => p.id === personId) ?? dept.people[0];
    if (person && person.id !== personId) setPersonId(person.id);
  }, [model, division, deptName, personId]);

  const div = model.divisions.find((d) => d.name === division) ?? model.divisions[0];
  const deptOptions = div?.subdivisions.flatMap((s) => s.departments) ?? [];
  const loc = findDept(model, deptName) ?? (deptOptions[0] ? findDept(model, deptOptions[0].department) : null);
  const person = loc ? loc.dept.people.find((p) => p.id === personId) ?? loc.dept.people[0] : undefined;
  const targetOptions = allDepartments(model).filter((d) => d.department !== loc?.dept.department);

  if (!loc || !person) {
    return (
      <section className="tabpane active">
        <p className="empty">No incumbents seeded yet.</p>
      </section>
    );
  }

  const req = requiredTechProfile(loc.div.name, loc.sub.name, loc.dept.department, person.grade);
  const techRows: TechRow[] = Object.entries(req)
    .sort((a, b) => b[1] - a[1])
    .map(([code, r]) => {
      const have = person.skills[code] || 0;
      const gap = have - r;
      return { code, req: r, have, gap, rag: ragOf(gap) };
    });

  const behReq = requiredBehProfile(loc.sub.name, person.grade);
  const behRows: BehRow[] = Object.entries(behReq)
    .sort((a, b) => b[1] - a[1])
    .map(([code, r]) => {
      const have = person.behaviours[code] || 0;
      const gap = have - r;
      return { code, req: r, have, gap, rag: ragOf(gap) };
    });

  const met = techRows.filter((r) => r.gap >= 0).length;
  const pReady = techRows.length ? Math.round((100 * met) / techRows.length) : 100;
  const deepest = techRows.filter((r) => r.gap < 0).sort((a, b) => a.gap - b.gap)[0];
  const lna = draftGapLearningPath(person, loc.div.name, loc.sub.name, loc.dept.department);

  function handleMove() {
    if (!target || !person) return;
    onTransfer(person.id, target);
    setDeptName(target);
  }

  return (
    <section className="tabpane active">
      <div className="selrow">
        <div className="sel">
          <label htmlFor="cDiv">Division</label>
          <select id="cDiv" value={division} onChange={(e) => { setDivision(e.target.value); setDeptName(''); setPersonId(''); }}>
            {model.divisions.map((d) => <option key={d.name}>{d.name}</option>)}
          </select>
        </div>
        <div className="sel">
          <label htmlFor="cDept">Department</label>
          <select id="cDept" value={loc.dept.department} onChange={(e) => { setDeptName(e.target.value); setPersonId(''); }}>
            {deptOptions.map((d) => <option key={d.department}>{d.department}</option>)}
          </select>
        </div>
        <div className="sel">
          <label htmlFor="cPerson">Team member</label>
          <select id="cPerson" value={person.id} onChange={(e) => setPersonId(e.target.value)}>
            {loc.dept.people.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.job} ({p.grade})</option>)}
          </select>
        </div>
        <div className="sel">
          <label htmlFor="cMove">Transfer this person to…</label>
          <span style={{ display: 'flex', gap: 6 }}>
            <select id="cMove" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">Select department…</option>
              {targetOptions.map((d) => <option key={d.department}>{d.department}</option>)}
            </select>
            <button className="hbtn" style={{ background: 'var(--navy)' }} onClick={handleMove} disabled={!target}>
              → Move &amp; recompute
            </button>
          </span>
        </div>
      </div>

      <div id="compSummary">
        <div className="kpi">
          <div className="k">Position context</div>
          <div className="v" style={{ fontSize: 12, fontFamily: 'inherit' }}>{loc.div.name}</div>
          <div className="d flat">{loc.sub.name} → {loc.dept.department}</div>
        </div>
        <div className={`kpi${pReady < 70 ? ' hero' : ''}`}>
          <div className="k">Individual readiness</div>
          <div className="v">{pReady}%</div>
          <div className="d flat">{met} of {techRows.length} required skills met</div>
        </div>
        <div className="kpi">
          <div className="k">Deepest gap</div>
          <div className="v" style={{ fontSize: 12, fontFamily: 'inherit' }}>
            {deepest ? (SFIA.skills[deepest.code]?.name || deepest.code) : 'None'}
          </div>
          <div className={`d ${deepest ? 'up' : 'down'}`}>
            {deepest ? `held ${deepest.have || 0} vs required ${deepest.req}` : 'profile fully met'}
          </div>
        </div>
        <div className="kpi">
          <div className="k">Unit readiness</div>
          <div className="v">{loc.dept.readiness}%</div>
          <div className="d flat">{loc.dept.department} · {loc.dept.people.length} sampled roles</div>
        </div>
      </div>

      <div className="twocol">
        <div className="card">
          <div className="chead">
            <h3>Technical Skills — Required vs Held (SFIA 10)</h3>
            <span className="mini">{person.name} · {loc.dept.department} · {loc.sub.name}</span>
          </div>
          <div className="cbody">
            <table className="gap">
              <tbody>
                <tr><th>SFIA skill</th><th>Req</th><th>Held</th><th>Profile (1–7)</th><th>RAG</th></tr>
                {techRows.map((r) => (
                  <tr key={r.code}>
                    <td>{SFIA.skills[r.code]?.name || r.code} <span className="mono" style={{ color: 'var(--faint)' }}>{r.code}</span></td>
                    <td className="mono">{r.req}</td>
                    <td className="mono">{r.have || '—'}</td>
                    <td><LevelBar have={r.have} req={r.req} /></td>
                    <td><span className={`rag ${r.rag}`}>{r.gap >= 0 ? (r.gap > 0 ? `+${r.gap}` : 'MET') : r.gap}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="card">
            <div className="chead"><h3>Profile Radar</h3><span className="mini">required ▢ vs held ■</span></div>
            <div className="cbody" id="radarBox" style={{ display: 'flex', justifyContent: 'center', padding: '6px 0' }}>
              <RadarChart rows={techRows.slice(0, 8)} />
            </div>
          </div>
          <div className="card">
            <div className="chead"><h3>Behavioural Factors</h3></div>
            <div className="cbody">
              <table className="gap">
                <tbody>
                  <tr><th>Behaviour</th><th>Req</th><th>Held</th><th>RAG</th></tr>
                  {behRows.map((r) => (
                    <tr key={r.code}>
                      <td>{SFIA.behaviours[r.code]?.name || r.code}</td>
                      <td className="mono">{r.req}</td>
                      <td className="mono">{r.have || '—'}</td>
                      <td><span className={`rag ${r.rag}`}>{r.gap >= 0 ? (r.gap > 0 ? `+${r.gap}` : 'MET') : r.gap}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 10 }}>
        <div className="chead">
          <h3>AI Learning Needs Analysis</h3>
          <span className="mini">framework: SFIA 10</span>
        </div>
        <div className="cbody"><p style={{ whiteSpace: 'pre-wrap' }}>{lna}</p></div>
      </div>
    </section>
  );
}

import { useState } from 'react';
import type { UiOrgModel } from './model';
import { allPeople } from './model';
import { computeCalibration, PERF_SCALE, perfLabel, perfTrack, perfPlanId } from '../../src/engines/perf';
import type { PerfRating } from '../../src/engines/perf';
import { PERF_PLANS, PERF_MODULES } from '../../src/engines/perf-plans';
import { compaRatio } from '../../src/engines/eosb';
import { fmtN } from '../../src/engines/format';

const DIST_COLORS: Record<number, string> = { 1: '#c00000', 2: '#ed7d31', 3: '#2e75b6', 4: '#548235', 5: '#7030a0' };
const CHIP_COLORS = ['#1f3864', '#2e75b6', '#c00000', '#548235', '#bf8f00'];
const MODULE_PRIORITY_COLOR: Record<string, string> = { P1: '#c00000', P2: '#bf8f00', P3: '#548235' };

interface PerformancePaneProps {
  model: UiOrgModel;
  onRate: (personId: string, rating: PerfRating) => void;
}

export default function PerformancePane({ model, onRate }: PerformancePaneProps) {
  const [div, setDiv] = useState('');
  const [dept, setDept] = useState('');
  const [rating, setRating] = useState('');
  const [search, setSearch] = useState('');

  const records = allPeople(model);
  const calibration = computeCalibration(records.map((r) => r.person.perf as PerfRating));
  const depts = [...new Set(records.filter((r) => !div || r.div.name === div).map((r) => r.dept.department))].sort();

  const q = search.toLowerCase();
  const filtered = records.filter((r) =>
    (!div || r.div.name === div) &&
    (!dept || r.dept.department === dept) &&
    (!rating || String(r.person.perf) === rating) &&
    (!q || r.person.name.toLowerCase().includes(q) || r.person.job.toLowerCase().includes(q) || r.person.grade.toLowerCase().includes(q))
  );
  const CAP = 250;
  const shown = filtered.slice(0, CAP);

  return (
    <section className="tabpane active">
      <div className="tipbar">
        💡 <b>Rate anyone 1–5</b> with the dropdown — the label, development track, plan assignment, distribution, 9-Box and merit simulator all recalculate. Ratings 2–4 are auto-assigned a <b>70/20/10 development plan</b> toward the next level; rating 1 routes to a <b>90-day PIP</b>, rating 5 to <b>sustain &amp; stretch</b>.
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        {[
          ['Employees rated', fmtN(records.length)],
          ['On development plan (2–4)', fmtN(calibration.onDevelopmentPlan)],
          ['On PIP (rating 1)', fmtN(calibration.countByRating[1])],
          ['Outstanding (rating 5)', fmtN(calibration.countByRating[5])],
          ['Average rating', calibration.averageRating.toFixed(2)],
        ].map(([k, v], i) => (
          <div key={k} style={{ flex: 1, minWidth: 110, background: '#fff', border: '1px solid var(--line)', borderLeft: `4px solid ${CHIP_COLORS[i]}`, borderRadius: 8, padding: '8px 12px' }}>
            <div style={{ fontSize: 9, color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{k}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)' }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div className="card">
          <div className="chead"><h3>Rating Distribution vs Calibration Guideline</h3><span className="mini">{fmtN(records.length)} employees · avg {calibration.averageRating.toFixed(2)}</span></div>
          <div className="cbody">
            {calibration.rows.map((r) => (
              <div key={r.rating} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 120px', gap: 8, alignItems: 'center', marginBottom: 6, fontSize: 11 }}>
                <div><b>{r.rating} · {perfLabel(r.rating)}</b></div>
                <div style={{ background: '#eef1f6', borderRadius: 5, height: 16, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ width: `${r.pct.toFixed(1)}%`, background: DIST_COLORS[r.rating], height: '100%' }} />
                  <div style={{ position: 'absolute', left: `${r.guidelinePct}%`, top: 0, bottom: 0, borderLeft: '2px dashed #333' }} title={`guideline ${r.guidelinePct}%`} />
                </div>
                <div className="mono" style={{ fontSize: 10 }}>{fmtN(r.count)} · {r.pct.toFixed(1)}% <span style={{ color: 'var(--faint)' }}>(guide {r.guidelinePct}%)</span></div>
              </div>
            ))}
            <div style={{ fontSize: 9, color: 'var(--faint)', marginTop: 4 }}>Dashed line = calibration guideline. Illustrative seeded ratings — replace with real appraisal outcomes before decisions.</div>
          </div>
        </div>

        <div className="card">
          <div className="chead"><h3>Rating Scale — Behavioural Anchors</h3><span className="mini">1–5, consequence-linked</span></div>
          <div className="cbody" style={{ fontSize: 11 }}>
            <table className="gap">
              <tbody>
                <tr><th>R</th><th>Label</th><th>Anchor</th><th>Route</th></tr>
                {PERF_SCALE.map((s) => (
                  <tr key={s.rating}>
                    <td><b>{s.rating}</b></td>
                    <td style={{ whiteSpace: 'nowrap' }}><b>{s.label}</b><div style={{ color: 'var(--faint)', fontSize: 9 }}>{s.route}</div></td>
                    <td>{s.anchor}</td>
                    <td></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 10 }}>
        <div className="chead"><h3>Employee Ratings &amp; Assigned Development Plans</h3><span className="mini">{fmtN(filtered.length)} of {fmtN(records.length)} employees · blue rating = editable input</span></div>
        <div className="cbody">
          <div className="selrow" style={{ marginBottom: 8 }}>
            <div className="sel">
              <label>Division</label>
              <select value={div} onChange={(e) => { setDiv(e.target.value); setDept(''); }}>
                <option value="">All divisions</option>
                {model.divisions.map((d) => <option key={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div className="sel">
              <label>Department</label>
              <select value={dept} onChange={(e) => setDept(e.target.value)}>
                <option value="">All departments</option>
                {depts.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="sel">
              <label>Rating</label>
              <select value={rating} onChange={(e) => setRating(e.target.value)}>
                <option value="">All ratings</option>
                {[1, 2, 3, 4, 5].map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="sel">
              <label>Search</label>
              <input type="text" placeholder="name / job / grade…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ padding: '5px 8px', border: '1px solid var(--line)', borderRadius: 6, font: 'inherit' }} />
            </div>
          </div>
          <div style={{ maxHeight: 420, overflow: 'auto' }}>
            <table className="gap">
              <tbody>
                <tr><th>Employee</th><th>Division · Department</th><th>Job · Grade</th><th>Base (AED)</th><th>Compa</th><th>Rating</th><th>Label</th><th>Development Track</th><th>Plan</th></tr>
                {shown.map((r) => {
                  const cr = compaRatio(r.person);
                  const pid = perfPlanId(r.person.perf as PerfRating, r.person.grade);
                  return (
                    <tr key={r.person.id}>
                      <td style={{ whiteSpace: 'nowrap' }}><b>{r.person.name}</b><div className="mono" style={{ fontSize: 9, color: 'var(--faint)' }}>{r.person.id}</div></td>
                      <td style={{ fontSize: 10 }}>{r.div.name}<div style={{ color: 'var(--faint)' }}>{r.dept.department}</div></td>
                      <td style={{ fontSize: 10 }}>{r.person.job} · <b>{r.person.grade}</b></td>
                      <td className="mono">{fmtN(r.person.sal)}</td>
                      <td className="mono" style={{ color: cr < 0.9 ? '#c00000' : cr > 1.1 ? '#bf8f00' : 'inherit' }}>{cr.toFixed(2)}</td>
                      <td>
                        <select
                          value={r.person.perf}
                          onChange={(e) => onRate(r.person.id, Number(e.target.value) as PerfRating)}
                          style={{ font: 'inherit', padding: '2px 4px', border: '1px solid var(--line)', borderRadius: 5, color: '#0000cc', fontWeight: 700 }}
                        >
                          {[1, 2, 3, 4, 5].map((v) => <option key={v}>{v}</option>)}
                        </select>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{perfLabel(r.person.perf as PerfRating)}</td>
                      <td style={{ fontSize: 10 }}>{perfTrack(r.person.perf as PerfRating)}</td>
                      <td><span className="mono" style={{ fontSize: 10, fontWeight: 700 }}>{pid}</span></td>
                    </tr>
                  );
                })}
                {filtered.length > CAP && (
                  <tr><td colSpan={9} style={{ color: 'var(--faint)' }}>Showing first {CAP} of {fmtN(filtered.length)} — refine the filters above.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 10 }}>
        <div className="chead"><h3>Development Plan Library — 70 / 20 / 10</h3><span className="mini">per career stream · per transition · plus PIP &amp; stretch</span></div>
        <div className="cbody">
          {Object.entries(PERF_PLANS).map(([id, pl]) => (
            <details key={id} style={{ border: '1px solid var(--line)', borderRadius: 7, marginBottom: 6, background: '#fafbfd' }}>
              <summary style={{ cursor: 'pointer', padding: '7px 10px', fontSize: 11 }}>
                <b className="mono">{id}</b> · <b>{pl.stream}</b> · {pl.trans} — <span style={{ color: 'var(--mut)' }}>{pl.obj}</span>
              </summary>
              <div style={{ padding: '2px 12px 10px', fontSize: 11, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                <div><b>Development focus</b><br />{pl.focus}</div>
                <div><b>Timeline</b><br />{pl.time}</div>
                <div><b>70% · On-the-job experience</b><br />{pl.otj}</div>
                <div><b>20% · Coaching &amp; exposure</b><br />{pl.coach}</div>
                <div><b>10% · Formal learning</b><br />{pl.learn}</div>
                <div><b>Success measures / exit criteria</b><br />{pl.exit}</div>
              </div>
            </details>
          ))}
          <div style={{ fontSize: 9, color: 'var(--faint)' }}>Role-family templates — manager + HRBP must localise objectives, actions and measures per individual before sign-off.</div>
        </div>
      </div>

      <div className="card">
        <div className="chead"><h3>Suggested Additional HR Modules</h3><span className="mini">build-out roadmap beyond modules 01–10</span></div>
        <div className="cbody">
          <table className="gap">
            <tbody>
              <tr><th>#</th><th>Module</th><th>What it does</th><th>Links to this dashboard</th><th>Priority</th></tr>
              {PERF_MODULES.map((m) => (
                <tr key={m.no}>
                  <td><b>{m.no}</b></td>
                  <td style={{ whiteSpace: 'nowrap' }}><b>{m.name}</b></td>
                  <td>{m.what}</td>
                  <td style={{ color: 'var(--mut)' }}>{m.links}</td>
                  <td><b style={{ color: MODULE_PRIORITY_COLOR[m.priority] }}>{m.priority}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 9, color: 'var(--faint)', marginTop: 6 }}>P1 = build next (closes a live gap) · P2 = lifecycle completion · P3 = analytics &amp; experience layer. Module 10 (this tab) is the Performance Management module itself.</div>
        </div>
      </div>
    </section>
  );
}

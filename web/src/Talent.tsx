import { useState } from 'react';
import type { UiOrgModel } from './model';
import { allPeople, allDepartments, findDept } from './model';
import { buildNineBox, identifyCriticalRoles, successionBench, modelMobility, learningBudgetByDivision } from '../../src/engines/talent';
import type { MobilityResult } from '../../src/engines/talent';
import { SFIA } from '../../src/engines/sfia-catalogue';
import { fmtAED } from '../../src/engines/format';

interface TalentPaneProps {
  model: UiOrgModel;
}

export default function TalentPane({ model }: TalentPaneProps) {
  const records = allPeople(model);
  const depts = allDepartments(model);

  const nineBoxRecords = records.map((r) => ({ person: r.person, deptName: r.dept.department, divName: r.div.name, subdivisionName: r.sub.name }));
  const cells = buildNineBox(nineBoxRecords);
  const cellAt = (pot: number, perf: number) => cells.find((c) => c.potentialBucket === pot && c.perfBucket === perf)!;

  const criticalRoles = identifyCriticalRoles(
    depts.map((d) => ({ deptName: d.department, divName: d._division, subdivisionName: d._subdivision, hayTotal: d.hay.total })),
    6
  );
  const candidates = records.map((r) => ({ person: r.person, deptName: r.dept.department }));

  const learningBudget = learningBudgetByDivision(records.map((r) => ({ person: r.person, deptName: r.dept.department, divName: r.div.name, subdivisionName: r.sub.name })));
  const maxBudget = learningBudget.rows[0]?.cost || 1;

  const [mobPersonId, setMobPersonId] = useState(records[0]?.person.id ?? '');
  const [mobTarget, setMobTarget] = useState(depts[1]?.department ?? depts[0]?.department ?? '');
  const [mobResult, setMobResult] = useState<MobilityResult | 'same' | null>(null);

  function runMobility() {
    const rec = records.find((r) => r.person.id === mobPersonId);
    const loc = findDept(model, mobTarget);
    if (!rec || !loc) return;
    if (rec.dept.department === mobTarget) { setMobResult('same'); return; }
    setMobResult(modelMobility(rec.person, rec.dept.department, { deptName: loc.dept.department, divName: loc.div.name, subdivisionName: loc.sub.name }));
  }

  return (
    <section className="tabpane active">
      <div className="twocol">
        <div className="card">
          <div className="chead"><h3>9-Box — Performance × Potential (SFIA surplus)</h3><span className="mini">{records.length} employees</span></div>
          <div className="cbody">
            <div style={{ display: 'flex', gap: 6, fontSize: 9, color: 'var(--mut)', marginBottom: 4 }}>
              <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', textAlign: 'center' }}>Potential (SFIA surplus) →</span>
              <div style={{ flex: 1 }}>
                <div className="nine">
                  {[2, 1, 0].flatMap((pot) => [0, 1, 2].map((perf) => {
                    const cell = cellAt(pot, perf);
                    const cls = pot === 2 && perf === 2 ? ' hot' : pot === 0 && perf === 0 ? ' cold' : '';
                    return (
                      <div className={`nb${cls}`} key={`${pot}-${perf}`}>
                        <h5>{cell.label} · {cell.occupants.length}</h5>
                        {cell.occupants.slice(0, 6).map((o) => (
                          <div className="np" key={o.personId}>{o.personName} <span className="g">{o.grade} · {o.deptName.slice(0, 14)}</span></div>
                        ))}
                        {cell.occupants.length > 6 && <div className="np" style={{ color: 'var(--faint)' }}>+{cell.occupants.length - 6} more…</div>}
                      </div>
                    );
                  }))}
                </div>
                <div style={{ textAlign: 'center', marginTop: 3, fontSize: 9, color: 'var(--mut)' }}>Performance rating →</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="chead"><h3>Succession — Critical Roles &amp; Bench</h3><span className="mini">Hay-critical · SFIA gap distance</span></div>
          <div className="cbody" style={{ maxHeight: 360, overflow: 'auto' }}>
            {criticalRoles.map((role) => {
              const bench = successionBench(role, candidates, 3);
              return (
                <div key={role.deptName} style={{ border: '1px solid var(--line)', borderRadius: 7, padding: '7px 9px', marginBottom: 7, background: '#fafbfd' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <b style={{ fontSize: 11, color: 'var(--navy)' }}>Head of {role.deptName}</b>
                    <span className="hay-tag" style={{ position: 'static' }}>CRITICAL · HAY {role.hayTotal}</span>
                    <span className="mono" style={{ fontSize: 9, color: 'var(--faint)' }}>{role.divName}</span>
                  </div>
                  {bench.map((c) => (
                    <div key={c.personId} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 60px', gap: 6, alignItems: 'center', fontSize: 10, marginTop: 4 }}>
                      <span>{c.personName} <span className="mono" style={{ color: 'var(--faint)' }}>{c.grade} · {c.deptName.slice(0, 16)}</span></span>
                      <div className={`bar${c.readiness >= 70 ? ' t' : ''}`}><i style={{ width: `${c.readiness}%` }} /></div>
                      <span className="mono" style={{ color: c.readiness >= 70 ? 'var(--ok)' : c.readiness >= 45 ? 'var(--warn)' : 'var(--bad)' }}>{c.readiness}% ready</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="twocol" style={{ marginTop: 10 }}>
        <div className="card">
          <div className="chead"><h3>Mobility Marketplace — Career Path Simulator</h3><span className="mini">SFIA adjacency</span></div>
          <div className="cbody">
            <div className="selrow" style={{ marginBottom: 8 }}>
              <div className="sel">
                <label>Employee</label>
                <select value={mobPersonId} onChange={(e) => { setMobPersonId(e.target.value); setMobResult(null); }}>
                  {records.map((r) => <option key={r.person.id} value={r.person.id}>{r.person.name} — {r.dept.department} ({r.person.grade})</option>)}
                </select>
              </div>
              <div className="sel">
                <label>Target department</label>
                <select value={mobTarget} onChange={(e) => { setMobTarget(e.target.value); setMobResult(null); }}>
                  {depts.map((d) => <option key={d.department}>{d.department}</option>)}
                </select>
              </div>
              <button className="hbtn" style={{ background: 'var(--navy)', alignSelf: 'flex-end' }} onClick={runMobility}>Simulate path</button>
            </div>
            {!mobResult && <p className="empty">Pick an employee and a destination — the simulator measures the SFIA distance to the target role profile.</p>}
            {mobResult === 'same' && <p className="empty">Already in this department — pick another destination.</p>}
            {mobResult && mobResult !== 'same' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
                  <div className={`kpi${mobResult.readiness >= 70 ? '' : ' hero'}`}>
                    <div className="k">Move readiness</div><div className="v">{mobResult.readiness}%</div>
                    <div className="d flat">{mobResult.fromDept} → {mobResult.toDept}</div>
                  </div>
                  <div className="kpi"><div className="k">Bridge cost</div><div className="v">{fmtAED(mobResult.bridgeCost)}</div><div className="d flat">training to close gaps</div></div>
                  <div className="kpi">
                    <div className="k">Est. transition</div><div className="v">{mobResult.transitionLabel}</div>
                    <div className="d flat">{!mobResult.viableDirectMove ? 'not viable as a direct move — path via an adjacent role first' : 'at 1 level / 6 weeks'}</div>
                  </div>
                </div>
                {mobResult.deficits.length > 0 ? (
                  <p style={{ fontSize: 11, marginBottom: 5 }}>
                    <b>SFIA adjacency:</b> {mobResult.deficits.slice(0, 4).map((g) => (
                      <span key={g.c}><b style={{ color: 'var(--red)' }}>{g.g} level{g.g > 1 ? 's' : ''} short in {SFIA.skills[g.c]?.name || g.c}</b> ({g.have}→{g.req}); </span>
                    ))}
                    {mobResult.deficits.length > 4 ? ` +${mobResult.deficits.length - 4} more` : ''}.
                  </p>
                ) : (
                  <p style={{ fontSize: 11, color: 'var(--ok)' }}><b>Fully adjacent</b> — the profile already meets the target role requirements. Recommend immediate posting via internal marketplace.</p>
                )}
                <p style={{ fontSize: 10, color: 'var(--mut)' }}>Tip: execute the move on the Org Design Studio or Org Chart tab (drag the person) — JDs, cost and gap analytics will re-baseline automatically.</p>
              </>
            )}
          </div>
        </div>

        <div className="card">
          <div className="chead"><h3>Learning Budget Planner</h3><span className="mini">{fmtAED(learningBudget.total)} total · priced per SFIA level</span></div>
          <div className="cbody">
            {learningBudget.rows.map((r) => (
              <div key={r.divisionName} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 70px', gap: 6, alignItems: 'center', marginBottom: 5, fontSize: 10 }}>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.divisionName}>{r.divisionName}</span>
                <div className="bar"><i style={{ width: `${Math.round((100 * r.cost) / maxBudget)}%` }} /></div>
                <span className="mono">{fmtAED(r.cost)}</span>
              </div>
            ))}
            <div style={{ fontSize: 9.5, color: 'var(--mut)', marginTop: 6 }}>Security &amp; data gaps priced at premium rates. Log completions to Oracle Learning to burn down the budget.</div>
          </div>
        </div>
      </div>
    </section>
  );
}

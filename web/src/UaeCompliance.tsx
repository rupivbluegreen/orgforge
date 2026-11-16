import { useState } from 'react';
import type { UiOrgModel } from './model';
import { allPeople, allDepartments } from './model';
import { eosb, noticePay, tenureYears, gradeMid, EMIRATIZATION_TARGET } from '../../src/engines/eosb';
import { hashStr } from '../../src/engines/person';
import { modelRestructuring } from '../../src/engines/restructuring';
import type { RestructuringAction, RestructuringModel, RedeploymentCandidate } from '../../src/engines/restructuring';
import { fmtAED } from '../../src/engines/format';

interface UaeCompliancePaneProps {
  model: UiOrgModel;
  onExecute: (deptName: string, action: RestructuringAction) => Promise<boolean>;
}

export default function UaeCompliancePane({ model, onExecute }: UaeCompliancePaneProps) {
  const depts = allDepartments(model);
  const records = allPeople(model);
  const people = records.map((r) => r.person);

  const [rsDept, setRsDept] = useState(depts[0]?.department ?? '');
  const [rsAction, setRsAction] = useState<string>('delete');
  const [rsModel, setRsModel] = useState<RestructuringModel | null>(null);

  const liability = people.reduce((s, p) => s + eosb(p), 0);
  const avgTenure = people.length ? people.reduce((s, p) => s + tenureYears(p), 0) / people.length : 0;
  const nats = people.filter((p) => p.nationality === 'UAE National').length;
  const pct = people.length ? nats / people.length : 0;
  const openPositions = depts.reduce((v, d) => v + Math.max(0, d.approvedHC - d.hc), 0);

  const suggestions = depts
    .filter((d) => Math.max(0, d.approvedHC - d.hc) > 0 && !d.frozen)
    .map((d) => {
      const grade = ['C2', 'C3', 'P3'][hashStr(d.department) % 3];
      return { dept: d.department, div: d._division, open: d.approvedHC - d.hc, grade, cost: gradeMid(grade) };
    })
    .sort((a, b) => 1 / a.cost - 1 / b.cost)
    .slice(0, 5);

  function runModel() {
    const loc = depts.find((d) => d.department === rsDept);
    if (!loc) return;
    const action: RestructuringAction = rsAction === 'delete' ? 'delete' : (Number(rsAction) as RestructuringAction);
    const candidates: RedeploymentCandidate[] = depts.map((d) => ({
      deptName: d.department, divisionName: d._division, subdivisionName: d._subdivision,
      hc: d.hc, approvedHC: d.approvedHC, frozen: d.frozen,
    }));
    setRsModel(modelRestructuring(rsDept, action, candidates, loc.people));
  }

  async function execute() {
    if (!rsModel) return;
    const ok = await onExecute(rsModel.deptName, rsModel.action);
    if (ok) setRsModel(null);
  }

  return (
    <section className="tabpane active">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 }}>
        <div className="kpi hero">
          <div className="k">EOSB liability (sampled roles)</div>
          <div className="v">{fmtAED(liability)}</div>
          <div className="d flat">gratuity accrued to date</div>
        </div>
        <div className="kpi">
          <div className="k">Avg tenure</div>
          <div className="v">{avgTenure.toFixed(1)} yrs</div>
          <div className="d flat">drives 21→30 day accrual step</div>
        </div>
        <div className={`kpi${pct < EMIRATIZATION_TARGET ? ' hero' : ''}`}>
          <div className="k">Emiratization (sampled)</div>
          <div className="v">{(pct * 100).toFixed(0)}%</div>
          <div className={`d ${pct < EMIRATIZATION_TARGET ? 'up' : 'down'}`}>
            target {(EMIRATIZATION_TARGET * 100).toFixed(0)}% · gap {Math.max(0, Math.ceil((EMIRATIZATION_TARGET - pct) * people.length))} hires
          </div>
        </div>
        <div className="kpi">
          <div className="k">Open positions</div>
          <div className="v">{openPositions}</div>
          <div className="d flat">approved minus actual</div>
        </div>
      </div>

      <div className="twocol">
        <div className="card">
          <div className="chead"><h3>EOSB / Gratuity Liability — UAE Labour Law</h3><span className="mini">21d/yr ≤5yrs · 30d/yr after · cap 24m basic</span></div>
          <div className="cbody">
            <table className="gap">
              <tbody>
                <tr><th>Division</th><th>Sampled HC</th><th>Avg tenure</th><th>EOSB liability</th><th>+ Notice exposure</th></tr>
                {model.divisions.map((div) => {
                  const set = records.filter((r) => r.div.name === div.name);
                  if (!set.length) return null;
                  const L = set.reduce((s, r) => s + eosb(r.person), 0);
                  const N = set.reduce((s, r) => s + noticePay(r.person), 0);
                  return (
                    <tr key={div.name}>
                      <td><b>{div.name}</b></td>
                      <td className="mono">{set.length}</td>
                      <td className="mono">{(set.reduce((s, r) => s + tenureYears(r.person), 0) / set.length).toFixed(1)}y</td>
                      <td className="mono">{fmtAED(L)}</td>
                      <td className="mono">{fmtAED(L + N)}</td>
                    </tr>
                  );
                })}
                <tr style={{ fontWeight: 700, background: '#f1f3f9' }}>
                  <td>TOTAL</td>
                  <td className="mono">{people.length}</td>
                  <td></td>
                  <td className="mono">{fmtAED(liability)}</td>
                  <td className="mono">{fmtAED(liability + people.reduce((s, p) => s + noticePay(p), 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="chead"><h3>Emiratization — UAE National % vs Target</h3><span className="mini">target 30% illustrative</span></div>
          <div className="cbody">
            {model.divisions.map((div) => {
              const set = records.filter((r) => r.div.name === div.name);
              if (!set.length) return null;
              const pc = set.filter((r) => r.person.nationality === 'UAE National').length / set.length;
              return (
                <div key={div.name} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 44px', gap: 6, alignItems: 'center', marginBottom: 5, fontSize: 10 }}>
                  <span title={div.name} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{div.name}</span>
                  <div className={`bar${pc >= EMIRATIZATION_TARGET ? ' t' : ''}`}>
                    <i style={{ width: `${Math.min(100, (pc * 100) / 0.6)}%` }} />
                    <span style={{ position: 'absolute', left: `${Math.min(96, (EMIRATIZATION_TARGET * 100) / 0.6)}%`, top: -2, bottom: -2, width: 2, background: 'var(--red)' }} />
                  </div>
                  <span className="mono" style={{ color: pc >= EMIRATIZATION_TARGET ? 'var(--ok)' : 'var(--bad)' }}>{(pc * 100).toFixed(0)}%</span>
                </div>
              );
            })}
            <div style={{ marginTop: 8, fontSize: 10.5 }}>
              <b style={{ color: 'var(--navy)' }}>Cheapest compliance closure — fill these vacancies with UAE Nationals:</b>
              <table className="gap" style={{ marginTop: 4 }}>
                <tbody>
                  <tr><th>#</th><th>Vacancy</th><th>Division</th><th>Entry grade</th><th>Annual cost</th></tr>
                  {suggestions.map((s, i) => (
                    <tr key={s.dept}>
                      <td className="mono">{i + 1}</td>
                      <td><b>{s.dept}</b> ({s.open} open)</td>
                      <td style={{ fontSize: 10 }}>{s.div}</td>
                      <td className="mono">{s.grade}</td>
                      <td className="mono">{fmtAED(s.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 10 }}>
        <div className="chead"><h3>Restructuring Cost Modeler</h3><span className="mini">notice + EOSB + redeploy vs redundancy</span></div>
        <div className="cbody">
          <div className="selrow" style={{ marginBottom: 8 }}>
            <div className="sel">
              <label>Department</label>
              <select value={rsDept} onChange={(e) => { setRsDept(e.target.value); setRsModel(null); }}>
                {depts.map((d) => <option key={d.department}>{d.department}</option>)}
              </select>
            </div>
            <div className="sel">
              <label>Action</label>
              <select value={rsAction} onChange={(e) => { setRsAction(e.target.value); setRsModel(null); }}>
                <option value="delete">Delete entire department</option>
                <option value="1">Downsize by 1</option>
                <option value="2">Downsize by 2</option>
              </select>
            </div>
            <button className="hbtn" style={{ background: 'var(--navy)', alignSelf: 'flex-end' }} onClick={runModel}>Model cost</button>
            <button className="hbtn red" style={{ alignSelf: 'flex-end' }} onClick={execute} disabled={!rsModel}>Execute (writes spine)</button>
          </div>

          {!rsModel && <p className="empty">Pick a department and model the restructuring cost before executing.</p>}
          {rsModel && (
            <>
              {rsModel.rows.length === 0 && <p className="empty">No sampled incumbents to model in this unit.</p>}
              {rsModel.rows.length > 0 && (
                <>
                  <table className="gap">
                    <tbody>
                      <tr><th>Employee</th><th>Tenure</th><th>Notice</th><th>EOSB</th><th>Redundancy cost</th><th>Best redeployment</th><th>Retraining cost</th><th>AI recommendation</th></tr>
                      {rsModel.rows.map((r) => (
                        <tr key={r.personId}>
                          <td>{r.personName} <span className="mono" style={{ color: 'var(--faint)' }}>{r.grade}</span></td>
                          <td className="mono">{r.tenureYears.toFixed(1)}y</td>
                          <td className="mono">{fmtAED(r.noticePay)}</td>
                          <td className="mono">{fmtAED(r.eosb)}</td>
                          <td className="mono" style={{ color: 'var(--bad)' }}>{fmtAED(r.redundancyCost)}</td>
                          <td>{r.bestRedeployment ? <>→ {r.bestRedeployment.deptName} <span className="mono" style={{ fontSize: 9 }}>({r.bestRedeployment.gapPts} gap pts)</span></> : '—'}</td>
                          <td className="mono" style={{ color: 'var(--ok)' }}>{r.bestRedeployment ? fmtAED(r.bestRedeployment.cost) : 'n/a'}</td>
                          <td><span className={`rag ${r.recommendation === 'REDEPLOY' ? 'G' : 'A'}`}>{r.recommendation}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 10 }}>
                    <div className="kpi"><div className="k">Full redundancy route</div><div className="v">{fmtAED(rsModel.totalRedundancyCost)}</div><div className="d flat">notice + EOSB payout</div></div>
                    <div className="kpi"><div className="k">Full redeployment route</div><div className="v">{fmtAED(rsModel.totalRedeploymentCost)}</div><div className="d flat">retraining to nearest open roles</div></div>
                    <div className="kpi hero"><div className="k">Recommended blend saves</div><div className="v">{fmtAED(rsModel.recommendedSavings)}</div><div className="d down">vs pure redundancy</div></div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

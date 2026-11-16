import type { ScenarioSlot } from './App';
import { allPeople, allDepartments, orgTotals, orgStats } from './model';
import type { UiOrgModel } from './model';
import { compareScenarios, computeSpanOfControl, buildPositionLedger } from '../../src/engines/workforce';
import type { CostTotals } from '../../src/engines/cost';
import { flightRisk, compaRatio, gradeMid } from '../../src/engines/eosb';
import { sfiaSurplus } from '../../src/engines/sfia-gap';
import { fmtAED, fmtN } from '../../src/engines/format';

interface WorkforcePaneProps {
  model: UiOrgModel;
  history: UiOrgModel[];
  scenarios: { A: ScenarioSlot | null; B: ScenarioSlot | null };
  onSave: (key: 'A' | 'B') => void;
  onLoad: (key: 'A' | 'B') => void;
  onCommit: () => void;
}

export default function WorkforcePane({ model, history, scenarios, onSave, onLoad, onCommit }: WorkforcePaneProps) {
  const cur = { totals: orgTotals(model), ready: orgStats(model).ready, movesCount: history.length };
  const { A, B } = scenarios;

  const spanRows = model.divisions.map((div) => {
    const sc = computeSpanOfControl(div.subdivisions.flatMap((s) => s.departments).map((d) => ({
      headHayTotal: d.hay.total, people: d.people.map((p) => ({ grade: p.grade, sal: p.sal })),
    })));
    return { name: div.name, ...sc };
  });

  const records = allPeople(model);
  const risks = records.filter((r) => flightRisk(r.person, r.div.name, r.sub.name, r.dept.department));

  const posLedger = buildPositionLedger(allDepartments(model).map((d) => ({
    deptName: d.department, divisionName: d._division, approvedHC: d.approvedHC, hc: d.hc, frozen: d.frozen,
  })));

  const comparison = A && B ? compareScenarios(A, B) : null;

  function col(label: string, slot: { totals: CostTotals; ready: number; movesCount: number } | null) {
    if (!slot) {
      return (
        <div className="kpi" key={label}><div className="k">{label}</div><div className="v" style={{ fontSize: 12 }}>—</div><div className="d flat">not saved</div></div>
      );
    }
    return (
      <div className="kpi" key={label}>
        <div className="k">{label}</div>
        <div className="v" style={{ fontSize: 12, fontFamily: 'var(--mono)' }}>{fmtAED(slot.totals.ctc)} CTC</div>
        <div className="d flat">{fmtN(slot.totals.hc)} HC · ready {slot.ready}% · {slot.movesCount} moves</div>
      </div>
    );
  }

  return (
    <section className="tabpane active">
      <div className="card" style={{ marginBottom: 10 }}>
        <div className="chead"><h3>Scenario Workspaces</h3><span className="mini">branch · compare · commit</span></div>
        <div className="cbody">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <button className="hbtn" style={{ background: 'var(--navy)' }} onClick={() => onSave('A')}>Save current → Scenario A</button>
            <button className="hbtn" style={{ background: 'var(--navy)' }} onClick={() => onSave('B')}>Save current → Scenario B</button>
            <button className="hbtn" onClick={() => onLoad('A')} disabled={!A}>Load A</button>
            <button className="hbtn" onClick={() => onLoad('B')} disabled={!B}>Load B</button>
            <button className="hbtn red" onClick={onCommit}>Commit current to spine (new baseline)</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {col('CURRENT CANVAS', cur)}
            {col('SCENARIO A', A)}
            {col('SCENARIO B', B)}
          </div>
          {comparison && A && B && (
            <p style={{ fontSize: 11, marginTop: 8 }}>
              <b>Verdict:</b> {comparison.cheaper === 'equal' ? 'Scenarios are cost-neutral against each other' : `Scenario ${comparison.cheaper} is ${fmtAED(comparison.ctcDifference)} cheaper`};{' '}
              {comparison.moreReady === 'equal' ? 'readiness is equal' : `Scenario ${comparison.moreReady} is ${comparison.readinessDifference} pts more skills-ready`}. Load the winner and press <b>Commit</b>.
            </p>
          )}
        </div>
      </div>

      <div className="twocol">
        <div className="card">
          <div className="chead"><h3>Span-of-Control &amp; De-layering</h3><span className="mini">manager : IC · cost of management</span></div>
          <div className="cbody">
            <table className="gap">
              <tbody>
                <tr><th>Division</th><th>Managers</th><th>ICs</th><th>Span 1:</th><th>Cost of management</th><th>De-layering</th></tr>
                {spanRows.map((r) => (
                  <tr key={r.name}>
                    <td><b>{r.name}</b></td>
                    <td className="mono">{r.managers}</td>
                    <td className="mono">{r.ics}</td>
                    <td className="mono" style={{ color: r.span < 0.6 ? 'var(--bad)' : r.span < 1 ? 'var(--warn)' : 'var(--ok)' }}>{r.span.toFixed(1)}</td>
                    <td className="mono">{fmtAED(r.managementCost)}</td>
                    <td><span className={`rag ${r.status === 'REVIEW LAYERS' ? 'R' : r.status === 'MONITOR' ? 'A' : 'G'}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ fontSize: 9.5, color: 'var(--mut)', marginTop: 6 }}>Sampled roles only — spans read low vs full population; use relative ranking for de-layering priorities.</div>
          </div>
        </div>

        <div className="card">
          <div className="chead"><h3>Flight-Risk Overlay</h3><span className="mini">{risks.length} at risk</span></div>
          <div className="cbody" style={{ maxHeight: 300, overflow: 'auto' }}>
            {risks.length === 0 && <p className="empty">No employees currently flag as underpaid + overqualified.</p>}
            {risks.length > 0 && (
              <table className="gap">
                <tbody>
                  <tr><th>Employee</th><th>Unit</th><th>CR</th><th>SFIA surplus</th><th>Retention action</th></tr>
                  {risks.map((r) => {
                    const cr = compaRatio(r.person);
                    const fix = Math.round((gradeMid(r.person.grade) * 0.97 - r.person.sal) / 500) * 500;
                    return (
                      <tr key={r.person.id}>
                        <td>⚑ {r.person.name} <span className="mono" style={{ color: 'var(--faint)' }}>{r.person.grade}</span></td>
                        <td style={{ fontSize: 10 }}>{r.dept.department}</td>
                        <td className="mono" style={{ color: 'var(--bad)' }}>{cr.toFixed(2)}</td>
                        <td className="mono">+{sfiaSurplus(r.person, r.div.name, r.sub.name, r.dept.department)}</td>
                        <td style={{ fontSize: 10 }}>Adjust {fmtAED(Math.max(0, fix))} to CR 0.97, or promote via Mobility (Talent tab)</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 10 }}>
        <div className="chead"><h3>Position Management — Approved vs Actual</h3><span className="mini">{posLedger.totalApproved} approved · {posLedger.totalActual} actual · {posLedger.totalVacancies} open</span></div>
        <div className="cbody">
          <table className="gap">
            <tbody>
              <tr><th>Department</th><th>Approved</th><th>Actual</th><th>Vacancies</th><th>Freeze</th><th>Status</th></tr>
              {posLedger.rows.map((r) => (
                <tr key={r.deptName}>
                  <td><b>{r.deptName}</b> <span className="mono" style={{ fontSize: 9, color: 'var(--faint)' }}>{r.divisionName.slice(0, 18)}</span></td>
                  <td className="mono">{r.approvedHC}</td>
                  <td className="mono">{r.actualHC}</td>
                  <td className="mono" style={{ color: r.vacancies ? 'var(--warn)' : 'var(--faint)' }}>{r.vacancies || '—'}</td>
                  <td>{r.frozen ? <span className="rag R">FROZEN</span> : <span className="rag G">OPEN</span>}</td>
                  <td style={{ fontSize: 10 }}>{r.status}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 700, background: '#f1f3f9' }}>
                <td>TOTAL</td>
                <td className="mono">{posLedger.totalApproved}</td>
                <td className="mono">{posLedger.totalActual}</td>
                <td className="mono">{posLedger.totalVacancies}</td>
                <td className="mono">{posLedger.totalFrozen} frozen</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

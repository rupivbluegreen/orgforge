import { useState } from 'react';
import type { UiOrgModel } from './model';
import { allPeople } from './model';
import { fitPayLine, lineAt, findOutliers, gradeBandTable, equityHeatMap, DEFAULT_MERIT_MATRIX, projectMerit } from '../../src/engines/rewards';
import type { PayLineFit } from '../../src/engines/rewards';
import { fmtAED } from '../../src/engines/format';
import type { RebandCase } from './App';

const PERF_LABEL: Record<number, string> = { 1: 'Unsatisfactory', 2: 'Developing', 3: 'Meets', 4: 'Exceeds', 5: 'Outstanding' };

function PayLineChart({ points, fit, outlierIds }: { points: { id: string; x: number; y: number }[]; fit: PayLineFit; outlierIds: Set<string> }) {
  const W = 620, H = 260, ML = 58, MR = 12, MT = 10, MB = 26;
  const xs = points.map((p) => p.x);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const lineEnds = [lineAt(fit, xMin), lineAt(fit, xMax)];
  const bandEnds = [...lineEnds.map((y) => y * 1.2), ...lineEnds.map((y) => y * 0.8)];
  const allY = [...points.map((p) => p.y), ...bandEnds];
  const yMin = Math.min(...allY) * 0.95, yMax = Math.max(...allY) * 1.05;
  const sx = (x: number) => ML + ((x - xMin) / (xMax - xMin || 1)) * (W - ML - MR);
  const sy = (y: number) => H - MB - ((y - yMin) / (yMax - yMin || 1)) * (H - MT - MB);
  const path = (ys: [number, number]) => `M${sx(xMin)},${sy(ys[0])} L${sx(xMax)},${sy(ys[1])}`;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: W }}>
      <line x1={ML} y1={MT} x2={ML} y2={H - MB} stroke="#e4e8ef" />
      <line x1={ML} y1={H - MB} x2={W - MR} y2={H - MB} stroke="#e4e8ef" />
      <text x={ML} y={H - 6} fontSize={9} fill="var(--mut)">{Math.round(xMin)} pts</text>
      <text x={W - MR} y={H - 6} fontSize={9} fill="var(--mut)" textAnchor="end">{Math.round(xMax)} pts</text>
      <path d={path([lineEnds[0] * 1.2, lineEnds[1] * 1.2])} stroke="#98a2b3" strokeDasharray="5 4" fill="none" />
      <path d={path([lineEnds[0] * 0.8, lineEnds[1] * 0.8])} stroke="#98a2b3" strokeDasharray="5 4" fill="none" />
      <path d={path(lineEnds as [number, number])} stroke="var(--red)" strokeWidth={2} fill="none" />
      {points.map((p) => (
        <circle key={p.id} cx={sx(p.x)} cy={sy(p.y)} r={outlierIds.has(p.id) ? 4 : 3} fill={outlierIds.has(p.id) ? 'var(--red)' : 'var(--navy)'} />
      ))}
    </svg>
  );
}

interface RewardsPaneProps {
  model: UiOrgModel;
  rebandCases: RebandCase[];
}

export default function RewardsPane({ model, rebandCases }: RewardsPaneProps) {
  const [merit, setMerit] = useState<number[][]>(DEFAULT_MERIT_MATRIX.map((row) => [...row]));

  const records = allPeople(model);
  const people = records.map((r) => r.person);
  const fit = fitPayLine(people);
  const outliers = findOutliers(people, fit);
  const outlierIds = new Set(outliers.map((o) => o.person.id));
  const bands = gradeBandTable(people, fit);
  const cells = equityHeatMap(
    records.map((r) => ({ person: r.person, divisionName: r.div.name })),
    model.divisions.map((d) => d.name)
  );
  const projection = projectMerit(people, merit);

  function setCell(perf: number, tertile: number, value: number) {
    setMerit((m) => m.map((row, i) => (i === perf - 1 ? row.map((v, j) => (j === tertile ? value : v)) : row)));
  }

  const readyClass = (cr: number) => (cr < 0.92 ? '#b3261e' : cr < 0.97 ? '#c97b4a' : cr <= 1.05 ? '#0e7c66' : cr <= 1.12 ? '#4a6fa5' : '#14213d');

  return (
    <section className="tabpane active">
      <div className="twocol" style={{ gridTemplateColumns: '1.35fr 1fr' }}>
        <div className="card">
          <div className="chead"><h3>Pay-Line Modeling — Salary vs Hay Points</h3><span className="mini">{people.length} employees · slope AED {fit.slope.toFixed(0)}/Hay pt</span></div>
          <div className="cbody">
            <PayLineChart points={people.map((p) => ({ id: p.id, x: bandMidpointOf(p.grade, bands), y: p.sal }))} fit={fit} outlierIds={outlierIds} />
            <table className="gap" style={{ marginTop: 8 }}>
              <tbody>
                <tr><th>Grade</th><th>Hay mid</th><th>Min (80%)</th><th>Mid (pay line)</th><th>Max (120%)</th><th>Incumbents</th><th>Avg CR</th></tr>
                {bands.map((b) => (
                  <tr key={b.grade}>
                    <td><b>{b.grade}</b></td>
                    <td className="mono">{b.hayMid}</td>
                    <td className="mono">{fmtAED(b.min)}</td>
                    <td className="mono">{fmtAED(b.mid)}</td>
                    <td className="mono">{fmtAED(b.max)}</td>
                    <td className="mono">{b.incumbents}</td>
                    <td className="mono" style={{ color: b.avgVsLine > 1.08 ? 'var(--bad)' : b.avgVsLine < 0.92 ? 'var(--warn)' : 'var(--ok)' }}>{b.avgVsLine.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="card">
            <div className="chead"><h3>Pay-Equity Heat Map — Avg Compa-Ratio</h3><span className="mini">division × grade band</span></div>
            <div className="cbody">
              <div className="heat" style={{ gridTemplateColumns: `110px repeat(3, 1fr)` }}>
                <div />
                {['C', 'P', 'M/E'].map((b) => <div className="hlbl" key={b} style={{ justifyContent: 'center' }}>{b}</div>)}
                {model.divisions.map((div) => (
                  <div key={div.name} style={{ display: 'contents' }}>
                    <div className="hlbl" title={div.name}>{div.name.split(' ')[0]}</div>
                    {(['C', 'P', 'M/E'] as const).map((bucket) => {
                      const cell = cells.find((c) => c.divisionName === div.name && c.bucket === bucket);
                      if (!cell || cell.avgCompaRatio === null) {
                        return <div className="hcell" style={{ background: '#edf0f5', color: '#98a2b3' }} key={bucket}>—</div>;
                      }
                      return (
                        <div className="hcell" style={{ background: readyClass(cell.avgCompaRatio) }} key={bucket} title={`${div.name} · ${bucket}: avg CR ${cell.avgCompaRatio.toFixed(2)} (${cell.count} ppl)`}>
                          {cell.avgCompaRatio.toFixed(2)}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 9.5, marginTop: 6, color: 'var(--mut)' }}>red &lt;0.92 underpaid · green 0.97–1.05 healthy · navy &gt;1.12 overpaid</div>
            </div>
          </div>

          <div className="card">
            <div className="chead"><h3>Outliers &amp; Equity Flags</h3><span className="mini">{outliers.length} outliers</span></div>
            <div className="cbody" style={{ maxHeight: 180, overflow: 'auto' }}>
              {outliers.length === 0 && <p className="empty">No pay outliers beyond ±20% of the line.</p>}
              {outliers.length > 0 && (
                <table className="gap">
                  <tbody>
                    <tr><th>Employee</th><th>Grade</th><th>Salary</th><th>vs line</th></tr>
                    {outliers.map((o) => (
                      <tr key={o.person.id}>
                        <td>{o.person.name}</td>
                        <td className="mono">{o.person.grade}</td>
                        <td className="mono">{fmtAED(o.person.sal)}</td>
                        <td className="mono" style={{ color: o.deviation > 0 ? 'var(--navy)' : 'var(--bad)' }}>{o.deviation > 0 ? '+' : ''}{(o.deviation * 100).toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="twocol" style={{ marginTop: 10 }}>
        <div className="card">
          <div className="chead"><h3>Increment &amp; Bonus Simulator — Merit Matrix</h3><span className="mini">performance × compa-ratio tertile</span></div>
          <div className="cbody">
            <table className="gap">
              <tbody>
                <tr><th>Perf ↓ / CR →</th><th>Low CR &lt;0.95</th><th>Mid 0.95–1.05</th><th>High &gt;1.05</th></tr>
                {[5, 4, 3, 2, 1].map((perf) => (
                  <tr className="mrow" key={perf}>
                    <td><b>{perf} — {PERF_LABEL[perf]}</b></td>
                    {[0, 1, 2].map((tertile) => (
                      <td key={tertile}>
                        <input
                          type="number" step={0.5} min={0} max={15}
                          value={merit[perf - 1][tertile]}
                          onChange={(e) => setCell(perf, tertile, Number(e.target.value) || 0)}
                        />%
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 10 }}>
              <div className="kpi">
                <div className="k">Sampled payroll + allowances</div>
                <div className="v">{fmtAED(projection.currentPayroll)}</div>
                <div className="d flat">{people.length} employees on spine</div>
              </div>
              <div className="kpi hero">
                <div className="k">Cost of increments (next yr)</div>
                <div className="v">{fmtAED(projection.incrementCost)}</div>
                <div className="d up">▲ {((100 * projection.incrementCost) / projection.currentPayroll).toFixed(1)}% of payroll</div>
              </div>
              <div className="kpi">
                <div className="k">Projected CTC (sampled)</div>
                <div className="v">{fmtAED(projection.projectedCtc)}</div>
                <div className="d flat">for HR committee sign-off</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="chead"><h3>Job Architecture Governance — Re-banding Cases</h3><span className="mini">{rebandCases.length} case(s) · grade-drift audit trail</span></div>
          <div className="cbody" style={{ maxHeight: 280, overflow: 'auto' }}>
            {rebandCases.length === 0 && <p className="empty">No grade drift detected yet. When a structural move pushes a Head role&apos;s Hay score across a grade boundary, a re-banding case is opened here automatically.</p>}
            {rebandCases.length > 0 && (
              <table className="gap">
                <tbody>
                  <tr><th>Case</th><th>Role</th><th>Move</th><th>Hay</th><th>Grade</th></tr>
                  {rebandCases.map((c) => (
                    <tr key={c.id}>
                      <td className="mono">{c.id}</td>
                      <td>{c.role}</td>
                      <td style={{ fontSize: 10 }}>{c.path}</td>
                      <td className="mono">{c.before}→{c.after}</td>
                      <td className="mono" style={{ color: 'var(--red)' }}><b>{c.gBefore}→{c.gAfter}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function bandMidpointOf(grade: string, bands: { grade: string; hayMid: number }[]): number {
  return bands.find((b) => b.grade === grade)?.hayMid ?? 0;
}

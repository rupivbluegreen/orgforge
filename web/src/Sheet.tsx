import { Fragment } from 'react';
import { sheetRows } from './model';
import type { UiOrgModel, SheetRow } from './model';
import type { DepartmentBaseline } from '../../src/engines/workforce';
import { CostEngine } from '../../src/engines/cost';
import { fmtAED, fmtN } from '../../src/engines/format';

interface SheetPaneProps {
  model: UiOrgModel;
  baseline: Record<string, DepartmentBaseline>;
  recalcSeq: number;
}

function readyClass(v: number): 'G' | 'A' | 'R' {
  return v >= 85 ? 'G' : v >= 70 ? 'A' : 'R';
}

function deltaClass(v: number): string {
  return v > 0 ? 'up' : v < 0 ? 'down' : '';
}

function fmtDelta(v: number): string {
  return v ? `${v > 0 ? '+' : ''}${fmtAED(v)}` : '—';
}

interface GroupTotals { hc: number; ctc: number; dCtc: number; short: number; req: number; }

function sumRows(rows: SheetRow[]): GroupTotals {
  return rows.reduce(
    (a, r) => ({ hc: a.hc + r.hc, ctc: a.ctc + r.ctc, dCtc: a.dCtc + r.dCtc, short: a.short + r.short, req: a.req + r.reqCnt }),
    { hc: 0, ctc: 0, dCtc: 0, short: 0, req: 0 }
  );
}

export default function SheetPane({ model, baseline, recalcSeq }: SheetPaneProps) {
  const rows = sheetRows(model, baseline);
  const totals = sumRows(rows);
  const totalGapPts = rows.reduce((a, r) => a + r.gapPts, 0);
  const orgReady = totals.req ? Math.round(100 * (1 - totals.short / totals.req)) : 100;

  return (
    <section className="tabpane active">
      <div className="card">
        <div className="cardHead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
          <h3 style={{ margin: 0 }}>Composite Sheet — live org × Hay × cost × competency</h3>
          <span className="mono" style={{ fontSize: 10, color: 'var(--faint)' }}>recalc #{recalcSeq}</span>
        </div>
        <p style={{ margin: '0 12px 10px', fontSize: 11.5, color: 'var(--mut)' }}>
          One line per department: manpower, live Hay evaluation of the unit head, annual
          manpower cost, and competency readiness — grouped by division with subtotals.
          Every move on tabs 01 and 02 recalculates this sheet; Δ compares to the session&apos;s
          opening baseline, and units moved out of their baseline division are marked.
        </p>
        <div className="sheetWrap">
          <table className="sheet">
            <thead>
              <tr>
                <th>Department</th><th>Stream / family</th><th className="num">Manpower</th>
                <th className="num">Hay pts (Head)</th><th>Grade</th><th className="num">Head pay p.a.</th>
                <th className="num">Unit CTC p.a.</th><th className="num">Δ CTC vs baseline</th>
                <th className="num">Skills ready</th><th className="num">Skills short</th><th className="num">Gap pts</th>
              </tr>
            </thead>
            <tbody>
              {model.divisions.map((div) => {
                const dr = rows.filter((r) => r.div === div.name);
                if (!dr.length) return null;
                const g = sumRows(dr);
                const gReady = g.req ? Math.round(100 * (1 - g.short / g.req)) : 100;
                return (
                  <Fragment key={div.name}>
                    <tr className="grp">
                      <td colSpan={11}>
                        {div.name} — ×{CostEngine.premium(div.name).toFixed(2)} market premium
                        <span className="gsub">
                          {fmtN(g.hc)} HC · CTC {fmtAED(g.ctc)}
                          {g.dCtc ? ` (${g.dCtc > 0 ? '+' : ''}${fmtAED(g.dCtc)})` : ''} · skills ready {gReady}%
                        </span>
                      </td>
                    </tr>
                    {dr.map((r) => (
                      <tr className={r.moved ? 'moved' : ''} key={r.dept}>
                        <td>
                          <b>{r.dept}</b>
                          {r.moved && <span className="mono" style={{ color: 'var(--red)', fontSize: 9 }}> MOVED</span>}
                        </td>
                        <td>{r.sub}</td>
                        <td className="num">{fmtN(r.hc)}</td>
                        <td className="num">{r.hay}</td>
                        <td>{r.grade}</td>
                        <td className="num">{fmtAED(r.headPay)}</td>
                        <td className="num">{fmtAED(r.ctc)}</td>
                        <td className={`num ${deltaClass(r.dCtc)}`}>{fmtDelta(r.dCtc)}</td>
                        <td className={`num ready ${readyClass(r.ready)}`}>{r.ready}%</td>
                        <td className="num">{r.short}</td>
                        <td className="num">{r.gapPts}</td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="totals">
                <td>BANK TOTAL — {rows.length} departments</td><td></td>
                <td className="num">{fmtN(totals.hc)}</td><td colSpan={3}></td>
                <td className="num">{fmtAED(totals.ctc)}</td>
                <td className={`num ${deltaClass(totals.dCtc)}`}>{totals.dCtc ? fmtDelta(totals.dCtc) : 'at baseline'}</td>
                <td className={`num ready ${readyClass(orgReady)}`}>{orgReady}%</td>
                <td className="num">{totals.short}</td>
                <td className="num">{totalGapPts}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  );
}

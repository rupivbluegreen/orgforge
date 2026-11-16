import { useState } from 'react';
import type { UiOrgModel } from './model';
import { orgTotals } from './model';
import { flightRisk } from '../../src/engines/eosb';
import { divHeadcount } from '../../src/engines/hay-constants';
import { CostEngine } from '../../src/engines/cost';
import { fmtAED, fmtN } from '../../src/engines/format';
import type { DivisionModel } from '../../src/engines/types';

const STREAM_DOT: Record<string, string> = {
  'Front Office & Distribution': '#C74634',
  'Risk & Control Functions': '#8A6D1D',
  'Technology & Digital': '#4A6FA5',
  Operations: '#0E7C66',
  'Business Support': '#7A8497',
};
const dotFor = (name: string): string => STREAM_DOT[name] ?? '#98A2B3';

type DragState =
  | { type: 'dept'; department: string; fromSubdivision: string }
  | { type: 'person'; personId: string; fromDept: string };

interface OrgChartPaneProps {
  model: UiOrgModel;
  onMoveDepartment: (dept: string, toDivision: string, toSubdivision: string) => void;
  onMovePerson: (personId: string, toDept: string) => void;
}

export default function OrgChartPane({ model, onMoveDepartment, onMovePerson }: OrgChartPaneProps) {
  const [showPeople, setShowPeople] = useState(true);
  const [zoom, setZoom] = useState(80);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [subDropKey, setSubDropKey] = useState<string | null>(null);
  const [deptDropTarget, setDeptDropTarget] = useState<string | null>(null);

  const totals = orgTotals(model);

  function handleSubDrop(toDivision: string, toSubdivision: string) {
    setSubDropKey(null);
    if (drag?.type === 'dept') onMoveDepartment(drag.department, toDivision, toSubdivision);
    setDrag(null);
  }

  function handleDeptDrop(department: string) {
    setDeptDropTarget(null);
    if (drag?.type === 'person' && drag.fromDept !== department) onMovePerson(drag.personId, department);
    setDrag(null);
  }

  return (
    <section className="tabpane active">
      <div className="card" style={{ marginBottom: 10 }}>
        <div className="cbody" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', padding: '8px 12px' }}>
          <b style={{ fontSize: 12, color: 'var(--navy)' }}>Organization Chart</b>
          <span style={{ fontSize: 11, color: 'var(--mut)' }}>
            Drag-enabled: drag a department onto another stream, or a person onto another department.
          </span>
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, fontSize: 11 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <input type="checkbox" checked={showPeople} onChange={(e) => setShowPeople(e.target.checked)} /> Show people
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              Zoom
              <input type="range" min={45} max={120} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} style={{ width: 110 }} />
            </label>
          </span>
        </div>
      </div>

      <div id="chartWrap">
        <div id="chart" style={{ transform: `scale(${zoom / 100})` }}>
          <div className="oc-root">
            <h2>Northwind Group UAE — Group CEO</h2>
            <div className="m">{fmtN(totals.hc)} HC · {totals.divisions} divisions · {totals.departments} departments · {fmtAED(totals.ctc)} annual CTC</div>
          </div>
          <div className="oc-trunk" />
          <div className="oc-branchbar" />
          <div className="oc-cols">
            {model.divisions.map((div) => (
              <div className="oc-div" key={div.name}>
                <div className="oc-divcard">
                  <h3>{div.name}</h3>
                  <div className="m">
                    {fmtN(divHeadcount(div as unknown as DivisionModel))} HC ·{' '}
                    {fmtAED(div.subdivisions.reduce((a, s) => a + s.departments.reduce((b, d) => b + CostEngine.deptCTC(d, d.hay.total), 0), 0))} CTC
                  </div>
                </div>
                {div.subdivisions.map((sub) => {
                  const subKey = `${div.name}::${sub.name}`;
                  return (
                    <div
                      className={`oc-sub${subDropKey === subKey ? ' dropTarget' : ''}`}
                      key={sub.name}
                      onDragOver={(e) => { if (drag?.type !== 'dept') return; e.preventDefault(); setSubDropKey(subKey); }}
                      onDragLeave={() => setSubDropKey((k) => (k === subKey ? null : k))}
                      onDrop={(e) => { e.preventDefault(); handleSubDrop(div.name, sub.name); }}
                    >
                      <div className="oc-subhead">
                        <span className="stream-dot" style={{ background: dotFor(sub.name) }} />
                        {sub.name}
                        <span className="hc">{sub.departments.reduce((a, d) => a + d.hc, 0)} HC</span>
                      </div>
                      {sub.departments.map((dept) => (
                        <div
                          className={`oc-dept${drag?.type === 'dept' && drag.department === dept.department ? ' dragging' : ''}${deptDropTarget === dept.department ? ' personTarget' : ''}`}
                          key={dept.department}
                          draggable
                          onDragStart={(e) => { if ((e.target as HTMLElement).closest('.oc-p')) return; setDrag({ type: 'dept', department: dept.department, fromSubdivision: sub.name }); }}
                          onDragEnd={() => setDrag(null)}
                          onDragOver={(e) => { if (drag?.type !== 'person' || drag.fromDept === dept.department) return; e.preventDefault(); setDeptDropTarget(dept.department); }}
                          onDragLeave={() => setDeptDropTarget((k) => (k === dept.department ? null : k))}
                          onDrop={(e) => { e.preventDefault(); handleDeptDrop(dept.department); }}
                        >
                          <div className="oc-head">
                            Head of {dept.department}<span className="g">{dept.hay.grade}</span>
                          </div>
                          <div className="dm">{dept.hc} HC · {fmtAED(dept.base)} · HAY {dept.hay.total} · ready {dept.readiness}%</div>
                          {showPeople && dept.people.map((p) => (
                            <div
                              className={`oc-p${drag?.type === 'person' && drag.personId === p.id ? ' dragging' : ''}`}
                              key={p.id}
                              draggable
                              onDragStart={(e) => { e.stopPropagation(); setDrag({ type: 'person', personId: p.id, fromDept: dept.department }); }}
                              onDragEnd={() => setDrag(null)}
                              title={flightRisk(p, div.name, sub.name, dept.department) ? `${p.name} — FLIGHT RISK` : p.name}
                            >
                              <span>{p.name}</span>
                              {flightRisk(p, div.name, sub.name, dept.department) && <span className="frflag">⚑</span>}
                              <span style={{ color: 'var(--mut)' }}>{p.job}</span>
                              <span className="g">{p.grade}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

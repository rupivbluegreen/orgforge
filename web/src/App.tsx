import { useMemo, useRef, useState } from 'react';
import {
  buildInitialModel, moveDepartment, movePerson, cloneModel, orgTotals, orgStats, captureDeptBaseline, applyRestructure, findPerson,
} from './model';
import type { UiOrgModel, MoveResult } from './model';
import type { RestructuringAction } from '../../src/engines/restructuring';
import { applyRatingChange } from '../../src/engines/perf';
import type { PerfRating } from '../../src/engines/perf';
import CompetencyPane from './Competency';
import SheetPane from './Sheet';
import JdStudioPane from './JdStudio';
import OrgChartPane from './OrgChart';
import RewardsPane from './Rewards';
import UaeCompliancePane from './UaeCompliance';
import TalentPane from './Talent';
import WorkforcePane from './Workforce';
import PerformancePane from './Performance';
import AiCopilotPane from './AiCopilot';
import { Ledger } from '../../src/engines/ledger';
import { MockHrisSpine } from '../../src/engines/spine';
import { fmtAED, fmtN } from '../../src/engines/format';
import { captureScenario } from '../../src/engines/workforce';
import type { ScenarioSnapshot } from '../../src/engines/workforce';

const NOW = new Date();

const TABS = [
  { key: '01', label: 'Org Design Studio · Hay & Cost', enabled: true },
  { key: '02', label: 'Competency & Learning · SFIA 10', enabled: true },
  { key: '03', label: 'Composite Sheet · Live Calc', enabled: true },
  { key: '04', label: 'JD Studio · AI Generator', enabled: true },
  { key: '05', label: 'Organization Chart', enabled: true },
  { key: '06', label: 'Rewards', enabled: true },
  { key: '07', label: 'UAE Compliance', enabled: true },
  { key: '08', label: 'Talent', enabled: true },
  { key: '09', label: 'Workforce & Scenarios', enabled: true },
  { key: '10', label: 'Performance & Development', enabled: true },
  { key: '11', label: 'AI Copilot Studio', enabled: true },
];

function verdictClass(v: string) {
  return v === 'VALID' ? 'ob-v-valid' : v === 'INVALID' ? 'ob-v-invalid' : 'ob-v-human';
}

export interface ScenarioSlot extends ScenarioSnapshot {
  model: UiOrgModel;
}

export interface RebandCase {
  id: string;
  role: string;
  path: string;
  before: number;
  after: number;
  gBefore: string;
  gAfter: string;
}

export default function App() {
  const [model, setModel] = useState<UiOrgModel>(() => buildInitialModel(NOW));
  const [activeTab, setActiveTab] = useState('01');
  const [history, setHistory] = useState<UiOrgModel[]>([]);
  const [lastMove, setLastMove] = useState<MoveResult | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [draggedDept, setDraggedDept] = useState<string | null>(null);
  const [dropKey, setDropKey] = useState<string | null>(null);
  const [ledgerVersion, setLedgerVersion] = useState(0);
  const [rebandCases, setRebandCases] = useState<RebandCase[]>([]);
  const [scenarios, setScenarios] = useState<{ A: ScenarioSlot | null; B: ScenarioSlot | null }>({ A: null, B: null });

  const ledgerRef = useRef(new Ledger());
  const spineRef = useRef(new MockHrisSpine(ledgerRef.current));
  const baselineRef = useRef(orgTotals(model));
  const deptBaselineRef = useRef(captureDeptBaseline(model));

  const totals = useMemo(() => orgTotals(model), [model]);
  const stats = useMemo(() => orgStats(model), [model]);
  const baseline = baselineRef.current;
  const deltaCtc = totals.ctc - baseline.ctc;

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }

  async function commitDeptMove(deptName: string, toDivision: string, toSubdivision: string) {
    const before = model;
    const working = cloneModel(model);
    const result = moveDepartment(working, deptName, toDivision, toSubdivision);
    if (!result) return;

    setHistory((h) => [...h, before]);
    setModel(working);
    setLastMove(result);

    const moveId = `MV-${Date.now()}`;
    await spineRef.current.writeOrgChange({ entityType: 'department', entity: result.entity, to: { division: toDivision }, moveId });
    await spineRef.current.writeHayScore({ job: `Head of ${result.entity}`, totalPoints: result.hayAfter.total, grade: result.hayAfter.grade });
    await spineRef.current.writeCostRollup({ deltaCTC: result.ctcAfter - result.ctcBefore });
    await spineRef.current.writeRationale({ moveId });
    setLedgerVersion((v) => v + 1);
    if (result.hayBefore.grade !== result.hayAfter.grade) {
      setRebandCases((cs) => [...cs, {
        id: `RB-${1000 + cs.length}`, role: `Head of ${result.entity}`,
        path: `${result.from.subdivision} → ${result.to.subdivision}`,
        before: result.hayBefore.total, after: result.hayAfter.total,
        gBefore: result.hayBefore.grade, gAfter: result.hayAfter.grade,
      }]);
    }
    showToast(`${result.entity} moved — verdict ${result.verdict.verdict}`);
  }

  async function handleDrop(toDivision: string, toSubdivision: string) {
    setDropKey(null);
    if (!draggedDept) return;
    await commitDeptMove(draggedDept, toDivision, toSubdivision);
    setDraggedDept(null);
  }

  async function handleTransferPerson(personId: string, toDept: string) {
    const working = cloneModel(model);
    const result = movePerson(working, personId, toDept);
    if (!result) return;

    setHistory((h) => [...h, model]);
    setModel(working);
    setLastMove(null);

    const moveId = `MV-${Date.now()}`;
    await spineRef.current.writeOrgChange({ entityType: 'person', entity: result.person.name, to: { division: result.toDivision }, moveId });
    await spineRef.current.writeHayScore({ job: `Head of ${result.toDepartment}`, totalPoints: result.hayAfter.total, grade: result.hayAfter.grade });
    await spineRef.current.writeCostRollup({ deltaCTC: result.ctcDelta });
    setLedgerVersion((v) => v + 1);
    const verdictLabel = result.verdict.verdict === 'HUMAN' ? 'REQUIRES HUMAN INSIGHT' : result.verdict.verdict;
    showToast(`${result.person.name} moved to ${result.toDepartment} — verdict ${verdictLabel}`);
  }

  async function commitRestructure(deptName: string, action: RestructuringAction) {
    const working = cloneModel(model);
    const result = applyRestructure(working, deptName, action);
    if (!result) return false;

    setHistory((h) => [...h, model]);
    setModel(working);
    setLastMove(null);

    const moveId = `MV-${Date.now()}`;
    await spineRef.current.writeOrgChange({ entityType: 'restructure', entity: deptName, to: { division: '—' }, moveId });
    await spineRef.current.writeCostRollup({ deltaCTC: 0 });
    setLedgerVersion((v) => v + 1);
    showToast(`${deptName} ${result.deleted ? 'deleted' : 'downsized'} — spine updated`);
    return true;
  }

  function saveScenario(key: 'A' | 'B') {
    const snap = captureScenario(orgTotals(model), orgStats(model).ready, history.length);
    setScenarios((s) => ({ ...s, [key]: { ...snap, model: cloneModel(model) } }));
    ledgerRef.current.log('write', 'SCENARIO', `design branch saved as Scenario ${key} (${history.length} moves)`);
    setLedgerVersion((v) => v + 1);
    showToast(`Scenario ${key} saved`);
  }

  function loadScenario(key: 'A' | 'B') {
    const slot = scenarios[key];
    if (!slot) return;
    setHistory((h) => [...h, model]);
    setModel(cloneModel(slot.model));
    setLastMove(null);
    showToast(`Scenario ${key} loaded onto the canvas`);
  }

  function commitScenarioBaseline() {
    baselineRef.current = orgTotals(model);
    deptBaselineRef.current = captureDeptBaseline(model);
    setHistory([]);
    ledgerRef.current.log('write', 'ORA-WRITE', 'scenario committed — spine baseline re-approved at current design');
    setLedgerVersion((v) => v + 1);
    showToast('Current design committed to HRIS spine — new approved baseline');
  }

  function handleRatingChange(personId: string, newRating: PerfRating) {
    const working = cloneModel(model);
    const found = findPerson(working, personId);
    if (!found) return;
    const oldRating = found.person.perf as PerfRating;
    found.person.perf = newRating;
    setModel(working);
    const change = applyRatingChange(oldRating, newRating, found.person.grade);
    ledgerRef.current.log('calc', 'PERF', `${found.person.name} re-rated ${oldRating} → ${newRating} — plan ${change.planId} assigned`);
    setLedgerVersion((v) => v + 1);
  }

  function logAi(op: string, message: string) {
    ledgerRef.current.log('ai', op, message);
    setLedgerVersion((v) => v + 1);
  }

  function handleUndo() {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setModel(prev);
    setLastMove(null);
    ledgerRef.current.log('write', 'UNDO', 'Move undone — structure reverted to prior state');
    setLedgerVersion((v) => v + 1);
  }

  const ledgerEntries = ledgerVersion >= 0 ? ledgerRef.current.recent : [];

  return (
    <>
      <header>
        <div className="brand">
          <h1>Orgforge</h1>
          <div className="sub">Org Design · Hay Evaluation · SFIA 10 · AI Job Descriptions</div>
        </div>
        <div className="spinechip"><span id="spinePip" /> HRIS SPINE · HCM CORE (mocked)</div>
        <div className="spacer" />
        <button className="hbtn" onClick={handleUndo} disabled={!history.length}>
          ↶ Undo move
        </button>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={t.key === activeTab ? 'active' : ''}
            disabled={!t.enabled}
            title={t.enabled ? '' : 'Not built yet'}
            onClick={() => setActiveTab(t.key)}
          >
            <span className="num">{t.key}</span> {t.label}
          </button>
        ))}
      </nav>

      <div id="kpiRow">
        <div className="kpi">
          <div className="k">Manpower</div>
          <div className="v">{fmtN(totals.hc)}</div>
          <div className="d flat">{totals.divisions} divisions · {totals.departments} departments</div>
        </div>
        <div className="kpi">
          <div className="k">Annual base payroll</div>
          <div className="v">{fmtAED(totals.base)}</div>
          <div className="d flat">sampled 3 incumbents/dept</div>
        </div>
        <div className="kpi hero">
          <div className="k">Annual CTC</div>
          <div className="v">{fmtAED(totals.ctc)}</div>
          <div className={`d ${deltaCtc > 0 ? 'up' : deltaCtc < 0 ? 'down' : 'flat'}`}>
            {deltaCtc === 0 ? 'at approved baseline' : `${deltaCtc > 0 ? '▲ +' : '▼ '}${fmtAED(deltaCtc)} vs baseline`}
          </div>
        </div>
        <div className="kpi">
          <div className="k">Avg Hay points</div>
          <div className="v">{stats.avgHay}</div>
          <div className="d flat">across {totals.departments} head roles</div>
        </div>
        <div className="kpi">
          <div className="k">Skills readiness</div>
          <div className="v">{stats.ready}%</div>
          <div className="d flat">SFIA required vs held</div>
        </div>
        <div className="kpi">
          <div className="k">Moves this session</div>
          <div className="v">{history.length}</div>
          <div className="d flat">undo-armed</div>
        </div>
        <div className="kpi">
          <div className="k">Ledger transactions</div>
          <div className="v">{fmtN(ledgerRef.current.transactionCount)}</div>
          <div className="d flat">spine audit trail</div>
        </div>
      </div>

      <main>
        {activeTab === '01' && (
        <section className="tabpane active">
          <div className="tipbar">
            💡 <b>Drag a department</b> card into another sub-division block. Hay scoring, cost and governance
            re-run instantly, and the AI Change Rationale card on the right updates.
          </div>

          <div id="orgGrid">
            {model.divisions.map((div) => {
              const divHc = div.subdivisions.reduce((a, s) => a + s.departments.reduce((b, d) => b + d.hc, 0), 0);
              const divBase = div.subdivisions.reduce((a, s) => a + s.departments.reduce((b, d) => b + d.base, 0), 0);
              return (
                <div className="division" key={div.name}>
                  <div className="div-head">
                    <h2>{div.name}</h2>
                    <div className="div-meta">
                      <span>{fmtN(divHc)} HC</span>
                      <span>{fmtAED(divBase)}</span>
                    </div>
                  </div>
                  <div className="div-body">
                    {div.subdivisions.map((sub) => {
                      const key = `${div.name}::${sub.name}`;
                      return (
                        <div
                          className={`subdiv${dropKey === key ? ' dropTarget' : ''}`}
                          key={sub.name}
                          onDragOver={(e) => { e.preventDefault(); setDropKey(key); }}
                          onDragLeave={() => setDropKey((k) => (k === key ? null : k))}
                          onDrop={(e) => { e.preventDefault(); handleDrop(div.name, sub.name); }}
                        >
                          <div className="subdiv-head">
                            <h3>{sub.name}</h3>
                            <span className="mono" style={{ fontSize: 9.5, color: 'var(--faint)' }}>{sub.departments.length} depts</span>
                          </div>
                          <div className="subdiv-body">
                            {sub.departments.length === 0 && <p className="empty">No departments</p>}
                            {sub.departments.map((dept) => (
                              <div
                                className={`dept${draggedDept === dept.department ? ' dragging' : ''}`}
                                key={dept.department}
                                draggable
                                onDragStart={() => setDraggedDept(dept.department)}
                                onDragEnd={() => setDraggedDept(null)}
                              >
                                <span className="hay-tag">{dept.hay.grade} · {dept.hay.total}</span>
                                <div className="d-name">{dept.department}</div>
                                <div className="d-meta">
                                  <span>{fmtN(dept.hc)} HC</span>
                                  <span>{fmtAED(dept.base)}</span>
                                  <span>ready {dept.readiness}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card" id="rationaleCard">
            <div className="chead">
              <h3>AI Change Rationale — Last Structural Move</h3>
              <span className="mini">{lastMove ? lastMove.entity : 'no moves yet'}</span>
            </div>
            <div className="cbody" id="rationaleBody">
              {!lastMove && <p className="empty">Drag a department to another sub-division. Hay factors re-derive, costs re-roll, and the business &amp; fitment rationale is drafted here.</p>}
              {lastMove && (
                <>
                  <p>
                    <span className={`ob-verdict ${verdictClass(lastMove.verdict.verdict)}`}>
                      {lastMove.verdict.verdict === 'HUMAN' ? 'REQUIRES HUMAN INSIGHT' : lastMove.verdict.verdict}
                    </span>
                    {lastMove.entity}: {lastMove.from.subdivision} → {lastMove.to.subdivision}
                  </p>
                  {lastMove.verdict.reasons.map((r, i) => <p key={i} style={{ fontSize: 11 }}>• {r}</p>)}
                  <h4>Business Rationale</h4>
                  <p>{lastMove.rationale.business_rationale}</p>
                  <h4>Fitment Rationale</h4>
                  <p>{lastMove.rationale.fitment_rationale}</p>
                  <p className="src">source: Rules engine (deterministic)</p>
                </>
              )}
            </div>
          </div>
        </section>
        )}

        {activeTab === '02' && <CompetencyPane model={model} onTransfer={handleTransferPerson} />}

        {activeTab === '03' && (
          <SheetPane model={model} baseline={deptBaselineRef.current} recalcSeq={ledgerVersion} />
        )}

        {activeTab === '04' && <JdStudioPane model={model} />}

        {activeTab === '05' && (
          <OrgChartPane model={model} onMoveDepartment={commitDeptMove} onMovePerson={handleTransferPerson} />
        )}

        {activeTab === '06' && <RewardsPane model={model} rebandCases={rebandCases} />}

        {activeTab === '07' && <UaeCompliancePane model={model} onExecute={commitRestructure} />}

        {activeTab === '08' && <TalentPane model={model} />}

        {activeTab === '09' && (
          <WorkforcePane
            model={model} history={history} scenarios={scenarios}
            onSave={saveScenario} onLoad={loadScenario} onCommit={commitScenarioBaseline}
          />
        )}

        {activeTab === '10' && <PerformancePane model={model} onRate={handleRatingChange} />}

        {activeTab === '11' && <AiCopilotPane model={model} lastMove={lastMove} onAsk={logAi} />}

        <aside className="rail">
          <div className="card" id="ledgerWrap" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="chead"><h3>HRIS Spine Ledger</h3><span className="mini">{ledgerRef.current.transactionCount} tx</span></div>
            <div id="ledger">
              {ledgerEntries.length === 0 && <p className="empty">No spine activity yet.</p>}
              {ledgerEntries.map((e, i) => (
                <div className={`ledger-item ${e.kind}`} key={i}>
                  <div className="lg-t">{new Date(e.timestamp).toLocaleTimeString('en-GB', { hour12: false })} · <span className="lg-op">{e.op}</span></div>
                  <div>{e.message}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>

      <div id="toast" className={toast ? 'show' : ''}>{toast}</div>
    </>
  );
}

import { useState } from 'react';
import type { UiOrgModel } from './model';
import { findDept } from './model';
import { HayEngine } from '../../src/engines/hay';
import { GRADE_LEVEL } from '../../src/engines/hay-constants';
import { requiredTechProfile, requiredBehProfile, SFIA } from '../../src/engines/sfia-catalogue';
import { buildJobDescription, jdKey } from '../../src/engines/jd-document';
import type { JdRoleRef, JobDescription } from '../../src/engines/jd-document';
import { downloadFallbackDocx } from './jd-download';

function buildRoleList(model: UiOrgModel): JdRoleRef[] {
  const out: JdRoleRef[] = [];
  model.divisions.forEach((div) => {
    div.subdivisions.forEach((sub) => {
      sub.departments.forEach((dept) => {
        out.push({ type: 'head', label: `Head of ${dept.department}`, dept: dept.department, div: div.name, sub: sub.name });
        dept.people.forEach((p) => {
          out.push({ type: 'person', label: p.job, dept: dept.department, div: div.name, sub: sub.name, personId: p.id });
        });
      });
    });
  });
  return out;
}

function roleGrade(model: UiOrgModel, role: JdRoleRef): string | null {
  const loc = findDept(model, role.dept);
  if (!loc) return null;
  if (role.type === 'head') return loc.dept.hay.grade;
  return loc.dept.people.find((p) => p.id === role.personId)?.grade ?? null;
}

function generateJd(model: UiOrgModel, role: JdRoleRef, revision: number): JobDescription | null {
  const loc = findDept(model, role.dept);
  const grade = roleGrade(model, role);
  if (!loc || !grade) return null;
  const isHead = role.type === 'head';
  const hay = isHead ? loc.dept.hay : HayEngine.indicative(grade, role.sub);
  const level = GRADE_LEVEL[grade] || 4;
  const tech = requiredTechProfile(role.div, role.sub, role.dept, grade);
  const beh = requiredBehProfile(role.sub, grade);
  const techList = Object.entries(tech).sort((a, b) => b[1] - a[1])
    .map(([c, l]) => ({ code: c, name: SFIA.skills[c]?.name || c, cat: SFIA.skills[c]?.cat || '', lvl: l }));
  const behList = Object.entries(beh).sort((a, b) => b[1] - a[1])
    .map(([c, l]) => ({ code: c, name: SFIA.behaviours[c]?.name || c, lvl: l }));

  return buildJobDescription({
    role, isHead, deptHc: loc.dept.hc, deptBase: loc.dept.base,
    hay, grade, level, techList, behList,
    revision, generatedBy: 'Mock AI (rules engine)', now: new Date(),
  });
}

interface JdStudioPaneProps {
  model: UiOrgModel;
}

export default function JdStudioPane({ model }: JdStudioPaneProps) {
  const [cache, setCache] = useState<Record<string, { jd: JobDescription; rev: number }>>({});
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const roles = buildRoleList(model);

  function select(role: JdRoleRef) {
    const key = jdKey(role);
    setSelectedKey(key);
    setCache((prev) => {
      if (prev[key]) return prev;
      const jd = generateJd(model, role, 1);
      return jd ? { ...prev, [key]: { jd, rev: 1 } } : prev;
    });
  }

  function regenerate() {
    if (!selectedKey) return;
    const role = roles.find((r) => jdKey(r) === selectedKey);
    if (!role) return;
    setCache((prev) => {
      const prevRev = prev[selectedKey]?.rev ?? 0;
      const jd = generateJd(model, role, prevRev + 1);
      return jd ? { ...prev, [selectedKey]: { jd, rev: prevRev + 1 } } : prev;
    });
  }

  const jd = selectedKey ? cache[selectedKey]?.jd ?? null : null;

  async function handleExport() {
    if (!jd) return;
    setExporting(true);
    try {
      await downloadFallbackDocx(jd);
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="tabpane active">
      <div id="jdLayout">
        <div className="card">
          <div className="chead"><h3>Positions (Oracle Hierarchy)</h3><span className="mini">{roles.length} JDs</span></div>
          <div id="roleTree">
            {model.divisions.map((div) => (
              <div key={div.name}>
                <div className="rt-div">{div.name}</div>
                {div.subdivisions.flatMap((sub) => sub.departments).map((dept) => {
                  const deptRoles = roles.filter((r) => r.dept === dept.department);
                  return (
                    <div className="rt-dept" key={dept.department}>
                      <div className="rt-dname">{dept.department}</div>
                      {deptRoles.map((r) => {
                        const key = jdKey(r);
                        const grade = roleGrade(model, r) ?? '';
                        return (
                          <button
                            key={key}
                            className={`rt-role${selectedKey === key ? ' sel' : ''}`}
                            onClick={() => select(r)}
                          >
                            <span className={`st${cache[key] ? ' fresh' : ''}`} />
                            {r.label}
                            <span className="g">{grade}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div id="jdMain">
          <div className="card">
            <div className="cbody" id="jdToolbar">
              <button className="hbtn" style={{ background: 'var(--red)' }} onClick={handleExport} disabled={!jd || exporting}>
                ⤓ {exporting ? 'Exporting…' : 'Export JD to Word (.docx)'}
              </button>
              <button className="hbtn" style={{ background: 'var(--navy)' }} onClick={regenerate} disabled={!jd}>
                ↻ Regenerate JD
              </button>
              <span className="tstate">
                <span className="none">No template uploaded — export uses built-in Hay layout.</span>
              </span>
            </div>
          </div>

          {!jd && <p className="empty">Select a position on the left. Pick &quot;Head of…&quot; for the unit-head role, or any sampled incumbent for their individual role.</p>}

          {jd && (
            <div id="jdDoc">
              <div className="jd-band">
                <div>
                  <h2>{jd.job_title}</h2>
                  <div className="jd-sub">{jd.division} · {jd.section} · {jd.department} — Doc {jd.doc_no} · {jd.revision_no} · {jd.date}</div>
                </div>
                <div className="jd-hay">
                  <div className="pts">{jd.hay.total}</div>
                  <div className="grd">HAY PTS · GRADE {jd.hay.grade}{jd.hay.indicative ? ' (indicative)' : ''}</div>
                </div>
              </div>

              <div className="jd-sec">
                <h3>1 · Job Details</h3>
                <div className="jd-kv">
                  <div><b>Reports to</b> {jd.reports_to}</div>
                  <div><b>Job grade</b> {jd.job_grade}</div>
                  <div><b>Division</b> {jd.division}</div>
                  <div><b>Section / stream</b> {jd.section}</div>
                  <div><b>Direct reports</b> {jd.direct_reports}</div>
                  <div><b>Total supervised</b> {jd.total_reports}</div>
                </div>
              </div>

              <div className="jd-sec"><h3>2 · Job Objective</h3><p>{jd.job_objective}</p></div>

              <div className="jd-sec">
                <h3>3 · Key Accountabilities</h3>
                <ol>{jd.accountabilities.map((a, i) => <li key={i}>{a}</li>)}</ol>
              </div>

              <div className="jd-sec">
                <h3>4 · Hay Evaluation Factors</h3>
                <div className="jd-fac">
                  <div className="f"><div className="fk">Know-How</div><div className="fv">{jd.hay.kh.pts}</div><div className="fn">{jd.hay.kh.note}</div></div>
                  <div className="f"><div className="fk">Problem Solving</div><div className="fv">{jd.hay.ps.pts}</div><div className="fn">{jd.hay.ps.note}</div></div>
                  <div className="f"><div className="fk">Accountability</div><div className="fv">{jd.hay.acc.pts}</div><div className="fn">{jd.hay.acc.note}</div></div>
                </div>
              </div>

              <div className="jd-sec">
                <h3>5 · SFIA 10 Technical Competencies</h3>
                <div className="skl">{jd.techList.map((t) => <span key={t.code}>{t.name} <b>L{t.lvl}</b></span>)}</div>
              </div>

              <div className="jd-sec">
                <h3>6 · Behavioural Competencies</h3>
                <div className="skl">{jd.behList.map((b) => <span key={b.code}>{b.name} <b>L{b.lvl}</b></span>)}</div>
              </div>

              <div className="jd-sec">
                <h3>7 · Communications &amp; Working Relationships</h3>
                <p><b>Internal:</b> {jd.internal_comms}</p>
                <p><b>External:</b> {jd.external_comms}</p>
              </div>

              <div className="jd-sec">
                <h3>8 · Qualifications &amp; Experience</h3>
                <p><b>Qualifications:</b> {jd.min_qualifications}</p>
                <p><b>Experience:</b> {jd.min_experience}</p>
                <p><b>Job-specific skills:</b> {jd.job_skills}</p>
              </div>

              <div className="jd-meta">
                <span>{jd.structural_context}</span>
                <span>generated {jd.generated_on}</span>
                <span>{jd.generated_by}</span>
              </div>
            </div>
          )}

          <details className="card">
            <summary className="chead" style={{ cursor: 'pointer', listStyle: 'none' }}>
              <h3 style={{ display: 'inline' }}>Template tag reference — for template administrators</h3>
            </summary>
            <div className="cbody taglist">
              Place these tags anywhere in your .docx: <code>{'{job_title}'}</code> <code>{'{job_grade}'}</code>{' '}
              <code>{'{reports_to}'}</code> <code>{'{division}'}</code> <code>{'{department}'}</code> <code>{'{section}'}</code>{' '}
              <code>{'{job_objective}'}</code> <code>{'{direct_reports}'}</code> <code>{'{total_reports}'}</code>{' '}
              <code>{'{key_accountabilities}'}</code> <code>{'{internal_comms}'}</code> <code>{'{external_comms}'}</code>{' '}
              <code>{'{min_qualifications}'}</code> <code>{'{min_experience}'}</code> <code>{'{job_skills}'}</code>{' '}
              <code>{'{behavioral_competencies}'}</code> <code>{'{technical_competencies}'}</code> <code>{'{sfia_skills}'}</code>{' '}
              <code>{'{hay_know_how}'}</code> <code>{'{hay_problem_solving}'}</code> <code>{'{hay_accountability}'}</code>{' '}
              <code>{'{hay_total}'}</code> <code>{'{hay_grade}'}</code> <code>{'{structural_context}'}</code>{' '}
              <code>{'{doc_no}'}</code> <code>{'{revision_no}'}</code> <code>{'{date}'}</code>{' '}
              <code>{'{generated_on}'}</code> <code>{'{generated_by}'}</code>
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}

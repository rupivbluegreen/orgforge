import { useState } from 'react';
import type { UiOrgModel, MoveResult } from './model';
import { allPeople, allDepartments, findDept } from './model';
import {
  classifyIntent, formatMoveNarrative, formatReportingLine, draftGapLearningPath, draftHayReevaluation,
  findUnits, draftScenario, draftOkrs, draftManagerCoachingScript, computeEquitySnapshot, formatEquitySnapshot,
  findPersonByName, formatFallbackHelp,
} from '../../src/engines/copilot';
import type { UnitRef } from '../../src/engines/copilot';
import { draftPerfNarrative, draftIdp, draftCareerAdvice, draftLetter, inferSkills, answerPolicyQuestion } from '../../src/engines/native-gen';
import type { LetterDocType } from '../../src/engines/native-gen';
import { buildPersonContext } from '../../src/engines/native-gen-context';
import { divHeadcount, divBase } from '../../src/engines/hay-constants';
import type { DivisionModel, OrgModel } from '../../src/engines/types';

interface AiCopilotPaneProps {
  model: UiOrgModel;
  lastMove: MoveResult | null;
  onAsk: (op: string, message: string) => void;
}

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

function answerQuery(query: string, model: UiOrgModel, lastMove: MoveResult | null): string {
  const records = allPeople(model);
  const people = records.map((r) => r.person);
  const intent = classifyIntent(query);

  switch (intent) {
    case 'why-invalid':
      return formatMoveNarrative(
        lastMove ? { verdict: lastMove.verdict, entity: lastMove.entity, entityType: 'department', toLabel: `${lastMove.to.division} / ${lastMove.to.subdivision}` } : null
      );
    case 'reporting-line': {
      const units: UnitRef[] = allDepartments(model).map((d) => ({ name: d.department, type: 'department', hc: d.hc, base: d.base }));
      const matched = findUnits(query, units);
      const loc = matched[0] ? findDept(model, matched[0].name) : null;
      return formatReportingLine(loc ? { deptName: loc.dept.department, subdivisionName: loc.sub.name, divisionName: loc.div.name } : null);
    }
    case 'scenario': {
      const units: UnitRef[] = [
        ...model.divisions.map((d) => ({ name: d.name, type: 'division' as const, hc: divHeadcount(d as unknown as DivisionModel), base: divBase(d as unknown as DivisionModel) })),
        ...allDepartments(model).map((d) => ({ name: d.department, type: 'department' as const, hc: d.hc, base: d.base })),
      ];
      const totalHc = model.divisions.reduce((a, d) => a + divHeadcount(d as unknown as DivisionModel), 0);
      return draftScenario(query, units, totalHc) ?? 'Tell me which units and what percentage — e.g. "reduce headcount by 10% in Operations".';
    }
    case 'okrs': {
      const person = findPersonByName(query, people);
      const rec = person ? records.find((r) => r.person.id === person.id) : null;
      if (!person || !rec) return 'Tell me who — e.g. "Draft OKRs for Mariam Khalifa".';
      return draftOkrs(person, rec.dept.department, rec.div.name, rec.sub.name);
    }
    case 'manager-help': {
      const person = findPersonByName(query, people);
      const rec = person ? records.find((r) => r.person.id === person.id) : null;
      if (!person || !rec) return 'Tell me who to coach — e.g. "How can the manager help John improve?".';
      return draftManagerCoachingScript(person, rec.dept.department);
    }
    case 'gap-path': {
      const person = findPersonByName(query, people);
      const rec = person ? records.find((r) => r.person.id === person.id) : null;
      return draftGapLearningPath(person, rec?.div.name ?? '', rec?.sub.name ?? '', rec?.dept.department ?? '');
    }
    case 'reeval': {
      const units: UnitRef[] = allDepartments(model).map((d) => ({ name: d.department, type: 'department', hc: d.hc, base: d.base }));
      const matched = findUnits(query, units);
      const dept = matched[0] ? allDepartments(model).find((d) => d.department === matched[0].name) : null;
      return draftHayReevaluation(dept ?? null, model as unknown as OrgModel);
    }
    case 'equity':
      return formatEquitySnapshot(computeEquitySnapshot(people));
    case 'policy':
      return answerPolicyQuestion(query);
    default:
      return formatFallbackHelp('ai', null);
  }
}

const LETTER_DOCS: LetterDocType[] = [
  'Offer Letter', 'Employment Contract Summary', 'Promotion Letter', 'Warning Letter',
  'No Objection Certificate (NOC)', 'Salary Certificate', 'Experience Certificate',
];

type GeneratorKey = 'narrative' | 'idp' | 'career' | 'letter' | 'skills' | 'policy';

const GENERATORS: { key: GeneratorKey; label: string }[] = [
  { key: 'narrative', label: 'Performance Narrative' },
  { key: 'idp', label: 'Individual Development Plan' },
  { key: 'career', label: 'Career Advice' },
  { key: 'letter', label: 'HR Letter' },
  { key: 'skills', label: 'Infer SFIA Skills (from text)' },
  { key: 'policy', label: 'Policy Q&A' },
];

export default function AiCopilotPane({ model, lastMove, onAsk }: AiCopilotPaneProps) {
  const records = allPeople(model);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  const [generator, setGenerator] = useState<GeneratorKey>('narrative');
  const [personId, setPersonId] = useState(records[0]?.person.id ?? '');
  const [letterDoc, setLetterDoc] = useState<LetterDocType>('Offer Letter');
  const [freeText, setFreeText] = useState('Senior banking professional, 9 years in corporate credit. Led credit analysis and portfolio risk reviews; built Python dashboards; managed a team of 4 analysts; mentored juniors.');
  const [policyQuestion, setPolicyQuestion] = useState('What is my EOSB after 6 years?');
  const [genOutput, setGenOutput] = useState<string | null>(null);

  function sendChat() {
    const query = chatInput.trim();
    if (!query) return;
    const answer = answerQuery(query, model, lastMove);
    setMessages((m) => [...m, { role: 'user', text: query }, { role: 'ai', text: answer }]);
    setChatInput('');
    onAsk('COPILOT', `Q: ${query}`);
  }

  function runGenerator() {
    const rec = records.find((r) => r.person.id === personId);
    let out = '';
    let label = '';
    switch (generator) {
      case 'narrative':
        if (!rec) return;
        out = draftPerfNarrative(buildPersonContext(rec.person, rec.div.name, rec.sub.name, rec.dept.department));
        label = `Performance narrative for ${rec.person.name}`;
        break;
      case 'idp':
        if (!rec) return;
        out = draftIdp(buildPersonContext(rec.person, rec.div.name, rec.sub.name, rec.dept.department));
        label = `IDP for ${rec.person.name}`;
        break;
      case 'career':
        if (!rec) return;
        out = draftCareerAdvice(rec.person, rec.div.name, rec.sub.name, rec.dept.department);
        label = `Career advice for ${rec.person.name}`;
        break;
      case 'letter':
        if (!rec) return;
        out = draftLetter(buildPersonContext(rec.person, rec.div.name, rec.sub.name, rec.dept.department), letterDoc);
        label = `${letterDoc} for ${rec.person.name}`;
        break;
      case 'skills':
        out = inferSkills(freeText);
        label = 'SFIA skills inference';
        break;
      case 'policy':
        out = answerPolicyQuestion(policyQuestion);
        label = `Policy answer: ${policyQuestion}`;
        break;
    }
    setGenOutput(out);
    onAsk('GENERATE', label);
  }

  const needsPerson = generator === 'narrative' || generator === 'idp' || generator === 'career' || generator === 'letter';

  return (
    <section className="tabpane active">
      <div className="tipbar">
        🤖 <b>AI Copilot Studio</b> — every generator below runs on the Native engine (built-in, offline,
        deterministic — no live API key is configured in this build). Drafts are decision-support only —
        a human approves before anything is issued.
      </div>

      <div className="card" style={{ marginBottom: 10 }}>
        <div className="chead"><h3>💬 Oracle Copilot</h3><span className="mini">ask about moves, gaps, re-eval, equity, scenarios, policy…</span></div>
        <div className="cbody">
          <div style={{ maxHeight: 300, overflow: 'auto', marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.length === 0 && <p className="empty">{formatFallbackHelp('ai', null)}</p>}
            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                <div style={{
                  background: m.role === 'user' ? 'var(--navy)' : '#f6f7fb', color: m.role === 'user' ? '#fff' : 'var(--ink)',
                  borderRadius: 10, padding: '8px 12px', fontSize: 12, whiteSpace: 'pre-wrap',
                }}>{m.text}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendChat(); }}
              placeholder='e.g. "How do I fill the gap for Mariam Khalifa?"'
              style={{ flex: 1, padding: '7px 10px', border: '1px solid var(--line)', borderRadius: 6, font: 'inherit' }}
            />
            <button className="hbtn" style={{ background: 'var(--navy)' }} onClick={sendChat}>Ask</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="chead"><h3>✨ AI Generators</h3><span className="mini">Native engine</span></div>
        <div className="cbody">
          <div className="selrow" style={{ marginBottom: 8 }}>
            <div className="sel">
              <label>Generator</label>
              <select value={generator} onChange={(e) => { setGenerator(e.target.value as GeneratorKey); setGenOutput(null); }}>
                {GENERATORS.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
              </select>
            </div>
            {needsPerson && (
              <div className="sel">
                <label>Employee</label>
                <select value={personId} onChange={(e) => setPersonId(e.target.value)}>
                  {records.map((r) => <option key={r.person.id} value={r.person.id}>{r.person.name} — {r.dept.department} ({r.person.grade})</option>)}
                </select>
              </div>
            )}
            {generator === 'letter' && (
              <div className="sel">
                <label>Document</label>
                <select value={letterDoc} onChange={(e) => setLetterDoc(e.target.value as LetterDocType)}>
                  {LETTER_DOCS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
            )}
            <button className="hbtn" style={{ background: 'var(--navy)', alignSelf: 'flex-end' }} onClick={runGenerator}>✨ Generate</button>
          </div>

          {generator === 'skills' && (
            <textarea
              rows={4} value={freeText} onChange={(e) => setFreeText(e.target.value)}
              style={{ width: '100%', font: 'inherit', fontSize: 11, border: '1px solid var(--line)', borderRadius: 6, padding: 6, marginBottom: 8 }}
            />
          )}
          {generator === 'policy' && (
            <input
              type="text" value={policyQuestion} onChange={(e) => setPolicyQuestion(e.target.value)}
              style={{ width: '100%', font: 'inherit', fontSize: 11, border: '1px solid var(--line)', borderRadius: 6, padding: 6, marginBottom: 8 }}
            />
          )}

          {genOutput && <div className="ai-out">{genOutput}</div>}
          {!genOutput && <p className="empty">Pick a generator, fill the inputs, and click Generate.</p>}
        </div>
      </div>
    </section>
  );
}

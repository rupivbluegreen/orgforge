import JSZip from 'jszip';
import type { JobDescription } from './jd-document';
import { exportJdData } from './jd-document';

interface PParaOpts {
  b?: boolean;
  sz?: number;
  color?: string;
  before?: number;
  after?: number;
}

const escXml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const P = (t: string, opts: PParaOpts = {}): string => {
  const { b = false, sz = 18, color = '1B2430', before = 0, after = 60 } = opts;
  const runs = String(t)
    .split('\n')
    .map(
      (line, i) =>
        `${i > 0 ? '<w:br/>' : ''}<w:r><w:rPr>${b ? '<w:b/>' : ''}<w:sz w:val="${sz}"/><w:color w:val="${color}"/><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr><w:t xml:space="preserve">${escXml(line)}</w:t></w:r>`
    )
    .join('');
  return `<w:p><w:pPr><w:spacing w:before="${before}" w:after="${after}"/></w:pPr>${runs}</w:p>`;
};

const H = (t: string): string => P(t, { b: true, sz: 20, color: 'C74634', before: 220, after: 80 });
const KV = (k: string, v: string): string => P(`${k}:  ${v}`, { sz: 18 });

// Built-in Hay-layout JD body, no template
export function buildFallbackDocumentXml(jd: JobDescription): string {
  const d = exportJdData(jd);
  const body = [
    P('JOB DESCRIPTION', { b: true, sz: 32, color: '14213D', after: 40 }),
    P(`Doc No. ${d.doc_no}   ·   Revision ${d.revision_no}   ·   ${d.date}`, { sz: 16, color: '66707F', after: 200 }),
    H('1. JOB DETAILS'),
    KV('Job Title', d.job_title), KV('Job Grade', d.job_grade), KV('Reports To', d.reports_to),
    KV('Division', d.division), KV('Department', d.department), KV('Section / Stream', d.section),
    H('2. JOB OBJECTIVE'), P(d.job_objective),
    H('3. JOB DIMENSIONS'), KV('Direct Reports', d.direct_reports), KV('Total Staff Supervised', d.total_reports),
    H('4. KEY ACCOUNTABILITIES'), P(d.key_accountabilities),
    H('5. COMMUNICATIONS & WORKING RELATIONSHIPS'),
    P('Internal:', { b: true }), P(d.internal_comms), P('External:', { b: true }), P(d.external_comms),
    H('6. QUALIFICATIONS, EXPERIENCE, SKILLS & COMPETENCIES'),
    P('Minimum Qualifications:', { b: true }), P(d.min_qualifications),
    P('Minimum Experience:', { b: true }), P(d.min_experience),
    P('Job-Specific Skills:', { b: true }), P(d.job_skills),
    P('Behavioral Competencies:', { b: true }), P(d.behavioral_competencies),
    P('Technical Competencies (SFIA 10):', { b: true }), P(d.technical_competencies),
    H('7. HAY JOB EVALUATION SUMMARY'),
    KV('Know-How', d.hay_know_how), KV('Problem Solving', d.hay_problem_solving),
    KV('Accountability', d.hay_accountability), KV('Total Hay Points', d.hay_score), KV('Hay Grade', d.hay_grade),
    H('8. GENERATION RECORD'),
    KV('Structural Context', d.structural_context), KV('Generated', `${d.generated_on} — ${d.generated_by}`),
    P('The HRIS remains the system of record for this position.', { sz: 14, color: '98A2B3', before: 200 }),
  ].join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`;
}

export const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;

export const RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

// Minimal OOXML zip; jszip = Node-side PizZip
export async function buildFallbackDocx(jd: JobDescription): Promise<Buffer> {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', CONTENT_TYPES_XML);
  zip.file('_rels/.rels', RELS_XML);
  zip.file('word/document.xml', buildFallbackDocumentXml(jd));
  return zip.generateAsync({ type: 'nodebuffer', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', compression: 'DEFLATE' });
}

export const fallbackDocxFilename = (jd: JobDescription): string =>
  `JD_${jd.job_title.replace(/[^A-Za-z0-9]+/g, '_')}_${jd.revision_no}.docx`;

import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { buildJobDescription } from '../src/engines/jd-document';
import type { JdBuildInput } from '../src/engines/jd-document';
import { buildFallbackDocumentXml, buildFallbackDocx, fallbackDocxFilename } from '../src/engines/jd-docx';

const NOW = new Date('2026-09-22T14:30:00.000Z');

const legalJd = buildJobDescription({
  role: { type: 'head', label: 'Head of Legal', dept: 'Legal', div: 'Support Functions', sub: 'Risk & Control Functions' },
  isHead: true, deptHc: 41, deptBase: 7562000,
  hay: { kh: { pts: 460, note: 'kh note' }, ps: { pts: 175, note: 'ps note' }, acc: { pts: 175, note: 'acc note', impact: 'R' }, total: 810, grade: 'M2' },
  grade: 'M2', level: 5,
  techList: [{ code: 'RSKM', name: 'Risk management', cat: 'Governance, risk and compliance', lvl: 5 }],
  behList: [{ code: 'DECM', name: 'Decision-making', lvl: 6 }],
  revision: 1, generatedBy: 'Mock AI (rules engine)', now: NOW,
} satisfies JdBuildInput);

describe('buildFallbackDocumentXml (pure WordprocessingML text generation)', () => {
  const xml = buildFallbackDocumentXml(legalJd);

  it('is a single well-formed w:document root with matching tag counts', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>')).toBe(true);
    const opens = (xml.match(/<w:p>/g) || []).length;
    const closes = (xml.match(/<\/w:p>/g) || []).length;
    expect(opens).toBeGreaterThan(0);
    expect(opens).toBe(closes);
  });

  it('embeds the doc number, job title and Hay summary', () => {
    expect(xml).toContain('Doc No. JD-6796');
    expect(xml).toContain('Head of Legal');
    expect(xml).toContain('Total Hay Points');
    expect(xml).toContain('810');
  });

  it('escapes XML special characters in free text (no raw &, <, > from job text)', () => {
    const jdWithSpecialChars = buildJobDescription({
      role: { type: 'head', label: 'R&D <Lead>', dept: 'Legal', div: 'Support Functions', sub: 'Risk & Control Functions' },
      isHead: true, deptHc: 41, deptBase: 7562000,
      hay: { kh: { pts: 460, note: 'kh' }, ps: { pts: 175, note: 'ps' }, acc: { pts: 175, note: 'acc', impact: 'R' }, total: 810, grade: 'M2' },
      grade: 'M2', level: 5,
      techList: [{ code: 'RSKM', name: 'Risk management', cat: 'x', lvl: 5 }],
      behList: [], revision: 1, generatedBy: 'test', now: NOW,
    });
    const xml2 = buildFallbackDocumentXml(jdWithSpecialChars);
    expect(xml2).toContain('R&amp;D &lt;Lead&gt;');
    expect(xml2).not.toContain('R&D <Lead>');
  });
});

describe('buildFallbackDocx (real .docx via jszip, mirrors the reference PizZip path)', () => {
  it('produces a real zip with the 3 required OOXML parts', async () => {
    const buf = await buildFallbackDocx(legalJd);
    expect(buf.subarray(0, 2).toString('latin1')).toBe('PK'); // zip magic

    const zip = await JSZip.loadAsync(buf);
    const fileEntries = Object.keys(zip.files).filter((p) => !zip.files[p].dir).sort();
    expect(fileEntries).toEqual(['[Content_Types].xml', '_rels/.rels', 'word/document.xml']);

    const contentTypes = await zip.file('[Content_Types].xml')!.async('string');
    expect(contentTypes).toContain('wordprocessingml.document.main+xml');

    const rels = await zip.file('_rels/.rels')!.async('string');
    expect(rels).toContain('word/document.xml');

    const documentXml = await zip.file('word/document.xml')!.async('string');
    expect(documentXml).toBe(buildFallbackDocumentXml(legalJd));
  });

  it('filename is sanitized from job title + revision', () => {
    expect(fallbackDocxFilename(legalJd)).toBe('JD_Head_of_Legal_R1.docx');
  });
});

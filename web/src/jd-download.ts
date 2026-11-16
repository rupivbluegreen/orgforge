import JSZip from 'jszip';
import type { JobDescription } from '../../src/engines/jd-document';
import { buildFallbackDocumentXml, fallbackDocxFilename, CONTENT_TYPES_XML, RELS_XML } from '../../src/engines/jd-docx';

// Browser needs Blob; nodebuffer needs Buffer.
export async function downloadFallbackDocx(jd: JobDescription): Promise<void> {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', CONTENT_TYPES_XML);
  zip.file('_rels/.rels', RELS_XML);
  zip.file('word/document.xml', buildFallbackDocumentXml(jd));
  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fallbackDocxFilename(jd);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

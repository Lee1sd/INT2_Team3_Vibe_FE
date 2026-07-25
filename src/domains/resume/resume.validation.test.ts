import assert from 'node:assert/strict';
import test from 'node:test';
import { validateResumeFile, resolveResumeContentType, RESUME_MAX_BYTES } from './resume.types';

function makeFile(name: string, size: number, type: string): File {
  return { name, size, type } as File;
}

test('validateResumeFile accepts pdf/txt/md within size limit', () => {
  assert.equal(validateResumeFile(makeFile('resume.pdf', 1024, 'application/pdf')), null);
  assert.equal(validateResumeFile(makeFile('resume.txt', 1024, 'text/plain')), null);
  assert.equal(validateResumeFile(makeFile('resume.md', 1024, 'text/markdown')), null);
});

test('validateResumeFile rejects disallowed extensions', () => {
  assert.match(
    validateResumeFile(makeFile('resume.docx', 1024, 'application/msword')) ?? '',
    /PDF, TXT, MD/
  );
});

test('validateResumeFile rejects files over 10MB', () => {
  const oversized = makeFile('resume.pdf', RESUME_MAX_BYTES + 1, 'application/pdf');
  assert.match(validateResumeFile(oversized) ?? '', /10MB/);
});

test('resolveResumeContentType keeps file.type when present', () => {
  assert.equal(resolveResumeContentType(makeFile('resume.md', 10, 'text/markdown')), 'text/markdown');
});

test('resolveResumeContentType falls back to text/markdown for empty .md file.type', () => {
  assert.equal(resolveResumeContentType(makeFile('resume.md', 10, '')), 'text/markdown');
});

test('resolveResumeContentType falls back to application/octet-stream for unknown empty type', () => {
  assert.equal(resolveResumeContentType(makeFile('resume.pdf', 10, '')), 'application/octet-stream');
});

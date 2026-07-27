import assert from 'node:assert/strict';
import test from 'node:test';
import { buildResumeUploadHeaders } from './resume.upload';

const API_BASE_URL = 'http://localhost:8080';

test('로컬 백엔드 이력서 업로드 URL에는 JWT를 첨부한다', () => {
  const headers = buildResumeUploadHeaders(
    'http://localhost:8080/api/resumes/local-upload/token-1',
    API_BASE_URL,
    'application/pdf',
    'access-token'
  );

  assert.deepEqual(headers, {
    'Content-Type': 'application/pdf',
    Authorization: 'Bearer access-token',
  });
});

test('S3 또는 다른 origin의 URL에는 JWT를 첨부하지 않는다', () => {
  const s3Headers = buildResumeUploadHeaders(
    'https://bucket.s3.ap-northeast-2.amazonaws.com/resumes/1/file.pdf',
    API_BASE_URL,
    'application/pdf',
    'access-token'
  );
  const foreignHeaders = buildResumeUploadHeaders(
    'https://example.com/api/resumes/local-upload/token-1',
    API_BASE_URL,
    'application/pdf',
    'access-token'
  );

  assert.deepEqual(s3Headers, { 'Content-Type': 'application/pdf' });
  assert.deepEqual(foreignHeaders, { 'Content-Type': 'application/pdf' });
});

test('토큰이 없거나 URL이 잘못되면 Content-Type만 유지한다', () => {
  const noToken = buildResumeUploadHeaders(
    'http://localhost:8080/api/resumes/local-upload/token-1',
    API_BASE_URL,
    'text/plain',
    null
  );
  const malformed = buildResumeUploadHeaders('not-a-url', API_BASE_URL, 'text/plain', 'access-token');

  assert.deepEqual(noToken, { 'Content-Type': 'text/plain' });
  assert.deepEqual(malformed, { 'Content-Type': 'text/plain' });
});

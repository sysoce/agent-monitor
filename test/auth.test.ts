import test from 'node:test';
import * as assert from 'node:assert/strict';
import { generateSecurePin, timingSafeCompare, extractAuthToken, isRequestAuthorized } from '../src/server/auth';
import type { IncomingMessage } from 'node:http';

test('generateSecurePin produces 6-character hex PIN', () => {
  const pin = generateSecurePin();
  assert.equal(typeof pin, 'string');
  assert.equal(pin.length, 6);
});

test('timingSafeCompare correctly compares equal and unequal strings', () => {
  assert.equal(timingSafeCompare('secret123', 'secret123'), true);
  assert.equal(timingSafeCompare('secret123', 'wrong'), false);
  assert.equal(timingSafeCompare('secret123', 'secret124'), false);
});

test('extractAuthToken extracts token from Bearer header', () => {
  const req = { headers: { authorization: 'Bearer mysecret' } } as unknown as IncomingMessage;
  assert.equal(extractAuthToken(req), 'mysecret');
});

test('extractAuthToken extracts token from cookie', () => {
  const req = { headers: { cookie: 'foo=bar; agent_auth=cookie-token; baz=1' } } as unknown as IncomingMessage;
  assert.equal(extractAuthToken(req), 'cookie-token');
});

test('extractAuthToken extracts token from URL search parameter', () => {
  const req = { headers: {} } as unknown as IncomingMessage;
  const url = new URL('http://localhost:4200/api/sessions?token=query-token');
  assert.equal(extractAuthToken(req, url), 'query-token');
});

test('isRequestAuthorized permits all when expectedPassword is empty', () => {
  const req = { headers: {} } as unknown as IncomingMessage;
  assert.equal(isRequestAuthorized(req, undefined), true);
});

test('isRequestAuthorized validates correct password and denies invalid', () => {
  const goodReq = { headers: { authorization: 'Bearer pass123' } } as unknown as IncomingMessage;
  const badReq = { headers: { authorization: 'Bearer wrong' } } as unknown as IncomingMessage;
  assert.equal(isRequestAuthorized(goodReq, 'pass123'), true);
  assert.equal(isRequestAuthorized(badReq, 'pass123'), false);
});

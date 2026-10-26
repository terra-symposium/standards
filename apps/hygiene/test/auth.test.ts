import assert from 'node:assert/strict';
import test from 'node:test';
import { cookieSecurityAttribute, sessionCookie } from '../src/lib/server/auth.js';

test('local loopback sign-in cookies work over the HTTP development server', () => {
  assert.equal(cookieSecurityAttribute('http://127.0.0.1:8888'), '');
  assert.equal(cookieSecurityAttribute('http://[::1]:8888'), '');
  assert.equal(sessionCookie('token', 60, 'http://127.0.0.1:8888').includes('; Secure'), false);
});

test('hosted and non-loopback origins always use secure cookies', () => {
  assert.equal(cookieSecurityAttribute('https://standards-hygiene.netlify.app'), '; Secure');
  assert.equal(cookieSecurityAttribute('http://192.168.1.5:8888'), '; Secure');
  assert.equal(sessionCookie('token', 60, 'https://standards-hygiene.netlify.app').includes('; Secure'), true);
});

import assert from 'node:assert/strict';
import { sessionIdFromJwt } from '../functions/_shared/session-id.js';

function token(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return header + '.' + body + '.sig';
}

const id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1';
const samples = [
  { session_id: id },
  { session_id: id, pad: 'x' },
  { session_id: id, pad: 'xy' },
  { session_id: id, pad: 'xyz' }
];

let sawUnpadded = false;
for (const payload of samples) {
  const jwt = token(payload);
  const part = jwt.split('.')[1];
  if (part.length % 4 !== 0) sawUnpadded = true;
  assert.equal(sessionIdFromJwt('Bearer ' + jwt), id);
}
assert.equal(sawUnpadded, true, 'the fixture must include a payload that omits base64 padding');
assert.equal(sessionIdFromJwt(''), '');
assert.equal(sessionIdFromJwt('not-a-jwt'), '');
console.log('session id padding ok');

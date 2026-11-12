import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { nextAuthStep } = require('../../assets/auth-step.js');

assert.equal(nextAuthStep({ signedIn: false, portal: 'client' }), 'login');

assert.equal(nextAuthStep({
  signedIn: true, portal: 'client', role: 'client', codeOk: false, currentLevel: 'aal1', nextLevel: 'aal2'
}), 'email-code');

assert.equal(nextAuthStep({
  signedIn: true, portal: 'staff', role: 'medical', codeOk: false, currentLevel: 'aal1', nextLevel: 'aal1'
}), 'email-code');

assert.equal(nextAuthStep({
  signedIn: true, portal: 'staff', role: 'admin', codeOk: true, currentLevel: 'aal1', nextLevel: 'aal1', hasVerifiedFactor: false
}), 'enroll');

assert.equal(nextAuthStep({
  signedIn: true, portal: 'staff', role: 'admin', codeOk: true, currentLevel: 'aal1', nextLevel: 'aal2', hasVerifiedFactor: true
}), 'mfa');

assert.equal(nextAuthStep({
  signedIn: true, portal: 'staff', role: 'owner', codeOk: true, currentLevel: 'aal2', nextLevel: 'aal2', hasVerifiedFactor: true
}), 'resume');

assert.equal(nextAuthStep({
  signedIn: true, portal: 'client', role: 'client', codeOk: true, currentLevel: 'aal1', nextLevel: 'aal2', hasVerifiedFactor: true
}), 'mfa');

assert.equal(nextAuthStep({
  signedIn: true, portal: 'client', role: 'client', codeOk: true, currentLevel: 'aal1', nextLevel: 'aal1'
}), 'enter');

console.log('auth step ok');

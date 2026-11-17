/* Which sign-in screen comes next. A refresh must come back to the email
   code, and a first-time staff member must come back to authenticator setup. */
(function (root) {
  function nextAuthStep(input) {
    var role = input && input.role ? String(input.role) : '';
    var portal = input && input.portal;
    if (!input || !input.signedIn) return 'login';
    if (portal === 'client' && role && role !== 'client') return 'wrong-portal';
    if (portal === 'staff' && (!role || role === 'client')) return 'wrong-portal';
    if (!input.codeOk) return 'email-code';
    var current = input.currentLevel || 'aal1';
    var next = input.nextLevel || current;
    if (portal === 'staff') {
      if (current === 'aal2') return 'resume';
      if (input.hasVerifiedFactor) return 'mfa';
      return 'enroll';
    }
    if (next === 'aal2' && current !== 'aal2') return 'mfa';
    return 'enter';
  }
  root.nextAuthStep = nextAuthStep;
  if (typeof module !== 'undefined' && module.exports) module.exports = { nextAuthStep: nextAuthStep };
})(typeof window !== 'undefined' ? window : globalThis);

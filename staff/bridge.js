/* Staff portal bridge. The publishable key is browser-safe. The service role is not here. */
(function () {
  'use strict';
  var cfg = window.BLOOM_CONFIG;
  var sb = window.supabase.createClient(cfg.url, cfg.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  });
  window.sb = sb;
  var factorId = '';
  var timer = null;
  var pendingUserId = '';
  var signedEmail = '';

  function api() { return window.BloomAPI; }
  function authPatch(patch) {
    if (window.BloomSetAuth) window.BloomSetAuth(patch);
  }
  function signInMessage(error, fallback) {
    var message = error && error.message ? String(error.message) : '';
    if ((error && error.status === 403) || /not on the bloom access list/i.test(message)) {
      return "This account isn't on the Bloom access list. Please contact the clinic.";
    }
    return message || fallback;
  }
  function fail(message) {
    authPatch({ step: 'login', err: message });
    if (api()) api().render();
  }

  async function password(email, passwordValue) {
    var res = await sb.auth.signInWithPassword({ email: email, password: passwordValue });
    if (res.error) {
      authPatch({ err: signInMessage(res.error, 'That email and password do not match a staff account. After 5 failed attempts the account locks for 15 minutes.') });
      api().render();
      return;
    }
    var role = res.data.user.app_metadata && res.data.user.app_metadata.portal_role;
    if (!role || role === 'client') {
      await sb.auth.signOut();
      authPatch({ err: 'This sign-in is for Bloom staff. Clients use the portal linked from the public site.' });
      api().render();
      return;
    }
    pendingUserId = res.data.user.id;
    signedEmail = email;
    var passed = await emailGate(email);
    if (!passed) return;
    await totp(email);
  }

  async function emailGate(email) {
    var status = await sb.rpc('sign_in_code_status');
    if (status.data && status.data.ok) return true;
    authPatch({ step: 'email-code', email: email, err: '' });
    if (api()) api().render();
    await sendSignInCode();
    return false;
  }

  async function sendSignInCode() {
    var session = await sb.auth.getSession();
    var token = session.data.session && session.data.session.access_token;
    if (!token) { authPatch({ err: 'Sign in again.' }); if (api()) api().render(); return; }
    var res = await fetch(cfg.url + '/functions/v1/send-sign-in-code', {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: cfg.publishableKey, Authorization: 'Bearer ' + token },
      body: '{}'
    });
    var body = await res.json().catch(function () { return {}; });
    if (body.status === 'not_configured' || body.status === 'failed' || body.status === 'locked' || body.status === 'throttled') {
      authPatch({ err: body.message || 'A code could not be sent.' });
      if (api()) api().render();
    }
  }

  async function emailCode(value) {
    var res = await sb.rpc('verify_sign_in_code', { p_code: value });
    var data = res.data || {};
    if (res.error || !data.ok) {
      authPatch({ err: data.message || 'That code was not accepted.' });
      if (api()) api().render();
      return;
    }
    await sb.auth.refreshSession();
    await totp(signedEmail);
  }

  async function totp(email) {
    var aal = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    var factors = await sb.auth.mfa.listFactors();
    var verified = factors.data && factors.data.totp && factors.data.totp[0];
    if (aal.data && aal.data.currentLevel === 'aal2') {
      await resume();
      return;
    }
    if (verified) {
      factorId = verified.id;
      authPatch({ step: 'mfa', email: email, err: '', pending: pendingUserId });
      api().render();
      return;
    }
    var enrolled = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Bloom staff' });
    if (enrolled.error) { fail(enrolled.error.message); return; }
    factorId = enrolled.data.id;
    authPatch({ step: 'enroll', email: email, err: '', qr: enrolled.data.totp.qr_code, pending: pendingUserId });
    api().render();
  }

  async function code(value) {
    var challenge = await sb.auth.mfa.challenge({ factorId: factorId });
    if (challenge.error) { authPatch({ err: challenge.error.message }); api().render(); return; }
    var verified = await sb.auth.mfa.verify({ factorId: factorId, challengeId: challenge.data.id, code: value });
    if (verified.error) { authPatch({ err: verified.error.message }); api().render(); return; }
    await resume();
  }

  async function resume() {
    var touch = await sb.rpc('touch_session');
    if (touch.error) { fail(touch.error.message); return; }
    var snap = await sb.rpc('staff_bootstrap');
    if (snap.error) { fail(snap.error.message); return; }
    api().apply(snap.data);
    var me = (snap.data.staff || []).filter(function (s) { return s.id === snap.data.me; })[0];
    if (!me) { fail('Your staff profile was not found.'); return; }
    authPatch({ pending: me.id });
    if (!/^Signed/.test(me.conf || '')) {
      authPatch({ step: 'pledge', err: '' });
      api().render();
      return;
    }
    api().startSession(me);
  }

  async function boot() {
    var session = (await sb.auth.getSession()).data.session;
    if (!session) { api().render(); return; }
    var aal = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal.data && aal.data.nextLevel === 'aal2' && aal.data.currentLevel !== 'aal2') {
      var factors = await sb.auth.mfa.listFactors();
      factorId = factors.data.totp[0] && factors.data.totp[0].id;
      authPatch({ step: 'mfa', email: session.user.email, err: '', pending: session.user.id });
      api().render();
      return;
    }
    await resume();
  }

  window.BloomAuth = { password: password, code: code, emailCode: emailCode, resendEmailCode: sendSignInCode, boot: boot, resume: resume };

  window.BloomSync = {
    schedule: function () {
      clearTimeout(timer);
      timer = setTimeout(push, 400);
    }
  };

  async function push() {
    var S = window.BloomState && window.BloomState();
    if (!S) return;
    var role = window.BloomAPI && window.BloomAPI.me() ? window.BloomAPI.me().role : '';
    var toPublish = [];
    var wellness = (window.BloomPlans ? window.BloomPlans() : []).filter(function (p) { return p.type === 'wellness'; }).map(function (p) {
      var status = (S.planMeta && S.planMeta[p.id] && S.planMeta[p.id].status) || p.status;
      if ((status === 'Approved' || status === 'Published') && role === 'medical') {
        toPublish.push({ id: p.id, status: status });
        status = (p.status === 'Draft' || p.status === 'Ready for Review') ? p.status : 'Ready for Review';
      }
      if (status !== 'Draft' && status !== 'Ready for Review') status = 'Draft';
      return { id: p.id, pid: p.pid, type: 'wellness', kind: p.kind, date: p.date, status: status, body: (S.drafts && S.drafts[p.id]) || {} };
    });
    var payload = {
      clinic: S.clinic, timeout: S.timeout, newDays: S.newDays, staff: S.staff, reqs: S.reqs,
      tasks: S.tasks, ctasks: S.ctasks, notes: S.notes, templates: S.templates, library: S.library,
      hub: S.hub, vac: S.vac, compliance: S.compliance, jane: S.jane, incidents: S.incidents, wellness: wellness
    };
    var res = await sb.rpc('staff_commit', { payload: payload });
    if (res.error && window.BloomAPI) window.BloomAPI.toast(res.error.message);
    for (var i = 0; i < toPublish.length; i++) {
      var pub = await sb.rpc('approve_wellness_plan', { p_legacy_id: toPublish[i].id, p_status: toPublish[i].status });
      if (pub.error && window.BloomAPI) window.BloomAPI.toast(pub.error.message);
    }
  }

  window.BloomForms = {
    open: function (name, num) {
      var A = api();
      var u = A.me();
      var patients = A.patients().map(function (p) {
        return '<option value="' + A.esc(p.id) + '">' + A.esc(p.first + ' ' + p.last) + ' · ' + A.esc(p.id) + '</option>';
      }).join('');
      A.openDialog('<div class="x-row"><div><div class="sub">' + A.esc(num || 'Form') + '</div><h2>' + A.esc(name) + '</h2></div><button class="icon-btn" data-action="close" aria-label="Close">' + A.icon('close') + '</button></div>' +
        '<p class="small" style="margin-top:8px">Filled from the minimum record: name, date of birth, city, the last four digits of the health number, and the practitioner profile. Do not type a diagnosis, a history, or a full health number. Those stay in Jane. Anything you type is stored only inside the PDF.</p>' +
        '<form class="form" id="fill-form" style="margin-top:16px"><div class="field"><label for="ff-p">Patient</label><select class="select" id="ff-p" required>' + patients + '</select></div>' +
        '<div class="field"><label for="ff-tests">What you are requesting</label><textarea class="input" id="ff-tests" placeholder="Tests or imaging you want on this requisition"></textarea></div>' +
        '<div class="field"><label for="ff-note">Note for the receiving site</label><textarea class="input" id="ff-note" placeholder="Only what this requisition needs. Leave the history in Jane."></textarea></div>' +
        '<p class="tiny">Practitioner: ' + A.esc(A.fullName(u)) + (u.cred && u.cred.reg ? ' · ' + A.esc(u.cred.reg) : '') + '</p>' +
        '<div class="acts"><button class="cta cta-ghost" type="button" data-action="close">Cancel</button><button class="cta cta-solid" type="submit">Create PDF</button></div></form>');
      document.getElementById('fill-form').addEventListener('submit', function (e) {
        e.preventDefault();
        build(name, document.getElementById('ff-p').value, document.getElementById('ff-tests').value, document.getElementById('ff-note').value);
      });
    }
  };

  async function build(name, pid, tests, note) {
    var A = api();
    var p = A.patient(pid);
    var u = A.me();
    var clinic = A.clinic();
    var doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'letter' });
    doc.setFontSize(18);
    doc.text('Natural Bloom Care Inc.', 48, 64);
    doc.setFontSize(12);
    doc.text('Requisition record — testing copy', 48, 86);
    doc.setFontSize(11);
    var lines = [
      'Template: ' + name,
      'Patient: ' + p.first + ' ' + p.last + ' (' + p.id + ')',
      'Born: ' + (p.dob || '—'),
      'City: ' + (p.city || '') + ', Alberta',
      'Health number (last 4 only on this copy): ' + String(p.ahc || '').slice(-4),
      'Practitioner: ' + A.fullName(u),
      'Registration: ' + ((u.cred && u.cred.reg) || 'TODO: registration number'),
      'Clinic: ' + (clinic.legal || clinic.name || ''),
      'Phone / fax: ' + (clinic.phone || '') + ' / ' + (clinic.fax || ''),
      '',
      'Requested:',
      tests || '—',
      '',
      'Note:',
      note || '—',
      '',
      'This PDF is not an official Alberta Health Services form. Clinical history stays in Jane.'
    ];
    var y = 120;
    lines.forEach(function (line) {
      doc.splitTextToSize(line, 500).forEach(function (part) { doc.text(part, 48, y); y += 16; });
    });
    var blob = doc.output('blob');
    var fileId = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
    var path = p.uuid + '/' + fileId + '.pdf';
    var up = await sb.storage.from('patient-documents').upload(path, blob, { contentType: 'application/pdf', upsert: false });
    if (up.error) { A.toast(up.error.message || 'The PDF could not be stored.'); return; }
    var reg = await sb.rpc('register_generated_document', { p_patient_legacy: p.id, p_template: name, p_storage_path: path });
    if (reg.error) { A.toast(reg.error.message); return; }
    A.closeLayer();
    A.openDialog('<div class="sub">Stored privately</div><h2>Requisition <em>record</em></h2><p class="small" style="margin-top:10px">The PDF is in a private bucket. A download link expires in about two minutes. Sending is logged. Email does not attach the file.</p>' +
      '<div class="acts"><button class="cta cta-ghost" type="button" data-send="portal" data-doc="' + reg.data + '">Patient portal</button><button class="cta cta-ghost" type="button" data-send="email" data-doc="' + reg.data + '">Email a link</button><button class="cta cta-ghost" type="button" data-send="fax" data-doc="' + reg.data + '">Fax</button><button class="cta cta-solid" type="button" data-dl="' + reg.data + '">Download</button></div>' +
      '<div class="field" id="send-to" hidden><label for="ff-to">Recipient</label><input class="input" id="ff-to" placeholder="Email address"></div>' +
      '<button class="cta cta-ghost" type="button" id="revoke-link" hidden style="margin-top:12px">Revoke the last link</button>');
  }

  document.addEventListener('click', function (e) {
    var dl = e.target.closest('[data-dl]');
    if (dl) {
      sendOrLink('document-url', { documentId: dl.getAttribute('data-dl') }).then(function (j) {
        if (j.url) location.href = j.url;
        else api().toast(j.message || j.status);
      });
    }
    var send = e.target.closest('[data-send]');
    if (send) {
      var channel = send.getAttribute('data-send');
      var box = document.getElementById('send-to');
      if (channel !== 'portal') { box.hidden = false; if (!document.getElementById('ff-to').value) { api().toast('Add the recipient, then press the button again.'); return; } }
      sendOrLink('send-document', {
        documentId: send.getAttribute('data-doc'),
        channel: channel,
        to: channel === 'portal' ? 'Client portal' : document.getElementById('ff-to').value.trim(),
        purpose: 'Requisition delivery',
        what: 'Requisition record'
      }).then(function (j) {
        api().toast(j.message || j.status);
        if (j.linkId) {
          var revoke = document.getElementById('revoke-link');
          if (revoke) { revoke.hidden = false; revoke.setAttribute('data-id', j.linkId); }
        }
      });
    }
    var revoke = e.target.closest('#revoke-link');
    if (revoke && revoke.getAttribute('data-id')) {
      sb.rpc('revoke_requisition_link', { p_id: revoke.getAttribute('data-id') }).then(function (r) {
        api().toast(r.error ? r.error.message : 'The link was turned off.');
      });
    }
  });

  function sendOrLink(name, body) {
    return sb.auth.getSession().then(function (s) {
      return fetch(cfg.url + '/functions/v1/' + name, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          apikey: cfg.publishableKey,
          Authorization: 'Bearer ' + s.data.session.access_token
        },
        body: JSON.stringify(body)
      });
    }).then(function (r) { return r.json(); });
  }
})();

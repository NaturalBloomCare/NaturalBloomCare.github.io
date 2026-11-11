(function () {
  'use strict';
  var cfg = window.BLOOM_CONFIG;
  var sb = window.supabase.createClient(cfg.url, cfg.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  });
  var state = { step: 'login', email: '', err: '', home: null, factorId: '', qr: '', idle: null, last: Date.now() };

  function signInMessage(error, fallback) {
    var message = error && error.message ? String(error.message) : '';
    if ((error && error.status === 403) || /not on the bloom access list/i.test(message)) {
      return "This account isn't on the Bloom access list. Please contact the clinic.";
    }
    return message || fallback;
  }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function sanitizeHtml(html) {
    var allowed = { P: 1, H2: 1, H3: 1, UL: 1, OL: 1, LI: 1, STRONG: 1, EM: 1, BR: 1, A: 1 };
    var drop = { SCRIPT: 1, STYLE: 1, IFRAME: 1, OBJECT: 1, EMBED: 1, LINK: 1, META: 1 };
    var doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    function scrub(node) {
      var kids = Array.prototype.slice.call(node.childNodes);
      for (var i = 0; i < kids.length; i++) {
        var child = kids[i];
        if (child.nodeType === 3) continue;
        if (child.nodeType !== 1) {
          node.removeChild(child);
          continue;
        }
        if (drop[child.tagName]) {
          node.removeChild(child);
          continue;
        }
        if (!allowed[child.tagName]) {
          while (child.firstChild) node.insertBefore(child.firstChild, child);
          node.removeChild(child);
          scrub(node);
          return;
        }
        var attrs = Array.prototype.slice.call(child.attributes);
        for (var a = 0; a < attrs.length; a++) {
          var name = attrs[a].name.toLowerCase();
          if (child.tagName === 'A' && name === 'href' && /^https?:\/\//i.test(attrs[a].value)) {
            child.setAttribute('rel', 'noopener noreferrer');
          } else {
            child.removeAttribute(attrs[a].name);
          }
        }
        scrub(child);
      }
    }
    scrub(doc.body);
    return doc.body.innerHTML;
  }
  function safeImage(url) {
    var value = String(url || '');
    if (/^\/[A-Za-z0-9._~/-]+$/.test(value)) return value;
    if (/^https:\/\/[A-Za-z0-9.-]+\/[A-Za-z0-9._~/-]*$/.test(value)) return value;
    return '';
  }
  function $(html) { document.getElementById('app').innerHTML = html; }
  function initials(p) { return ((p.first || ' ')[0] + (p.last || ' ')[0]).toUpperCase(); }

  function shell(body) {
    var p = state.home.profile;
    var env = state.home.environment === 'testing'
      ? '<div class="banner"><p class="small">Testing environment. The people and numbers in this portal are fictional. Clinical results and treatment plans stay in Jane.</p></div>'
      : '';
    return env + '<header><div class="bar">' + wordmark('#/dashboard', 'Bloom Integrative Health') + '<nav aria-label="Portal sections">' +
      '<a href="#/dashboard" data-nav="dashboard">Insights</a>' +
      '<a href="#/results" data-nav="results">Results</a>' +
      '<a href="#/notes" data-nav="notes">Care plans</a>' +
      '<a href="#/library" data-nav="library">Library</a>' +
      '</nav><a class="me" href="#/profile" data-nav="profile" title="Your profile" aria-label="Your profile">' + esc(initials(p)) + '</a></div><div class="divider-band"></div></header><main class="wrap">' + body + '</main>' +
      team() +
      '<div class="divider-band"></div><footer><div class="mono logo-link"><img src="/assets/logo/bloom-logo-animated-hover-dark.svg" alt="Bloom Integrative Health"></div><div class="tag">Rituals That Bring You Home</div><div class="fine">' + esc(state.home.clinic) + ' · Calgary, Alberta · Health information is handled under Alberta privacy law</div></footer>' +
      '<a class="daisy-fab" href="#/daisy" data-nav="daisy" aria-label="Chat with Daisy"><span>Daisy</span></a>' +
      '<div class="reader" data-reader hidden role="dialog" aria-modal="true" aria-labelledby="reader-title"><div class="reader-bar"><button class="reader-close" type="button" data-close>Close</button></div><div class="reader-hero" data-r-img></div><div class="reader-body"><div class="sub" data-r-topic></div><h1 id="reader-title" data-r-title></h1><p class="lede" data-r-desc></p><div data-r-body></div></div></div>';
  }
  function team() {
    var rows = (state.home.team || []).map(function (t) {
      return '<div class="pressed team"><div class="team-photo" role="img" aria-label="' + esc(t.role) + '"></div><div><div class="sub">' + esc(t.role) + '</div><div class="n">' + esc(t.name || 'Your care team') + '</div></div></div>';
    }).join('');
    return '<section class="wrap" aria-label="Your care team" style="padding-bottom:90px"><div class="neo panel"><h2 style="font-size:2.2rem">Your care team</h2><div class="grid g2" style="margin-top:24px;gap:22px">' + rows + '</div></div></section>';
  }
  function janeButton(label) {
    var url = state.home.janeUrl;
    if (url) return '<a class="cta cta-solid" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(label) + '</a>';
    return '<button class="cta cta-solid" type="button" data-jane>' + esc(label) + '</button><p class="small" style="margin-top:12px">The Jane portal address is not set yet. It will be added as a placeholder in clinic settings. Nothing clinical is stored in this portal.</p>';
  }

  function dashboard() {
    var p = state.home.profile;
    var plan = (state.home.wellness || [])[0];
    var hour = new Date().getHours();
    var hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    var next = (state.home.appointments || [])[0];
    return '<section class="page" data-page="dashboard"><div class="hero"><div><div class="eyebrow">Your wellness, at a glance</div><h1 style="margin-top:22px">' + hello + ',<br><em>' + esc(p.first) + '.</em></h1><p class="lede">Wellness notes, learning and the tracking you choose to keep. Your medical record stays in Jane.</p><div class="actions"><div class="today">' + esc(new Date().toLocaleDateString('en-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })) + '</div></div></div><div class="frame" role="img" aria-label="Lilac petals"><div class="cap"><div class="t">Rituals That Bring You Home</div><div class="s">' + (next ? esc(next.label + ' · ' + next.time + ' ' + next.meridiem) : 'Your care team') + '</div></div></div></div>' +
      '<div class="grid g3"><div class="neo stat"><div class="sub">Current focus</div><div class="v">Daily rhythm</div><div class="small">From your published wellness note, when there is one</div></div><div class="neo stat"><div class="sub">Wellness note</div><div class="v">' + (plan ? esc(plan.date || 'On file') : 'None yet') + '</div><div class="small">' + (plan ? 'Approved before it was published' : 'A clinician note appears here only after NP approval') + '</div></div><div class="neo stat next"><div class="sub">Next visit</div><div class="v">' + (next ? esc(next.time + ' ' + next.meridiem) : '—') + '</div><div class="small">' + (next ? esc(next.label) : 'Nothing on today’s list') + '</div></div></div>' +
      '<div class="sec split"><div class="neo panel note"><div class="sub">Wellness · not a medical chart</div><h2>Your latest wellness note</h2>' +
      (plan ? '<p>' + esc((plan.body && plan.body.w_discussed) || '') + '</p><a class="link" href="#/notes">Read the note</a>' : '<p>When your herbalist writes a wellness note and a Nurse Practitioner approves it, it appears here. Clinical care plans are opened in Jane.</p>') +
      '</div>' + daisyMini() + '</div>' + trackingBlock() + '</section>';
  }
  function daisyMini() {
    return '<div class="neo daisy-mini" aria-label="Daisy, your wellness coach"><div class="daisy-head"><div class="daisy-face" aria-hidden="true"></div><div><div class="t">Daisy</div><div class="sub" style="margin-top:6px">General wellness only</div></div></div><div class="msgs"><div class="msg her"><b>Daily ritual</b>Water is a steady companion through a Calgary day. A glass before tea is an easy start.</div><div class="msg her"><b>A boundary</b>I can’t see your chart, your results or your care plan. Questions about a number belong with your care team.</div></div><a class="link" href="#/daisy" style="margin:0 28px 22px">Open Daisy</a></div>';
  }
  function results() {
    var cards = (state.home.ranges || []).map(function (r) {
      return '<div class="neo marker"><div class="top"><span class="name">' + esc(r.marker) + '</span><span class="pill pill-low">Education</span></div><div class="v" style="font-size:1.5rem">' + esc(r.range) + '</div><div class="ref">' + esc(r.unit) + ' · ' + esc(r.note) + '</div></div>';
    }).join('');
    return '<section class="page"><div class="page-head"><div><div class="eyebrow">Blood work</div><h1 style="margin-top:20px">Your <em>results</em></h1><p class="lede">This screen keeps its place in the portal, and it does not hold your results. Individual lab results stay in Jane until your Nurse Practitioner has reviewed them there.</p></div><div class="ring" role="img" aria-label="Results are in Jane"><div class="inner"><div><b>Jane</b><br><span>Your results</span></div></div></div></div><div class="neo jane-card">' + janeButton('View your results in Jane') + '</div><div class="sec"><div class="sec-head"><div><span class="num">i — General ranges</span><h2>Healthy ranges, for learning</h2></div><div class="small">Not your results. Not a diagnosis.</div></div><div class="grid g3">' + cards + '</div></div></section>';
  }
  function notes() {
    var plan = (state.home.wellness || [])[0];
    var wellness = plan ? '<article class="neo panel note"><div class="sub">Wellness note · v' + esc(plan.version) + ' · ' + esc(plan.date) + '</div><h2>What we talked about</h2><p>' + esc((plan.body || {}).w_discussed || '') + '</p><h3>Nutrition</h3><p>' + esc((plan.body || {}).w_nutrition || '').replace(/\n/g, '<br>') + '</p><h3>Rituals</h3><p>' + esc((plan.body || {}).w_rituals || '').replace(/\n/g, '<br>') + '</p><p class="small">Written by ' + esc(plan.author) + '. Approved by ' + esc(plan.approvedBy || 'a Nurse Practitioner') + ' before it was published. You can’t edit this note.</p></article>' : '<article class="neo panel"><p>No published wellness note yet.</p></article>';
    return '<section class="page"><div class="page-head"><div><div class="eyebrow">Care plans</div><h1 style="margin-top:20px">Your <em>plans</em></h1><p class="lede">Wellness notes live here after a Nurse Practitioner approves them. Clinical care plans, prescriptions and treatment recommendations open in Jane.</p></div></div><div class="split">' + wellness + '<article class="neo panel note"><div class="sub">Clinical care plan</div><h2>View in Jane</h2><p>Your Nurse Practitioner’s treatment recommendations are not copied into this portal. Use the secure handoff when the Jane address is configured.</p>' + janeButton('View your clinical care plan in Jane') + '</article></div></section>';
  }
  function library() {
    var posts = state.home.library || [];
    var rec = posts.filter(function (p) { return p.rec; }).map(card).join('');
    var all = posts.map(function (p) { return card(p, true); }).join('');
    return '<section class="page"><div class="page-head"><div><div class="eyebrow">Resources</div><h1 style="margin-top:20px">Your <em>library</em></h1><p class="lede">Educational guides and everyday practices. They are general information and don’t replace your care team.</p></div><div class="lib-search" role="search"><label class="sr" for="lib-q">Search the library</label><input id="lib-q" type="search" placeholder="Search the library" data-lib-search></div></div>' +
      (rec ? '<div><div class="sec-head"><div><span class="num">i — Suggested reading</span><h2>From the library</h2></div></div><div class="grid g3">' + rec + '</div></div>' : '') +
      '<div class="sec"><div class="sec-head"><div><span class="num">ii — Browse</span><h2>All resources</h2></div></div><div class="lib-grid">' + all + '</div></div></section>';
  }
  function card(p, photo) {
    var img = p.img ? '<div class="res-img" style="background-image:url(\'' + esc(p.img) + '\')"></div>' : '';
    return '<article class="neo res' + (photo ? ' res-photo' : '') + '">' + img + '<div class="res-body"><div class="res-top"><span class="pill pill-lilac">' + esc(p.topic) + '</span><span class="small">' + esc(p.time) + '</span></div><h3>' + esc(p.title) + '</h3><p class="small">' + esc(p.desc) + '</p><button class="link" type="button" data-open="' + esc(p.id) + '">Read</button></div></article>';
  }
  function profile() {
    var p = state.home.profile;
    return '<section class="page"><div class="page-head" style="justify-content:flex-start;align-items:center"><div class="avatar big-avatar" aria-hidden="true">' + esc(initials(p)) + '</div><div><div class="eyebrow">Your details</div><h1 style="margin-top:14px">' + esc(p.first) + ' <em>' + esc(p.last) + '</em></h1><div class="small" style="margin-top:14px">Client since ' + esc(p.since) + '</div></div></div><div class="grid g2"><div class="neo panel"><h2 style="font-size:2.2rem">Personal details</h2><dl style="margin-top:22px"><div><dt>Date of birth</dt><dd>' + esc(p.dob) + '</dd></div><div><dt>Alberta Health Care number</dt><dd>••••• ' + esc(p.phnLast4) + '</dd></div><div><dt>City</dt><dd>' + esc(p.city) + ', Alberta</dd></div></dl></div><div class="neo panel"><h2 style="font-size:2.2rem">Contact</h2><dl style="margin-top:22px"><div><dt>Email</dt><dd>' + esc(p.email) + '</dd></div><div><dt>Phone</dt><dd>' + esc(p.phone) + '</dd></div><div><dt>Address</dt><dd>' + esc(p.address) + '<br>' + esc(p.postal) + '</dd></div></dl><p class="small" style="margin-top:18px">To correct a detail, ask the clinic. This testing portal does not write address changes back by itself.</p></div></div>' +
      '<div class="neo panel" style="margin-top:28px"><h2 style="font-size:2rem">Security</h2><p class="small" style="margin-top:8px">A second factor is offered, not required, for clients. Staff accounts must use one.</p><div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:16px"><button class="cta cta-ghost" type="button" data-mfa>Set up an authenticator</button><a class="cta cta-ghost" href="/auth/reset.html">Change password</a><button class="cta cta-solid" type="button" data-out>Sign out</button></div></div>' +
      trackingBlock() + documentsBlock() + '</section>';
  }
  function documentsBlock() {
    var docs = state.home.documents || [];
    if (!docs.length) return '';
    return '<div class="neo panel" style="margin-top:28px"><h2 style="font-size:2rem">Documents shared with you</h2><ul class="remind">' + docs.map(function (d) {
      return '<li><div class="t">' + esc(d.name) + '</div><div class="small">Patient document · <button class="link" type="button" data-doc="' + esc(d.id) + '">Open for two minutes</button></div></li>';
    }).join('') + '</ul></div>';
  }
  function trackingBlock() {
    var rows = (state.home.tracking || []).map(function (t) {
      return '<div class="track-row"><div><strong>' + esc(labelKind(t.kind)) + '</strong><div class="small">' + esc(t.on) + ' · patient-entered</div></div><div>' + esc(t.value) + ' ' + esc(t.unit) + (t.hidden ? ' · hidden from your care team' : '') + '</div><div><button class="link" type="button" data-hide="' + esc(t.id) + '" data-hidden="' + (t.hidden ? '0' : '1') + '">' + (t.hidden ? 'Show team' : 'Hide') + '</button> <button class="link" type="button" data-del="' + esc(t.id) + '">Delete</button></div></div>';
    }).join('');
    return '<div class="sec"><div class="neo panel"><div class="sub">Patient-entered · not verified clinical data</div><h2 style="font-size:2.2rem">Your tracking</h2><p class="small">Sleep, steps, activity, heart-rate variability, heart rate, weight and other biometrics you type yourself. Bloom does not treat these as lab results or a diagnosis. You can hide an entry from your care team or delete it. Deleting removes the number and leaves only an audit note that the entry was deleted.</p>' +
      (state.home.consent ? '<form id="track" class="grid g3" style="margin-top:18px"><label>Type<select class="input" name="kind"><option value="sleep">Sleep (hours)</option><option value="steps">Steps</option><option value="activity">Activity (minutes)</option><option value="hrv">HRV (ms)</option><option value="heart_rate">Heart rate (bpm)</option><option value="weight">Weight (kg)</option><option value="biometric">Other biometric</option></select></label><label>Date<input class="input" type="date" name="on" required></label><label>Value<input class="input" name="value" inputmode="decimal" required></label><button class="cta cta-solid" type="submit">Save entry</button></form><div class="track-grid" style="margin-top:12px">' + (rows || '<p class="small">No entries yet.</p>') + '</div><button class="link" type="button" data-consent="0" style="margin-top:16px">Withdraw consent and stop new entries</button>' : '<button class="cta cta-solid" type="button" data-consent="1" style="margin-top:16px">I agree to store this tracking</button>') +
      '</div></div>';
  }
  function labelKind(k) {
    return { sleep: 'Sleep', steps: 'Steps', activity: 'Activity', hrv: 'HRV', heart_rate: 'Heart rate', weight: 'Weight', biometric: 'Biometric' }[k] || k;
  }
  function daisy() {
    return '<section class="page"><div class="page-head" style="justify-content:flex-start;align-items:center"><div class="daisy-face" style="width:110px;height:110px" aria-hidden="true"></div><div><div class="eyebrow">General wellness</div><h1 style="margin-top:14px">Daisy</h1></div></div><div class="split"><div class="neo" aria-label="Conversation with Daisy"><div class="msgs" id="daisy-log"><div class="day">Today</div><div class="msg her"><b>Hello</b>I can talk about sleep, water, plants on the plate, and how to find things in this portal. I can’t see your record, and I won’t explain a lab result.</div></div><div class="chips"><button class="chip" type="button" data-ask="Ideas for better sleep">Ideas for better sleep</button><button class="chip" type="button" data-ask="What should I ask my care team?">What should I ask my care team?</button><button class="chip" type="button" data-ask="A simple evening wind-down">A simple evening wind-down</button></div><form class="composer" id="daisy-form"><label class="sr" for="daisy-q">Message Daisy</label><input id="daisy-q" type="text" placeholder="Ask Daisy about general wellness"><button class="cta cta-solid" type="submit">Send</button><div class="disclaimer">Daisy is an automated wellness assistant. She shares general information only and can’t diagnose, treat or give medical advice. For questions about your health or your results, contact your care team. In an emergency, call 911.</div></form></div><aside class="neo panel" style="align-self:start"><div class="sub">She does not know</div><ul class="remind"><li><div class="t">Your results</div><div class="small">Those stay in Jane.</div></li><li><div class="t">Your prescriptions</div><div class="small">Ask your Nurse Practitioner.</div></li><li><div class="t">Your tracking numbers</div><div class="small">They are not sent to Daisy.</div></li></ul></aside></div></section>';
  }
  function daisyReply(text) {
    var q = text.toLowerCase();
    if (/result|ferritin|vitamin d level|lab|blood|diagnos|prescription|my number|hba1c|tsh|phn|chart/.test(q)) {
      return 'I can’t see or explain laboratory results, diagnoses or prescriptions. Please ask your care team, or open your results in Jane. If this is an emergency, call 911.';
    }
    if (/sleep|wind|evening|bed/.test(q)) {
      return 'A steady wind-down helps many people: dim lights, a caffeine-free drink, and screens away for the last hour. If sleep is often poor, tell your care team. This is general information, not a plan written for you.';
    }
    if (/water|drink|hydrat/.test(q)) {
      return 'Water is the usual drink in Canada’s food guide. Unsweetened tea and fortified soy beverage can sit beside it for many adults. If your care team set a fluid limit, follow that.';
    }
    if (/iron|food|eat|plate|plant/.test(q)) {
      return 'A plate built from vegetables, fruit, whole grains, beans, lentils and tofu is the pattern this library teaches. Pairing those foods with peppers or citrus can help iron absorption. I won’t suggest meat, dairy, eggs or fish.';
    }
    if (/visit|appoint|team|ask/.test(q)) {
      return 'Bring the questions that matter to you, including anything you noticed about sleep, energy or meals. For a result or a medicine, ask your Nurse Practitioner directly. I don’t know your appointment details beyond what this page already shows.';
    }
    return 'I can stay with general wellness: sleep, water, movement and plant-based meals. I don’t have your chart. For anything about your own health, contact your care team. In an emergency, call 911.';
  }

  function wordmark(href, label) {
    var mark = document.getElementById('bloom-home-logo');
    return '<a class="portal-home-logo" href="' + href + '" aria-label="' + label + '">' + (mark ? mark.innerHTML : '') + '</a>';
  }
  function homeLogo() {
    return wordmark('/', 'Natural Bloom Care home');
  }
  function loginScreen() {
    return '<div class="auth-screen"><div class="auth-art" role="img" aria-label="Lilac petals"><div class="cap"><div class="t">Where health takes root</div><div class="s">Bloom · Client portal</div></div></div><div><div class="neo auth-card">' + homeLogo() + '<div class="eyebrow" style="margin-top:22px">Client portal</div><h1>Welcome <em>back.</em></h1><p class="small">Sign in to your secure client portal. This environment is for testing until the clinic says otherwise.</p>' +
      (state.err ? '<div class="err" role="alert">' + esc(state.err) + '</div>' : '') +
      '<form id="login"><div class="field"><label for="email">Email</label><input class="input" id="email" type="email" autocomplete="username" required value="' + esc(state.email) + '"></div><div class="field"><label for="pass">Password</label><input class="input" id="pass" type="password" autocomplete="current-password" required></div><button class="cta cta-solid" type="submit" style="margin-top:18px">Sign in</button></form><p class="small" style="margin-top:16px"><a href="/auth/reset.html">Forgot password?</a></p><p class="small">Staff use a separate sign-in that is not linked from the public site.</p></div></div></div>';
  }
  function mfaScreen(enroll) {
    return '<div class="auth-screen"><div class="auth-art"><div class="cap"><div class="t">A second step</div><div class="s">Optional for clients</div></div></div><div><div class="neo auth-card">' + homeLogo() + '<h1 style="margin-top:22px">' + (enroll ? 'Set up an <em>authenticator.</em>' : 'Enter your <em>code.</em>') + '</h1>' +
      (enroll && state.qr ? '<img alt="Authenticator QR code" src="' + esc(state.qr) + '" style="width:180px;height:180px;margin-top:16px">' : '') +
      (state.err ? '<div class="err">' + esc(state.err) + '</div>' : '') +
      '<form id="mfa"><div class="field"><label for="code">Six-digit code</label><input class="input" id="code" inputmode="numeric" autocomplete="one-time-code" required></div><button class="cta cta-solid" type="submit" style="margin-top:16px">Continue</button></form>' +
      '' +
      '</div></div></div>';
  }

  async function boot() {
    var session = (await sb.auth.getSession()).data.session;
    if (!session) { state.step = 'login'; $(loginScreen()); return; }
    var role = session.user.app_metadata && session.user.app_metadata.portal_role;
    if (role && role !== 'client') {
      await sb.auth.signOut();
      state.err = 'That account is a staff account. Use the staff sign-in.';
      $(loginScreen());
      return;
    }
    var aal = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal.data && aal.data.nextLevel === 'aal2' && aal.data.currentLevel !== 'aal2') {
      state.step = 'mfa';
      $(mfaScreen(false));
      return;
    }
    await enter();
  }
  async function enter() {
    await sb.rpc('touch_session');
    var res = await sb.rpc('client_home');
    if (res.error) { state.err = res.error.message; $(loginScreen()); return; }
    state.home = res.data;
    state.last = Date.now();
    startIdle();
    show();
  }
  function startIdle() {
    clearInterval(state.idle);
    var mins = (state.home && state.home.idleMinutes) || 15;
    ['pointerdown', 'keydown'].forEach(function (ev) {
      window.addEventListener(ev, function () { state.last = Date.now(); }, { passive: true });
    });
    state.idle = setInterval(function () {
      if (Date.now() - state.last > mins * 60000) signOut('Signed out after ' + mins + ' minutes of inactivity.');
    }, 15000);
  }
  async function signOut(message) {
    clearInterval(state.idle);
    await sb.auth.signOut();
    state.home = null;
    state.step = 'login';
    state.err = message || '';
    location.hash = '';
    $(loginScreen());
  }
  function show() {
    var slug = (location.hash.match(/^#\/(\w+)/) || [])[1] || 'dashboard';
    var page = { dashboard: dashboard, results: results, notes: notes, library: library, profile: profile, daisy: daisy }[slug] || dashboard;
    $(shell(page()));
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      var on = a.getAttribute('data-nav') === slug;
      a.classList.toggle('active', on);
    });
    window.scrollTo(0, 0);
  }

  document.addEventListener('submit', function (e) {
    if (e.target.id === 'login') {
      e.preventDefault();
      state.email = document.getElementById('email').value.trim();
      sb.auth.signInWithPassword({ email: state.email, password: document.getElementById('pass').value }).then(function (r) {
        if (r.error) { state.err = signInMessage(r.error, 'That email and password do not match.'); $(loginScreen()); return; }
        boot();
      });
    }
    if (e.target.id === 'mfa') {
      e.preventDefault();
      var code = document.getElementById('code').value.trim();
      var run = state.factorId
        ? Promise.resolve({ data: { totp: [{ id: state.factorId }] }, error: null })
        : sb.auth.mfa.listFactors();
      run.then(function (factors) {
        var id = state.factorId || (factors.data.totp[0] && factors.data.totp[0].id);
        return sb.auth.mfa.challenge({ factorId: id }).then(function (ch) {
          return sb.auth.mfa.verify({ factorId: id, challengeId: ch.data.id, code: code });
        });
      }).then(function (v) {
        if (v.error) { state.err = v.error.message; $(mfaScreen(!!state.qr)); return; }
        state.factorId = ''; state.qr = '';
        enter();
      });
    }
    if (e.target.id === 'daisy-form') {
      e.preventDefault();
      var input = document.getElementById('daisy-q');
      var text = input.value.trim();
      if (!text) return;
      var log = document.getElementById('daisy-log');
      log.insertAdjacentHTML('beforeend', '<div class="msg you">' + esc(text) + '</div><div class="msg her">' + esc(daisyReply(text)) + '</div>');
      input.value = '';
    }
    if (e.target.id === 'track') {
      e.preventDefault();
      var fd = new FormData(e.target);
      var kind = fd.get('kind');
      var unit = { sleep: 'h', steps: 'steps', activity: 'min', hrv: 'ms', heart_rate: 'bpm', weight: 'kg', biometric: '' }[kind] || '';
      sb.rpc('save_tracking_entry', { p_kind: kind, p_on: fd.get('on'), p_value: Number(fd.get('value')), p_unit: unit, p_note: '' }).then(function (r) {
        if (r.error) { alert(r.error.message); return; }
        enter();
      });
    }
  });
  document.addEventListener('click', function (e) {
    var open = e.target.closest('[data-open]');
    if (open) {
      var post = (state.home.library || []).filter(function (p) { return p.id === open.getAttribute('data-open'); })[0];
      if (!post) return;
      var reader = document.querySelector('[data-reader]');
      reader.querySelector('[data-r-title]').textContent = post.title;
      reader.querySelector('[data-r-topic]').textContent = post.topic;
      reader.querySelector('[data-r-desc]').textContent = post.desc;
      reader.querySelector('[data-r-body]').innerHTML = sanitizeHtml(post.body);
      var hero = reader.querySelector('[data-r-img]');
      var img = safeImage(post.img);
      hero.style.backgroundImage = img ? "url('" + img + "')" : '';
      reader.hidden = false;
    }
    if (e.target.closest('[data-close]')) {
      var reader = document.querySelector('[data-reader]');
      if (reader) reader.hidden = true;
    }
    if (e.target.closest('[data-out]')) signOut('');
    if (e.target.closest('[data-jane]')) alert('The Jane portal address is still a placeholder. Your results and clinical care plan are not stored here.');
    var ask = e.target.closest('[data-ask]');
    if (ask) {
      document.getElementById('daisy-q').value = ask.getAttribute('data-ask');
      document.getElementById('daisy-form').requestSubmit();
    }
    if (e.target.id === 'skip') return;
    var consent = e.target.closest('[data-consent]');
    if (consent) sb.rpc('set_tracking_consent', { p_granted: consent.getAttribute('data-consent') === '1' }).then(enter);
    var hide = e.target.closest('[data-hide]');
    if (hide) sb.rpc('hide_tracking_entry', { p_id: hide.getAttribute('data-hide'), p_hidden: hide.getAttribute('data-hidden') === '1' }).then(enter);
    var del = e.target.closest('[data-del]');
    if (del && confirm('Delete this entry? The number is removed. An audit note remains that you deleted it.')) {
      sb.rpc('delete_tracking_entry', { p_id: del.getAttribute('data-del') }).then(enter);
    }
    var doc = e.target.closest('[data-doc]');
    if (doc) {
      sb.auth.getSession().then(function (s) {
        return fetch(cfg.url + '/functions/v1/document-url', {
          method: 'POST',
          headers: { 'content-type': 'application/json', apikey: cfg.publishableKey, Authorization: 'Bearer ' + s.data.session.access_token },
          body: JSON.stringify({ documentId: doc.getAttribute('data-doc') })
        });
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (j.url) location.href = j.url;
        else alert(j.message || 'The document could not be opened.');
      });
    }
    var mfa = e.target.closest('[data-mfa]');
    if (mfa) {
      sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Bloom client' }).then(function (r) {
        if (r.error) { alert(r.error.message); return; }
        state.factorId = r.data.id;
        state.qr = r.data.totp.qr_code;
        state.step = 'enroll';
        $(mfaScreen(true));
      });
    }
  });
  window.addEventListener('hashchange', function () { if (state.home) show(); });
  boot();
})();

(function(){
'use strict';

/* =====================================================================
   BLOOM STAFF PORTAL · Phase 1 prototype
   Module map (each block maps to a production module):
     1. icons            → ui/icons
     2. permission model → server/auth/permissions (source of truth)
     3. seed data        → fictional development fixtures only
     4. store            → prototype persistence (browser only, NOT secure storage)
     5. api              → server/api (every read/write re-checks permission)
     6. audit            → server/audit (append-only)
     7. session          → server/auth/session (MFA, idle expiry)
     8. router + guard   → server route guards + client routing
     9. components       → ui/components (shared)
    10. pages            → ui/portals/{owner,admin,holistic,medical}
   ===================================================================== */

/* ---------- 1. icons ---------- */
const P = {
  moon:'<path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10z"/>',
  wind:'<path d="M3 9h11a3 3 0 1 0-3-3"/><path d="M3 13h15a3 3 0 1 1-3 3"/><path d="M3 17h7"/>',
  walk:'<circle cx="13.5" cy="4.5" r="1.8"/><path d="M10 21l2.4-6.4 2.6 2.4v4"/><path d="M8 11.5l3-3.5 3 1.6 2 3"/><path d="M12.4 14.6L11 8"/>',
  droplet:'<path d="M12 3.5c3.2 4 5.5 7.1 5.5 10a5.5 5.5 0 0 1-11 0c0-2.9 2.3-6 5.5-10z"/><path d="M9.5 14a2.5 2.5 0 0 0 2.5 2.5"/>',
  pill:'<rect x="3.2" y="8.6" width="17.6" height="6.8" rx="3.4" transform="rotate(-38 12 12)"/><path d="M9.7 8.2l4.6 7.6"/>',
  cup:'<path d="M5 9.5h11v4.5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 11h1.5a2.4 2.4 0 0 1 0 4.8H16"/><path d="M8.5 3.5c-.8 1 .8 2 0 3.2M12 3.5c-.8 1 .8 2 0 3.2"/>',
  bowl:'<path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0z"/><path d="M9 20h6"/><path d="M14.5 11.5c0-3 1.5-5.5 4.5-6.5"/><path d="M9.5 11.5c-.6-2 .4-3.6 2-4.2"/>',
  leaf:'<path d="M5 19c0-8 5-13.5 14.5-14.5C19 14 13 19 5 19z"/><path d="M5 19l8.5-8.5"/>',
  chat:'<path d="M4.5 5.5h15A1.5 1.5 0 0 1 21 7v8.5a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 3.5V17h-1A1.5 1.5 0 0 1 3 15.5V7a1.5 1.5 0 0 1 1.5-1.5z"/>',
  pen:'<path d="M15.5 4.5l4 4L8.5 19.5h-4v-4z"/><path d="M13.5 6.5l4 4"/>',
  heart:'<path d="M12 19.5s-7.5-4.6-7.5-10A4 4 0 0 1 12 7.2a4 4 0 0 1 7.5 2.3c0 5.4-7.5 10-7.5 10z"/>',
  inbox:'<path d="M3.5 13.5l2.4-6.6A2.2 2.2 0 0 1 8 5.5h8a2.2 2.2 0 0 1 2.1 1.4l2.4 6.6V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/><path d="M3.5 13.5h4.6l1.4 2.2h5l1.4-2.2h4.6"/>',
  sun:'<circle cx="12" cy="12" r="3.8"/><path d="M12 3v1.8M12 19.2V21M3 12h1.8M19.2 12H21M5.6 5.6l1.3 1.3M17.1 17.1l1.3 1.3M5.6 18.4l1.3-1.3M17.1 6.9l1.3-1.3"/>',
  cloud:'<path d="M7.2 18h9.6a3.7 3.7 0 0 0 .5-7.37 5.2 5.2 0 0 0-10-.9A4.2 4.2 0 0 0 7.2 18z"/>',
  rain:'<path d="M7.2 15h9.6a3.4 3.4 0 0 0 .5-6.77 4.8 4.8 0 0 0-9.3-.8A3.9 3.9 0 0 0 7.2 15z"/><path d="M9 18l-.8 2M12.5 18l-.8 2M16 18l-.8 2"/>',
  snow:'<path d="M7.2 15h9.6a3.4 3.4 0 0 0 .5-6.77 4.8 4.8 0 0 0-9.3-.8A3.9 3.9 0 0 0 7.2 15z"/><path d="M9 18.5h.01M12.5 18.5h.01M16 18.5h.01M10.7 21h.01M14.3 21h.01"/>',
  overview:'<rect x="3.5" y="3.5" width="7" height="8" rx="2"/><rect x="13.5" y="3.5" width="7" height="5" rx="2"/><rect x="13.5" y="11.5" width="7" height="9" rx="2"/><rect x="3.5" y="14.5" width="7" height="6" rx="2"/>',
  patients:'<circle cx="9" cy="8" r="3.4"/><path d="M3 19.5c.9-3.3 3.3-5 6-5s5.1 1.7 6 5"/><circle cx="17" cy="9" r="2.4"/><path d="M16.2 14.2c2.3.1 4 1.5 4.8 4.3"/>',
  team:'<circle cx="12" cy="7.5" r="3.2"/><path d="M5.5 20c1-3.6 3.6-5.6 6.5-5.6s5.5 2 6.5 5.6"/><path d="M4 9.5l1.4 1.4L8 8.3" /><path d="M16 9.5l1.4 1.4L20 8.3"/>',
  operations:'<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
  reports:'<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
  documents:'<path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10.5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z"/><path d="M14 3.5V8h4M9 12h6M9 15.5h6"/>',
  portal:'<rect x="3.5" y="4.5" width="17" height="13" rx="2.5"/><path d="M8 20.5h8M12 17.5v3"/><path d="M12 8.2c-1.4 1.6-1.2 3.6 0 5 1.2-1.4 1.4-3.4 0-5z"/>',
  settings:'<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  audit:'<path d="M12 3.5l7 2.6v5.4c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6.1z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
  flask:'<path d="M9.5 3.5h5M10.5 3.5v6L5.2 18.6a1.3 1.3 0 0 0 1.1 1.9h11.4a1.3 1.3 0 0 0 1.1-1.9L13.5 9.5v-6"/><path d="M7.8 14.5h8.4"/>',
  tasks:'<path d="M9 6.5h11M9 12h11M9 17.5h11"/><path d="M3.8 6.4l1.2 1.2 2-2.2M3.8 11.9l1.2 1.2 2-2.2M3.8 17.4l1.2 1.2 2-2.2"/>',
  forms:'<rect x="4.5" y="3.5" width="15" height="17" rx="2"/><path d="M8 8h8M8 11.5h8M8 15h4.5"/><path d="M15.5 15.5l1.2 1.2 2.3-2.4"/>',
  results:'<path d="M3.5 12h3.2l2-5 3.4 10 2.3-6 1.3 1h4.8"/>',
  careplans:'<path d="M12 20.4c.3-2.4-.2-4.8 0-7.8"/><path d="M12 12.6c-1.8-2-1.6-6.1 1-9.1 1.6 3.2.9 7-1 9.1z"/><path d="M11.9 14c-2.5 0-5.6-2.2-6.6-6 3.1.2 6 2.3 6.6 6z"/><path d="M12.05 14.6c2.15-2.4 4.65-3.5 7.55-3.4-.9 2.8-4.1 4.1-7.55 3.4z"/>',
  profile:'<circle cx="12" cy="8.5" r="3.6"/><path d="M4.8 20c1.3-3.6 4-5.4 7.2-5.4s5.9 1.8 7.2 5.4"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  lock:'<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  logout:'<path d="M14 4.5H6.5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1H14"/><path d="M10.5 12h10M17 8.5l3.5 3.5-3.5 3.5"/>',
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  close:'<path d="M6 6l12 12M18 6L6 18"/>',
  menu:'<path d="M4 7h16M4 12h16M4 17h10"/>',
  info:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.4"/>',
  alert:'<path d="M12 4l9 15.5H3z"/><path d="M12 10v4.5M12 17v.3"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  eye:'<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  upload:'<path d="M12 16V4.5M7.5 9L12 4.5 16.5 9"/><path d="M4.5 15v4a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-4"/>',
  link:'<path d="M10 14a4 4 0 0 0 5.6 0l3-3a4 4 0 0 0-5.6-5.6l-1 1"/><path d="M14 10a4 4 0 0 0-5.6 0l-3 3a4 4 0 0 0 5.6 5.6l1-1"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  hub:'<path d="M4 10.5v3a1 1 0 0 0 1 1h2l5 4V5.5l-5 4H5a1 1 0 0 0-1 1z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
  download:'<path d="M12 4.5V15.5M7.5 11L12 15.5 16.5 11"/><path d="M4.5 15v4a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-4"/>',
  calendar:'<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'
};
function icon(n, s){ s = s || 18; return '<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(P[n]||'')+'</svg>'; }
function esc(v){ return String(v==null?'':v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ---------- 2. permission model (source of truth) ---------- */
const ROLE_LABEL = { owner:'Owner', admin:'Administration', holistic:'Holistic Practitioner', medical:'Medical Practitioner' };
const PRAC_ROLES = ['holistic','medical'];
const isPrac = u => PRAC_ROLES.includes(u.role);
const PORTAL_LABEL = { owner:'Owner portal', admin:'Administration portal', holistic:'Holistic practitioner portal', medical:'Medical practitioner portal' };

// clinical: needs verified clinical credentials · np: needs a verified NP registration
const PERMISSIONS = {
  'patients.directory':   { label:'Patient directory (demographics)', group:'Patients' },
  'patients.edit':        { label:'Edit patient demographics', group:'Patients' },
  'patients.reveal_ahc':  { label:'Reveal full Alberta Health Care number', group:'Patients' },
  'patients.assigned':    { label:'Assigned patients (care relationship)', group:'Patients' },
  'requisitions.prepare': { label:'Prepare standard lab requisitions', group:'Requisitions' },
  'tasks.admin':          { label:'Administrative task queue', group:'Operations' },
  'documents.delivery':   { label:'Document delivery queue', group:'Operations' },
  'operations.view':      { label:'Operations overview', group:'Operations' },
  'reports.view':         { label:'Reports', group:'Business' },
  'finance.view':         { label:'Financial reporting', group:'Business' },
  'team.manage':          { label:'Invite, deactivate and configure staff', group:'Business' },
  'templates.manage':     { label:'Manage official document templates', group:'Business' },
  'portal.manage':        { label:'Client portal publishing settings', group:'Business' },
  'settings.owner':       { label:'Owner-only settings and integrations', group:'Business' },
  'audit.view':           { label:'Audit history', group:'Business' },
  'clinical.view':        { label:'Clinical records of assigned patients', group:'Clinical', clinical:true },
  'forms.generate':       { label:'Generate clinical documents', group:'Clinical', clinical:true, np:true },
  'requisitions.authorize':{ label:'Authorize requisitions', group:'Clinical', clinical:true, np:true },
  'results.enter':        { label:'Enter lab results', group:'Clinical', clinical:true, np:true },
  'results.publish':      { label:'Publish lab results to the client portal', group:'Clinical', clinical:true, np:true },
  'careplans.write':      { label:'Write care plans', group:'Clinical', clinical:true },
  'careplans.publish':    { label:'Publish care plans to the client portal', group:'Clinical', clinical:true, np:true },
  'tasks.clinical':       { label:'Clinical task list', group:'Clinical', clinical:true },
  'tasks.personal':       { label:'Tasks and notes between staff', group:'Account' },
  'hub.view':             { label:'Team dashboard, time off and own activity', group:'Account' },
  'hub.manage':           { label:'Post to the team dashboard, approve time off', group:'Business' },
  'profile.self':         { label:'Own profile and security settings', group:'Account' }
};
// Role scope = everything a role may ever hold. Per-user settings can only switch these off and on again.
const ROLE_SCOPE = {
  owner:['patients.directory','operations.view','reports.view','finance.view','team.manage','templates.manage','portal.manage','settings.owner','audit.view','tasks.personal','hub.view','hub.manage','profile.self'],
  admin:['patients.directory','patients.edit','patients.reveal_ahc','requisitions.prepare','tasks.admin','documents.delivery','tasks.personal','hub.view','profile.self'],
  holistic:['patients.assigned','clinical.view','careplans.write','tasks.clinical','tasks.personal','hub.view','profile.self'],
  medical:['patients.assigned','clinical.view','forms.generate','requisitions.authorize','results.enter','results.publish','careplans.write','careplans.publish','tasks.clinical','tasks.personal','hub.view','profile.self']
};
function eligibility(u, p){
  const d = PERMISSIONS[p];
  if(!ROLE_SCOPE[u.role].includes(p)) return { ok:false, why:'Not part of the '+ROLE_LABEL[u.role]+' role' };
  if(d.clinical && !(u.cred && u.cred.verified)) return { ok:false, why:'Requires verified clinical credentials' };
  if(d.np && !(u.cred && u.cred.type==='NP' && u.cred.verified)) return { ok:false, why:'Requires a verified Nurse Practitioner registration' };
  return { ok:true };
}
function effectivePerms(u){
  if(!u || u.status!=='active') return new Set();
  const out = new Set();
  ROLE_SCOPE[u.role].forEach(p => { if(!(u.revoked||[]).includes(p) && eligibility(u,p).ok) out.add(p); });
  return out;
}
function can(u, p){ return effectivePerms(u).has(p); }

/* ---------- 3. seed data (fictional) ---------- */
const CLINIC = { name:'Bloom', legal:'Natural Bloom Care Inc.', tagline:'Integrative virtual clinic', address:'TODO: street address, Calgary, Alberta', phone:'TODO: clinic phone', fax:'TODO: clinic fax', email:'hello@naturalbloom.ca', privacy:'TODO: Privacy Officer name', janeUrl:'' };
const SEED_STAFF = [];
let PATIENTS = [];
let APPTS = [];
const REQ_STATUSES = ['Draft','Awaiting Authorization','Authorized','Ready to Send','Sent','Failed','Cancelled'];
const SEED_REQS = [];
const SEED_TASKS = [];
const SEED_CTASKS = [];
let PANELS = [];
let PLANS = [];
const TEMPLATE_CATS = ['Laboratory Requisitions','Imaging Requisitions','Specialist Referrals','Diagnostic Testing','Medical Forms','Other Clinical Documents'];
const SEED_TEMPLATES = [];
const SEED_LIBRARY = [];
let DELIVERIES = [];
// HIA s. 41: disclosures of diagnostic, treatment and care information to someone other than the patient
const SEED_DISCLOSURES = [];
const WEEKS = [ ['30 Aug',41],['6 Sep',44],['13 Sep',47],['20 Sep',45],['27 Sep',52],['4 Oct',49],['11 Oct',55],['18 Oct',58] ];
const MONTHS = [ ['May',18],['Jun',21],['Jul',19],['Aug',24],['Sep',22],['Oct',26] ];
const VISIT_MIX = [ ['Medical · 30 min',96],['Integrated · 60 min',71],['Wellness · 30 min',45] ];

/* ---------- 4. store (prototype persistence) ---------- */
const KEY = 'bloom-staff-proto-v5';
function freshState(){
  return { staff: JSON.parse(JSON.stringify(SEED_STAFF)), reqs: JSON.parse(JSON.stringify(SEED_REQS)), tasks: JSON.parse(JSON.stringify(SEED_TASKS)),
    ctasks: JSON.parse(JSON.stringify(SEED_CTASKS)), templates: JSON.parse(JSON.stringify(SEED_TEMPLATES)), library: JSON.parse(JSON.stringify(SEED_LIBRARY)),
    jane: {}, timeout: 15, clinic: Object.assign({}, CLINIC), audit: seedAudit(), incidents: [], compliance: {}, deliv: {}, disclosures: JSON.parse(JSON.stringify(SEED_DISCLOSURES)), notes: seedNotes(), hub: seedHub(), vac: seedVac() };
}
function seedAudit(){ return []; }
let S = freshState();
S.incidents = S.incidents || []; S.compliance = S.compliance || {}; S.deliv = S.deliv || {}; S.disclosures = S.disclosures || [];
function save(){ if(window.BloomSync) BloomSync.schedule(); }
/* ---------- 4b. live sync ----------
   When the portal is opened as a shared Bloom artifact, every open copy shares one store:
   tasks, posts, time off, requisitions, staff changes and the audit history update for
   everyone as they happen, and the owner sees who is really signed in. Without the shared
   store (a downloaded copy, for example) the portal works on this device only. */
const LIVE_KEYS = ['plantPhotos','staff','reqs','tasks','ctasks','templates','library','jane','timeout','clinic','incidents','compliance','deliv','disclosures','hub','vac','planMeta','drafts','newPlans','newDays'];
const TAB_ID = (() => { let t = ''; try { t = sessionStorage.getItem('bloom-tab') || ''; } catch(e){} if(!t){ t = 'tab-'+Date.now().toString(36)+Math.random().toString(36).slice(2,8); try { sessionStorage.setItem('bloom-tab', t); } catch(e){} } return t; })();
const LIVE = { db:null, room:null, on:false, ready:false, readonly:false, seen:{}, noteSeen:{}, myAudit:[], auditSent:0, snap:{}, writing:false, again:false, timer:null, quiet:false, pending:false, peers:{}, online:0, warned:false };
function liveSoon(){ if(!LIVE.ready || LIVE.readonly) return; clearTimeout(LIVE.timer); LIVE.timer = setTimeout(liveWrite, 0); }
function liveAudit(e){ if(e) LIVE.myAudit.push(e); if(LIVE.myAudit.length > 400) { const cut = LIVE.myAudit.length-300; LIVE.myAudit = LIVE.myAudit.slice(cut); LIVE.auditSent = Math.max(0, LIVE.auditSent-cut); } }
async function liveWrite(){
  if(!LIVE.ready || LIVE.readonly) return;
  if(LIVE.writing){ LIVE.again = true; return; }
  LIVE.writing = true;
  const by = session ? session.uid : '';
  try {
    for(const k of LIVE_KEYS){
      if(S[k]===undefined) continue;
      const j = JSON.stringify(S[k]);
      if(j !== LIVE.seen[k]){ LIVE.seen[k] = j; await LIVE.db.doc('live/'+k).set({ v:JSON.parse(j), by, at:Date.now() }); }
    }
    for(const n of S.notes){
      const j = JSON.stringify(n);
      if(j !== LIVE.noteSeen[n.id]){ LIVE.noteSeen[n.id] = j; await LIVE.db.doc('notes/'+n.id).set({ v:JSON.parse(j), at:Date.now() }); }
    }
    if(LIVE.myAudit.length !== LIVE.auditSent){ const n = LIVE.myAudit.length; await LIVE.db.doc('audit/'+TAB_ID).set({ list:LIVE.myAudit.slice(-300), at:Date.now() }); LIVE.auditSent = n; }
  } catch(e){
    if(e && e.code==='invalid_argument'){ LIVE.readonly = true; toast('You can view the shared portal, but your changes stay on this device. Ask the owner for edit access.'); }
    else if(e && e.code==='quota_exceeded'){ if(!LIVE.warned){ LIVE.warned = true; toast('The shared portal is full, so this change was not shared. The owner can reset the demo data in Settings.'); } }
    else if(!LIVE.warned){ LIVE.warned = true; toast('A change could not be shared just now. It will be sent with your next change.'); LIVE.seen = {}; LIVE.noteSeen = {}; }
  } finally {
    LIVE.writing = false;
    if(LIVE.again){ LIVE.again = false; liveSoon(); }
  }
}
function liveApplyKeys(docs, first){
  let changed = false; const have = {};
  docs.forEach(d => { const k = d.id; if(!LIVE_KEYS.includes(k)) return; have[k] = true; const b = d.data(); if(!b) return; const j = JSON.stringify(b.v); if(j !== LIVE.seen[k]){ LIVE.seen[k] = j; S[k] = JSON.parse(j); changed = true; } });
  if(first){ const f = freshState(); LIVE_KEYS.forEach(k => { if(!have[k]){ if(f[k]===undefined) delete S[k]; else S[k] = f[k]; LIVE.seen[k] = S[k]===undefined ? undefined : JSON.stringify(S[k]); changed = true; } }); }
  return changed;
}
function liveApplyNotes(docs){
  const remote = {}; let changed = false;
  docs.forEach(d => { const b = d.data(); if(!b || !b.v) return; const j = JSON.stringify(b.v); remote[d.id] = j; if(j !== LIVE.noteSeen[d.id]){ LIVE.noteSeen[d.id] = j; changed = true; } });
  const local = S.notes.filter(n => !(n.id in remote) && LIVE.noteSeen[n.id]===undefined); // created here, not sent yet
  const before = S.notes.length;
  S.notes = Object.keys(remote).map(id => JSON.parse(remote[id])).concat(local);
  return changed || S.notes.length !== before;
}
function liveApplyAudit(docs){
  const all = [];
  docs.forEach(d => { const b = d.data(); if(b && Array.isArray(b.list) && d.id!==TAB_ID) b.list.forEach(x => all.push(x)); });
  LIVE.myAudit.forEach(x => all.push(x));
  all.sort((a,b) => String(a.t).localeCompare(String(b.t)));
  const j = JSON.stringify(all.slice(-600));
  if(j === LIVE.auditJson) return false;
  LIVE.auditJson = j; S.audit = JSON.parse(j); return true;
}
function liveSnap(name, s){
  LIVE.snap[name] = s;
  if(!LIVE.ready){
    if(s.metadata && s.metadata.fromCache) return;
    LIVE.got = LIVE.got || {}; LIVE.got[name] = true;
    if(!(LIVE.got.live && LIVE.got.notes && LIVE.got.audit)) return;
    LIVE.ready = true;
    if(LIVE.snap.live.empty){ // first copy ever opened: share this copy's data
      LIVE.myAudit = S.audit.slice(); LIVE.auditSent = 0; LIVE.seen = {}; LIVE.noteSeen = {};
      liveWrite(); liveBadge(); return;
    }
    const own = LIVE.snap.audit.docs.find(d => d.id===TAB_ID), ol = own && own.data() && Array.isArray(own.data().list) ? own.data().list.slice() : [];
    LIVE.myAudit = ol.concat(LIVE.myAudit.filter(x => !ol.some(y => y.t===x.t && y.action===x.action))); LIVE.auditSent = ol.length;
    liveApplyKeys(LIVE.snap.live.docs, true); liveApplyNotes(LIVE.snap.notes.docs); liveApplyAudit(LIVE.snap.audit.docs);
    /* workspace is stored in Supabase, not in the browser */
    liveRefresh(); liveBadge(); liveSoon(); return;
  }
  let ch = false;
  if(name==='live') ch = liveApplyKeys(s.docs, false);
  else if(name==='notes') ch = liveApplyNotes(s.docs);
  else ch = liveApplyAudit(s.docs);
  if(ch){ liveRefresh(); }
}
function editing(){ const a = document.activeElement; return a && a.closest && a.closest('#app') && a.matches('input:not([type=checkbox]):not([type=radio]),textarea,select,[contenteditable]'); }
function liveRefresh(){
  if(!session) return;
  const u = me();
  if(!u || u.status!=='active'){ signOut('Your account is no longer active'); return; }
  if(editing()){ LIVE.pending = true; return; }
  LIVE.pending = false;
  const y = window.scrollY; LIVE.quiet = true;
  try { render(); } finally { LIVE.quiet = false; }
  window.scrollTo(0, y);
}
document.addEventListener('focusout', () => setTimeout(() => { if(LIVE.pending && !editing()) liveRefresh(); }, 60));
function liveError(e){ /* a subscription stopped; this copy keeps working on its own */ if(e && e.code==='revoked'){ LIVE.on = false; LIVE.ready = false; liveBadge(); } }
function deviceLabel(){ const ua = navigator.userAgent; const b = /Edg\//.test(ua)?'Edge':/Chrome\//.test(ua)?'Chrome':/Safari\//.test(ua)?'Safari':/Firefox\//.test(ua)?'Firefox':'Browser'; const o = /iPhone/.test(ua)?'iPhone':/iPad/.test(ua)?'iPad':/Android/.test(ua)?'Android':/Mac OS X/.test(ua)?'macOS':/Windows/.test(ua)?'Windows':'Other'; return b+' · '+o; }
let presAt = 0;
function livePresence(force){
  if(!LIVE.room) return;
  if(!force && Date.now()-presAt < 20000) return;
  presAt = Date.now();
  const x = session && SESS[session.uid];
  LIVE.room.presence(session && x ? { uid:session.uid, area:String(x.area||'').slice(0,90), start:x.start, last:session.last, device:deviceLabel() } : { uid:null, area:null, start:null, last:null, device:null }).catch(() => {});
}
function liveMergePeers(peers){
  // simulated sessions give way to real ones once the shared room is live
  Object.keys(SESS).forEach(id => { if(SESS[id].sim || SESS[id].remote) delete SESS[id]; });
  let online = 0;
  peers.forEach(p => {
    online++;
    if(p.isMe && p.sameTab) return;
    const pr = p.presence || {};
    if(typeof pr.uid !== 'string' || !byId(pr.uid)) return;
    if(session && pr.uid===session.uid) return;
    const prev = SESS[pr.uid];
    const last = Math.min(Number(pr.last)||Date.now(), Date.now());
    if(!prev || last > prev.last) SESS[pr.uid] = { start:Number(pr.start)||last, last, area:String(pr.area||'Signed in').slice(0,90), device:String(pr.device||'Another device').slice(0,60), sim:false, remote:true };
  });
  LIVE.online = online; liveBadge();
  const a = document.getElementById('live-sessions'); if(a) a.innerHTML = liveSessionsTable();
  const b = document.getElementById('live-mini'); if(b) b.innerHTML = liveMini();
}
function liveBadge(){
  const el = document.getElementById('live-pill'); if(!el) return;
  el.innerHTML = LIVE.ready ? ' · <b>Live</b>'+(LIVE.online>1?' · '+LIVE.online+' open now':'')+(LIVE.readonly?' · view only':'') : '';
}
function liveEndSession(uid){ if(LIVE.room) LIVE.room.emit('staff-session', { uid, at:Date.now() }).catch(() => {}); }
async function liveReset(){
  if(!LIVE.ready || LIVE.readonly) return;
  try {
    const [n, a] = await Promise.all([LIVE.db.collection('notes').get(), LIVE.db.collection('audit').get()]);
    const keep = new Set(S.notes.map(x => x.id));
    for(const d of n.docs) if(!keep.has(d.id)) await LIVE.db.doc('notes/'+d.id).delete();
    for(const d of a.docs) if(d.id!==TAB_ID) await LIVE.db.doc('audit/'+d.id).delete();
  } catch(e){}
  LIVE.myAudit = S.audit.slice(); LIVE.auditSent = -1; LIVE.seen = {}; LIVE.noteSeen = {}; liveWrite();
}
async function liveBoot(){ /* Supabase is the shared store. */ }


const byId = id => S.staff.find(s => s.id===id);
const patient = id => PATIENTS.find(p => p.id===id);
const fullName = u => u ? u.first+' '+u.last : '—';
const initials = u => (u.first[0]+u.last[0]).toUpperCase();
const pName = p => p ? p.first+' '+p.last : '—';
const careTeam = p => [p.np, p.hns];

/* ---------- 5. api: every call re-checks permission ---------- */
class Denied extends Error {}
function require_(u, perm, what){ if(!can(u, perm)){ audit(u, 'Request denied', what, false); throw new Denied(what); } }
const WISHES = { 'medical-only':'Share results and clinical notes with Medical Practitioners only' };
function joinedISO(p){ return isoDay(-(p.joinedDays||365)); }
function patientStatus(p){ if(p.status==='Inactive') return 'Inactive'; const d = Math.round((Date.now() - new Date(joinedISO(p)+'T12:00:00'))/86400000); return d < (S.newDays||30) ? 'New' : 'Active'; }
function newUntil(p){ const d = new Date(joinedISO(p)+'T12:00:00'); d.setDate(d.getDate()+(S.newDays||30)); return d.toLocaleDateString('en-CA',{day:'numeric',month:'long',year:'numeric'}); }
function projectPatient(p, u){
  const o = { id:p.id, first:p.first, last:p.last, pref:p.pref, dob:p.dob, email:p.email, phone:p.phone, addr:p.addr, city:p.city, status:patientStatus(p), np:p.np, hns:p.hns, jane:p.jane, since:p.since==='joined' ? new Date(joinedISO(p)+'T12:00:00').toLocaleDateString('en-CA',{month:'short',year:'numeric'}) : p.since,
    janeState: S.jane[p.id] || p.janeState, ahcMasked: '••••• ' + p.ahc.slice(-4), wish:p.wish||'' };
  // Least amount necessary (HIA s. 58): the owner does not provide care, so contact details, birth date and health number stay hidden
  if(u.role==='owner'){ delete o.dob; delete o.email; delete o.phone; delete o.addr; delete o.ahcMasked; }
  const allowed = can(u,'clinical.view') && careTeam(p).includes(u.id) && !(p.wish==='medical-only' && u.role!=='medical');
  if(allowed) o.clin = p.clin;   // clinical data only inside a care relationship, respecting the patient's expressed wishes
  return o;
}
const api = {
  patients(u){
    if(can(u,'patients.directory')) return PATIENTS.map(p => projectPatient(p,u));
    if(can(u,'patients.assigned')) return PATIENTS.filter(p => careTeam(p).includes(u.id)).map(p => projectPatient(p,u));
    require_(u, 'patients.directory', 'Patient list'); return [];
  },
  patient(u, id){
    const p = patient(id); if(!p) return null;
    const ok = can(u,'patients.directory') || (can(u,'patients.assigned') && careTeam(p).includes(u.id));
    if(!ok){ audit(u,'Request denied','Patient record',false,{ pid:id, info:'Demographics' }); throw new Denied('Patient record'); }
    const o = projectPatient(p,u);
    audit(u,'Viewed record','Patient profile',true,{ pid:id, info:o.clin?'Demographics, clinical summary':'Demographics' });
    return o;
  },
  revealAhc(u, id, reason){ require_(u,'patients.reveal_ahc','Full health care number '+id); audit(u,'Revealed health care number','Reason: '+reason,true,{ pid:id, info:'Health care number' }); return patient(id).ahc; },
  setPerm(actor, uid, perm, on){
    require_(actor,'team.manage','Staff permissions');
    const t = byId(uid); const el = eligibility(t, perm);
    if(!el.ok) throw new Denied(el.why);
    t.revoked = (t.revoked||[]).filter(x => x!==perm); if(!on) t.revoked.push(perm);
    audit(actor, on?'Granted permission':'Removed permission', fullName(t)+' · '+PERMISSIONS[perm].label, true); save();
  }
};

/* ---------- 6. audit (append-only) ---------- */
// Fields follow Alberta's provincial logging and auditing standard: who, role, when, action,
// patient identifier and the TYPE of information touched (never the clinical details).
function audit(u, action, target, ok, meta){
  if(LIVE.quiet) return; // a screen refreshed by someone else's change is not a new action
  meta = meta || {};
  S.audit.push(Object.freeze({ t:new Date().toISOString(), uid:u?u.id:'anon', role:u?u.role:'', action, target, ok:ok!==false, pid:meta.pid||'', info:meta.info||'', fac:(S.clinic&&S.clinic.legal)||'Natural Bloom' }));
  liveAudit(S.audit[S.audit.length-1]);
  if(S.audit.length>600) S.audit = S.audit.slice(-600);
  save();
  if(window.sb && u) window.sb.rpc('log_audit', { p_action:action, p_record_id:(meta&&meta.pid)||'', p_info_type:(meta&&meta.info)||'', p_ok:ok!==false, p_detail:String(target).slice(0,180) });
}

/* ---------- 7. session ---------- */
let session = null;     // { uid, started, last } — memory only, never persisted
let auth = { step:'login', email:'', err:'', pending:null };
let idleTimer = null, warned = false;
function me(){ return session ? byId(session.uid) : null; }
let touchSent = 0;
function touch(){ if(session){ session.last = Date.now(); warned = false; if(SESS[session.uid]) SESS[session.uid].last = session.last; livePresence(false); if(window.sb && Date.now()-touchSent>60000){ touchSent=Date.now(); window.sb.rpc('touch_session'); } } }
['pointerdown','keydown','scroll'].forEach(ev => window.addEventListener(ev, touch, { passive:true }));
function startIdle(){
  clearInterval(idleTimer);
  idleTimer = setInterval(() => {
    if(!session) return;
    tickSessions();
    const left = S.timeout*60000 - (Date.now()-session.last);
    const el = document.getElementById('tb-time');
    if(el){ const t = clinicNow(); if(el.textContent!==t.time){ el.textContent = t.time; document.getElementById('tb-date').textContent = t.date; } }
    if(left <= 0){ signOut('Session expired after '+S.timeout+' minutes of inactivity'); return; }
    if(left <= 60000 && !warned){ warned = true; openDialog(`<div class="sub">Session</div><h2>Still there?</h2><p class="small" style="margin-top:10px">For privacy, you will be signed out in under a minute. Choose Stay signed in to keep working.</p><div class="acts"><button class="cta cta-ghost" data-action="signout">Sign out now</button><button class="cta cta-solid" data-action="close">Stay signed in</button></div>`); }
  }, 1000);
}
/* ---------- 7a. top bar: date, time and local weather (clinic time zone: Calgary) ---------- */
const CLINIC_TZ = 'America/Edmonton', CLINIC_GEO = { name:'Calgary', lat:51.05, lon:-114.07 };
function clinicNow(){ const d = new Date(); return { date: d.toLocaleDateString('en-CA',{ timeZone:CLINIC_TZ, weekday:'short', day:'numeric', month:'short' }).replace(/\./g,''), time: d.toLocaleTimeString('en-CA',{ timeZone:CLINIC_TZ, hour:'numeric', minute:'2-digit' }).replace(/\./g,'') }; }
let WX = null, wxLoading = false;
function wxIcon(code){ return code===0||code===1 ? 'sun' : (code>=71&&code<=77)||code===85||code===86 ? 'snow' : (code>=51&&code<=67)||(code>=80&&code<=82)||code>=95 ? 'rain' : 'cloud'; }
const WX_WORD = { sun:'Clear', cloud:'Cloudy', rain:'Rain', snow:'Snow' };
function wxHTML(){
  if(WX && WX.ok) return icon(wxIcon(WX.code),17)+'<span><b class="tnum">'+Math.round(WX.temp)+'°</b> '+CLINIC_GEO.name+'</span>';
  return icon('cloud',17)+'<span>'+CLINIC_GEO.name+(WX && !WX.ok ? ' · weather unavailable' : '')+'</span>';
}
function loadWeather(){
  if(WX) return;
  WX = { ok:false, at:Date.now() };
}
function topStatus(){
  const t = clinicNow(); loadWeather();
  return '<div class="tb-status"><div class="tb-when"><span id="tb-date">'+t.date+'</span><span class="tb-dot" aria-hidden="true"></span><b id="tb-time" class="tnum">'+t.time+'</b></div><span class="tb-sep" aria-hidden="true"></span><div class="tb-wx" id="tb-wx">'+wxHTML()+'</div></div>';
}
/* ---------- 7b. live staff sessions (owner view) ----------
   Production: the identity service reports every open session; only the portal page is shown, never the patient. */
let SESS = (function(){ const n = Date.now(), m = 60000; return {
  'u-ivy':   { start:n-95*m, last:n-40000, area:'Administration portal · Tasks', device:'Chrome · macOS · Calgary, AB', sim:true, busy:true },
  'u-lilac': { start:n-70*m, last:n-15000, area:'Medical practitioner portal · Lab Results', device:'Safari · iPad · Calgary, AB', sim:true, busy:true },
  'u-sage':  { start:n-62*m, last:n-6*m, area:'Holistic practitioner portal · Care Plans', device:'Chrome · Windows · Cochrane, AB', sim:true }
}; })();
const IDLE_AFTER = 2*60000;
function sessState(x){ return Date.now()-x.last < IDLE_AFTER ? 'Active' : 'Idle'; }
function ago(t){ const d = Date.now()-t; if(d<60000) return 'Just now'; const m = Math.floor(d/60000); if(m<60) return m+' min ago'; return Math.floor(m/60)+' h '+(m%60)+' min ago'; }
function since(t){ const m = Math.floor((Date.now()-t)/60000); return new Date(t).toLocaleTimeString('en-CA',{hour:'numeric',minute:'2-digit'})+' · '+(m<60?m+' min':Math.floor(m/60)+' h '+(m%60)+' min'); }
function liveList(){ return Object.keys(SESS).filter(id => byId(id) && byId(id).status==='active').sort((a,b) => (sessState(SESS[a])==='Active'?0:1)-(sessState(SESS[b])==='Active'?0:1) || SESS[b].last-SESS[a].last); }
function liveSessionsTable(){
  const ids = liveList(), act = ids.filter(id => sessState(SESS[id])==='Active').length;
  let h = '<div class="row" style="gap:18px;flex-wrap:wrap;margin-bottom:16px"><span class="small"><span class="dot" style="margin-right:8px"></span>'+act+' active</span><span class="small"><span class="dot warn" style="margin-right:8px"></span>'+(ids.length-act)+' idle</span><span class="small">'+ids.length+' signed in</span></div>';
  if(!ids.length) return h+'<p class="small">No one else is signed in right now.</p>';
  h += '<div class="tbl-wrap"><table style="min-width:900px"><thead><tr><th>Staff member</th><th>Status</th><th>Where</th><th>Signed in</th><th>Last activity</th><th>Device</th><th></th></tr></thead><tbody>';
  ids.forEach(id => { const x = SESS[id], s = byId(id), st = sessState(x);
    h += '<tr><th scope="row"><div class="row"><div class="avatar" style="width:38px;height:38px;font-size:0.95rem">'+initials(s)+'</div><div><button class="link" style="border:none;padding:0;text-transform:none;letter-spacing:0;font-size:0.95rem;color:var(--ink)" data-action="activity" data-id="'+id+'">'+esc(fullName(s))+'</button><div class="t-sub">'+ROLE_LABEL[s.role]+'</div></div></div></th><td>'+pill(st)+'</td><td class="m">'+esc(x.area)+'</td><td class="m tnum">'+since(x.start)+'</td><td class="m">'+ago(x.last)+'</td><td class="m">'+esc(x.device)+'</td><td class="w-min">'+(id===session.uid?'<span class="tiny">You</span>':'<button class="link" data-action="end-session" data-id="'+id+'">End session</button>')+'</td></tr>'; });
  return h+'</tbody></table></div>';
}
function liveMini(){
  const ids = liveList();
  return '<ul class="list">'+ids.map(id => { const x = SESS[id], s = byId(id), st = sessState(x); return '<li style="padding:12px 0"><div class="row grow"><span class="dot'+(st==='Active'?'':' warn')+'"></span><div class="grow"><div class="t">'+esc(fullName(s))+(id===session.uid?' <span class="tiny">(you)</span>':'')+'</div><div class="tiny">'+esc(x.area.split(' · ').pop())+' · '+(st==='Active'?'active '+ago(x.last).toLowerCase():'idle since '+ago(x.last).replace(' ago',''))+'</div></div></div></li>'; }).join('')+'</ul>';
}
function tickSessions(){
  const n = Date.now();
  Object.keys(SESS).forEach(id => { const x = SESS[id]; if(!x.sim) return;
    if(x.busy && Math.random()<0.08) x.last = n;
    if(n-x.last > S.timeout*60000){ delete SESS[id]; audit(byId(id),'Session expired','Signed out after '+S.timeout+' minutes idle',true); } });
  const a = document.getElementById('live-sessions'); if(a) a.innerHTML = liveSessionsTable();
  const b = document.getElementById('live-mini'); if(b) b.innerHTML = liveMini();
}
function go(h){ if(location.hash===h) render(); else location.hash = h; }
function fmtMs(ms){ ms = Math.max(0,ms); const m = Math.floor(ms/60000), s = Math.floor(ms%60000/1000); return m+':'+String(s).padStart(2,'0'); }
function signOut(reason){
  const u = me(); if(u){ audit(u, 'Signed out', reason||'Manual sign-out', true); delete SESS[u.id]; }
  if(window.sb) window.sb.auth.signOut();
  session = null; LIVE.lastArea = ''; livePresence(true); auth = { step:'login', email:'', err: reason && reason!=='Manual sign-out' ? reason+'. Please sign in again.' : '' };
  clearInterval(idleTimer); closeLayer(); document.getElementById('toasts').innerHTML = ''; go('#/signin');
}

/* ---------- 8. routes + guard ---------- */
const ROUTES = {
  owner:[
    { id:'overview', label:'Overview', icon:'overview', render:ownerOverview },
    { id:'tasks', label:'Tasks', icon:'tasks', perm:'tasks.personal', render:tasksPage, count:() => taskCount(me()) },
    { id:'hub', label:'Team Dashboard', icon:'hub', perm:'hub.view', render:hubPage, count:() => S.hub.posts.filter(p => p.type==='policy' && !(S.hub.reads[p.id]||[]).includes(me().id)).length },
    { id:'patients', label:'Patients', icon:'patients', perm:'patients.directory', render:patientsPage },
    { id:'team', label:'Team', icon:'team', perm:'team.manage', render:teamPage },
    { id:'operations', label:'Operations', icon:'operations', perm:'operations.view', render:operationsPage },
    { id:'reports', label:'Reports', icon:'reports', perm:'reports.view', render:reportsPage },
    { id:'documents', label:'Documents', icon:'documents', perm:'templates.manage', render:templatesPage },
    { id:'portal', label:'Portal Management', icon:'portal', perm:'portal.manage', render:portalPage },
    { id:'settings', label:'Settings', icon:'settings', perm:'settings.owner', render:ownerSettings },
    { id:'audit', label:'Audit History', icon:'audit', perm:'audit.view', render:auditPage },
    { id:'profile', label:'Profile', icon:'profile', perm:'profile.self', render:selfSettings }
  ],
  admin:[
    { id:'overview', label:'Overview', icon:'overview', render:adminOverview },
    { id:'patients', label:'Patients', icon:'patients', perm:'patients.directory', render:patientsPage },
    { id:'requisitions', label:'Lab Requisitions', icon:'flask', perm:'requisitions.prepare', render:requisitionsPage },
    { id:'tasks', label:'Tasks', icon:'tasks', perm:'tasks.personal', render:tasksPage, count:() => taskCount(me()) + (can(me(),'tasks.admin') ? S.tasks.filter(t=>!t.done).length : 0) },
    { id:'hub', label:'Team Dashboard', icon:'hub', perm:'hub.view', render:hubPage, count:() => S.hub.posts.filter(p => p.type==='policy' && !(S.hub.reads[p.id]||[]).includes(me().id)).length },
    { id:'documents', label:'Documents', icon:'documents', perm:'documents.delivery', render:deliveryPage },
    { id:'settings', label:'Settings', icon:'settings', perm:'profile.self', render:selfSettings }
  ],
  holistic:[
    { id:'overview', label:'Overview', icon:'overview', render:pracOverview },
    { id:'patients', label:'Patients', icon:'patients', perm:'patients.assigned', render:patientsPage },
    { id:'careplans', label:'Care Plans', icon:'careplans', perm:'careplans.write', render:plansPage },
    { id:'careplan', label:'Care Plans', icon:'careplans', perm:'careplans.write', render:planEditor, hidden:true, parent:'careplans' },
    { id:'chart', label:'Client Chart', icon:'patients', perm:'patients.assigned', render:chartPage, hidden:true, parent:'patients' },
    { id:'tasks', label:'Tasks', icon:'tasks', perm:'tasks.personal', render:tasksPage, count:() => taskCount(me()) + (can(me(),'tasks.clinical') ? myCTasks().filter(t=>!t.done).length : 0) },
    { id:'hub', label:'Team Dashboard', icon:'hub', perm:'hub.view', render:hubPage, count:() => S.hub.posts.filter(p => p.type==='policy' && !(S.hub.reads[p.id]||[]).includes(me().id)).length },
    { id:'profile', label:'Profile', icon:'profile', perm:'profile.self', render:selfSettings }
  ],
  medical:[
    { id:'overview', label:'Overview', icon:'overview', render:pracOverview },
    { id:'patients', label:'Patients', icon:'patients', perm:'patients.assigned', render:patientsPage },
    { id:'forms', label:'Form Library', icon:'forms', perm:'forms.generate', render:formsPage },
    { id:'results', label:'Lab Results', icon:'results', perm:'results.enter', render:resultsPage },
    { id:'careplans', label:'Care Plans', icon:'careplans', perm:'careplans.write', render:plansPage },
    { id:'careplan', label:'Care Plans', icon:'careplans', perm:'careplans.write', render:planEditor, hidden:true, parent:'careplans' },
    { id:'chart', label:'Client Chart', icon:'patients', perm:'patients.assigned', render:chartPage, hidden:true, parent:'patients' },
    { id:'tasks', label:'Tasks', icon:'tasks', perm:'tasks.personal', render:tasksPage, count:() => taskCount(me()) + (can(me(),'tasks.clinical') ? myCTasks().filter(t=>!t.done).length : 0) },
    { id:'hub', label:'Team Dashboard', icon:'hub', perm:'hub.view', render:hubPage, count:() => S.hub.posts.filter(p => p.type==='policy' && !(S.hub.reads[p.id]||[]).includes(me().id)).length },
    { id:'profile', label:'Profile', icon:'profile', perm:'profile.self', render:selfSettings }
  ]
};
function guard(u, portal, id){
  if(!ROUTES[portal]) return { ok:false, reason:'This address does not exist.' };
  if(portal !== u.role) return { ok:false, reason:'The '+PORTAL_LABEL[portal]+' is not assigned to your account.' };
  const r = ROUTES[portal].find(x => x.id===id);
  if(!r) return { ok:false, reason:'This page does not exist in the '+PORTAL_LABEL[portal]+'.' };
  if(r.perm && !can(u, r.perm)) return { ok:false, reason:'Your account does not include “'+PERMISSIONS[r.perm].label+'”.' };
  return { ok:true, route:r };
}
function navFor(u){ return ROUTES[u.role].filter(r => !r.hidden && (!r.perm || can(u, r.perm))); }
function home(u){ return '#/'+u.role+'/overview'; }

/* ---------- 9. shared components ---------- */
const STATUS_STYLE = {
  'Draft':'p-deep','Awaiting Authorization':'p-yellow','Authorized':'p-lilac','Ready to Send':'p-gold','Sent':'p-emerald','Failed':'p-burgundy','Cancelled':'p-outline',
  'Ready for Review':'p-yellow','Published':'p-emerald','None':'p-outline',
  'Active':'p-emerald','New':'p-lilac','Inactive':'p-outline','Invited':'p-yellow','Deactivated':'p-outline','Retired':'p-outline',
  'High':'p-burgundy','Normal':'p-deep','Low':'p-outline',
  'Completed':'p-outline','In progress':'p-emerald','Upcoming':'p-deep','Forms outstanding':'p-yellow', 'Idle':'p-yellow', 'Live':'p-emerald', 'Hidden':'p-outline', 'Not connected':'p-outline', 'Feasibility pending':'p-yellow'
};
function pill(s, cls){ return '<span class="pill '+(cls||STATUS_STYLE[s]||'p-deep')+'">'+esc(s)+'</span>'; }
const JANE = { matched:['Matched in Jane','p-emerald'], update:['Update needed in Jane','p-yellow'], unlinked:['Not linked','p-outline'] };
function janePill(st){ const j = JANE[st]||JANE.unlinked; return pill(j[0], j[1]); }
function fmtDob(d){ const [y,m,dd] = d.split('-').map(Number); return new Date(y,m-1,dd).toLocaleDateString('en-CA',{ day:'numeric', month:'short', year:'numeric' }); }
function pageHead(eyebrow, title, lede, acts){
  return '<div class="page-head"><div><div class="eyebrow">'+eyebrow+'</div><h1>'+title+'</h1>'+(lede?'<p class="lede">'+lede+'</p>':'')+'</div>'+(acts?'<div class="head-acts">'+acts+'</div>':'')+'</div>';
}
function phaseNote(n, text){ return '<div class="notice y" style="margin-bottom:26px">'+icon('info')+'<div><span class="phase">Phase '+n+'</span><div style="margin-top:8px">'+text+'</div></div></div>'; }
function stat(label, value, note, opts){
  opts = opts||{};
  const tag = opts.href ? 'a' : 'div';
  return '<'+tag+' class="neo stat'+(opts.deep?' deep':'')+'"'+(opts.href?' href="'+opts.href+'"':'')+'><div class="sub">'+label+'</div><div class="v tnum">'+value+(opts.unit?'<small>'+opts.unit+'</small>':'')+'</div><div class="small">'+note+'</div></'+tag+'>';
}
function staffName(id){ const u = byId(id); return u ? fullName(u) : '—'; }
function staffShort(id){ const u = byId(id); if(!u) return '—'; return u.cred && u.cred.type==='NP' ? u.first+' '+u.last+', NP' : u.first+' '+u.last; }

function barChart(data, opts){
  // single series · one y-scale · thin bars with 4px rounded data-end
  const W = 640, H = 230, L = 34, B = 30, T = 14, R = 8;
  const max = opts.max, ticks = opts.ticks;
  const iw = W-L-R, ih = H-T-B, bw = Math.min(30, iw/data.length*0.46);
  const y = v => T + ih - v/max*ih;
  let g = '';
  ticks.forEach(t => { g += '<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(t)+'" y2="'+y(t)+'" stroke="rgba(111,62,86,0.12)" stroke-width="1"/><text class="axis" x="'+(L-8)+'" y="'+(y(t)+4)+'" text-anchor="end">'+t+'</text>'; });
  data.forEach((d,i) => {
    const cx = L + iw/data.length*(i+0.5), h = d[1]/max*ih, last = i===data.length-1;
    const x = cx-bw/2, top = y(d[1]);
    g += '<path d="M'+x+','+(T+ih)+' V'+(top+4)+' Q'+x+','+top+' '+(x+4)+','+top+' H'+(x+bw-4)+' Q'+(x+bw)+','+top+' '+(x+bw)+','+(top+4)+' V'+(T+ih)+' Z" fill="'+(last?'#6F3E56':'#234539')+'"/>';
    g += '<text class="axis" x="'+cx+'" y="'+(H-8)+'" text-anchor="middle">'+d[0]+'</text>';
    if(last) g += '<text x="'+cx+'" y="'+(top-8)+'" text-anchor="middle" style="font-family:Jost,sans-serif;font-size:12px;fill:#1D1A18">'+d[1]+'</text>';
    g += '<rect class="hit" x="'+(cx-iw/data.length/2)+'" y="'+T+'" width="'+(iw/data.length)+'" height="'+ih+'" fill="transparent" data-tip="'+esc(d[0]+' · '+d[1]+' '+opts.unit)+'" data-x="'+(cx/W*100)+'" data-y="'+(top/H*100)+'"/>';
  });
  g += '<line x1="'+L+'" x2="'+(W-R)+'" y1="'+(T+ih)+'" y2="'+(T+ih)+'" stroke="#D8C49A" stroke-width="1"/>';
  return '<div class="chart"><svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(opts.label)+'">'+g+'</svg><div class="tip"></div></div>';
}
function hbars(data, unit){
  const max = Math.max.apply(null, data.map(d=>d[1]));
  return '<div class="stack" style="gap:16px">'+data.map(d => '<div><div class="row" style="justify-content:space-between"><span class="small" style="color:var(--ink)">'+esc(d[0])+'</span><span class="tnum small">'+d[1]+' '+unit+'</span></div><div class="bar-track" style="margin-top:8px"><div class="bar-fill" style="width:'+(d[1]/max*100)+'%"></div></div></div>').join('')+'</div>';
}

/* table of patients — columns depend on role */
function patientTable(u, list){
  const clinical = isPrac(u);
  if(!list.length) return '<p class="small" style="padding:20px 0">No patients match that search.</p>';
  const owner = u.role==='owner';
  let h = '<div class="tbl-wrap"><table style="min-width:'+(clinical?760:owner?720:1080)+'px"><thead><tr><th>Patient</th>'+(owner?'':'<th>Date of birth</th>')+'<th>Patient ID</th>';
  h += clinical ? '<th>Latest results</th><th>Care plan</th><th>Next visit</th><th>Status</th>' : owner ? '<th>City</th><th>Practitioner</th><th>Jane</th><th>Status</th>' : '<th>Email</th><th>Phone</th><th>Health care no.</th><th>City</th><th>Practitioner</th><th>Jane</th><th>Status</th>';
  h += '</tr></thead><tbody>';
  list.forEach(p => {
    h += '<tr class="click" data-action="open-patient" data-id="'+p.id+'" tabindex="0"><th scope="row"><div class="t-name">'+esc(p.first+' '+p.last)+'</div>'+(p.pref?'<div class="t-sub">Prefers '+esc(p.pref)+'</div>':'')+'</th>'+(owner?'':'<td class="tnum">'+fmtDob(p.dob)+'</td>')+'<td class="m tnum">'+p.id+'</td>';
    if(clinical){
      const c = p.clin;
      h += c ? '<td>'+esc(c.panel)+'<div class="t-sub">'+pill(c.results)+'</div></td><td>'+pill(c.plan)+'</td><td class="m">'+esc(c.next)+'</td>' : '<td class="m" colspan="3">'+(p.wish?'Restricted at the patient’s request':'Clinical details need an active care relationship')+'</td>';
    } else if(owner){
      h += '<td class="m">'+esc(p.city)+'</td><td class="m">'+staffShort(p.np)+'</td><td>'+janePill(p.janeState)+'</td>';
    } else {
      h += '<td class="m">'+esc(p.email)+'</td><td class="m tnum">'+p.phone+'</td><td class="mask m">'+p.ahcMasked+'</td><td class="m">'+esc(p.city)+'</td><td class="m">'+staffShort(p.np)+'</td><td>'+janePill(p.janeState)+'</td>';
    }
    h += '<td>'+pill(p.status)+'</td></tr>';
  });
  return h+'</tbody></table></div>';
}

/* layer: dialog + drawer */
function openDialog(html, wide){ document.getElementById('layer').innerHTML = '<div class="veil" data-action="close"></div><div class="dialog-wrap" data-action="close-outside"><div class="neo dialog'+(wide?' wide':'')+'" role="dialog" aria-modal="true">'+html+'</div></div>'; const f = document.querySelector('.dialog [autofocus], .dialog button, .dialog input'); if(f) f.focus(); }
function openDrawer(html, expandId){ document.getElementById('layer').innerHTML = '<div class="veil" data-action="close"></div><aside class="drawer" role="dialog" aria-modal="true">'+html+'</aside>'+(expandId?expandStrip(expandId):''); const f = document.querySelector('.drawer button'); if(f) f.focus(); }
function closeLayer(){ cdPlan = null; const l = document.getElementById('layer'); const had = l.innerHTML !== ''; l.innerHTML = ''; if(had && session && /\/chart$/.test(location.hash)){ const y = window.scrollY; render(); window.scrollTo(0,y); } }
function confirmDialog(o){
  pendingConfirm = o.onYes;
  openDialog('<div class="sub">'+esc(o.eyebrow||'Please confirm')+'</div><h2>'+esc(o.title)+'</h2><p class="small" style="margin-top:12px">'+o.body+'</p>'+(o.extra||'')+'<div class="acts"><button class="cta cta-ghost" data-action="close">Cancel</button><button class="cta cta-solid" data-action="confirm-yes">'+esc(o.yes||'Confirm')+'</button></div>');
}
let pendingConfirm = null;
function toast(msg){ const t = document.createElement('div'); t.className='toast'; t.innerHTML = icon('check',16)+'<div>'+msg+'</div>'; document.getElementById('toasts').appendChild(t); setTimeout(() => t.remove(), 4200); }
function needsIntegration(what){ toast(esc(what)+' needs a production integration. Nothing was sent.'); }

/* patient drawer: role-aware */
function patientDrawer(u, id){
  let p; try { p = api.patient(u, id); } catch(e){ toast('You do not have access to that record. The attempt was recorded.'); return; }
  const np = byId(p.np), hns = byId(p.hns);
  let h = '<div class="x-row"><div class="row"><div class="avatar lg">'+p.first[0]+p.last[0]+'</div><div><div class="sub">Patient · '+p.id+'</div><h2 style="font-size:2.2rem;margin-top:4px">'+esc(p.first+' '+p.last)+'</h2><div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap">'+pill(p.status)+(!isPrac(u)?janePill(p.janeState):'')+'</div></div></div><button class="icon-btn" data-action="close" aria-label="Close">'+icon('close')+'</button></div>';
  h += '<div class="sec"><div class="sub" style="margin-bottom:8px">Identity &amp; contact</div><dl class="dl">';
  h += '<div><dt>Legal name</dt><dd>'+esc(p.first+' '+p.last)+'</dd></div>'+(p.pref?'<div><dt>Preferred name</dt><dd>'+esc(p.pref)+'</dd></div>':'');
  if(p.dob) h += '<div><dt>Date of birth</dt><dd>'+fmtDob(p.dob)+'</dd></div>';
  if(p.ahcMasked) h += '<div><dt>Alberta Health Care no.</dt><dd><span class="mask" id="ahc-val">'+p.ahcMasked+'</span>'+(can(u,'patients.reveal_ahc')?' &nbsp;<button class="link" data-action="reveal-ahc" data-id="'+p.id+'">Reveal</button>':'')+'</dd></div>';
  if(p.email) h += '<div><dt>Email</dt><dd>'+esc(p.email)+'</dd></div><div><dt>Phone</dt><dd class="tnum">'+p.phone+'</dd></div><div><dt>Mailing address</dt><dd>'+esc(p.addr)+'<br>'+esc(p.city)+', Alberta</dd></div>';
  else h += '<div><dt>City</dt><dd>'+esc(p.city)+'</dd></div>';
  if(p.wish) h += '<div><dt>Patient’s disclosure wishes</dt><dd>'+esc(WISHES[p.wish])+'<div class="tiny" style="margin-top:4px">Recorded at the patient’s request (HIA s. 58(2)). Bloom enforces it.</div></dd></div>';
  h += '<div><dt>Care team</dt><dd>'+staffShort(p.np)+'<br><span class="small">'+(hns?fullName(hns)+', Herbalist &amp; Nutrition':'')+'</span></dd></div><div><dt>Client since</dt><dd>'+esc(p.since)+(p.status==='New'?'<div class="tiny" style="margin-top:4px">Marked new until '+newUntil(patient(p.id))+', then active automatically</div>':'')+'</dd></div>';
  if(!isPrac(u)) h += '<div><dt>Jane patient ID</dt><dd>'+(p.jane||'<span class="m">Not linked yet</span>')+'</dd></div>';
  h += '</dl></div>';
  if(isPrac(u) && can(u,'clinical.view') && careTeam(patient(p.id)).includes(u.id)) h += '<div class="sec"><button class="cta cta-solid" data-action="chart-open" data-id="'+p.id+'">Open full chart</button><div class="tiny" style="margin-top:8px">Health profile, notes, labs, tasks and documents on one page.</div></div>';
  if(p.clin){
    h += '<div class="sec"><div class="sub" style="margin-bottom:8px">Clinical summary</div><dl class="dl"><div><dt>Latest panel</dt><dd>'+esc(p.clin.panel)+' &nbsp;'+pill(p.clin.results)+'</dd></div><div><dt>Care plan</dt><dd>'+pill(p.clin.plan)+'</dd></div><div><dt>Next visit</dt><dd>'+esc(p.clin.next)+'</dd></div></dl>';
    h += '<div class="row" style="flex-wrap:wrap;gap:12px;margin-top:20px">'+(can(u,'results.enter')?'<a class="cta cta-ghost cta-sm" href="#/'+u.role+'/results" data-action="close-nav">Lab results</a>':'')+'<a class="cta cta-ghost cta-sm" href="#/'+u.role+'/careplans" data-action="close-nav">Care plans</a>'+(can(u,'forms.generate')?'<a class="cta cta-ghost cta-sm" href="#/'+u.role+'/forms" data-action="close-nav">Generate a form</a>':'')+'</div></div>';
  } else if(p.wish && isPrac(u)){
    h += '<div class="notice sec">'+icon('lock')+'<div><b>Clinical details restricted at the patient’s request.</b> This patient asked that results and clinical notes be shared with Medical Practitioners only.</div></div>';
  } else if(u.role==='owner'){
    h += '<div class="notice sec">'+icon('lock')+'<div><b>Clinical records are not shown in the owner portal.</b> Owning the clinic does not grant clinical access. A clinical record opens only for an authorized practitioner with a care relationship.</div></div>';
  } else if(u.role==='admin'){
    h += '<div class="notice sec">'+icon('lock')+'<div><b>Administrative view.</b> Assessments, diagnoses, results and care plans are not part of the admin portal. Jane remains the primary clinical chart.</div></div>';
  }
  if(can(u,'patients.edit')){
    h += '<div class="row" style="flex-wrap:wrap;gap:12px;margin-top:28px"><button class="cta cta-solid" data-action="phase" data-n="3" data-what="Demographic editing">Edit demographics</button>'+(p.janeState==='update'?'<button class="cta cta-ghost" data-action="jane-done" data-id="'+p.id+'">Mark updated in Jane</button>':'')+'</div>';
  }
  if(can(u,'tasks.personal')) h += '<div class="sec"><div class="row" style="justify-content:space-between;gap:12px;margin-bottom:8px"><div class="sub">Tasks for this patient</div><button class="link" data-action="pt-new-task" data-id="'+p.id+'">New task</button></div><div class="search" style="max-width:none;margin-bottom:10px">'+icon('search',16)+'<label class="sr" for="pt-tq">Search this patient’s tasks</label><input class="input" id="pt-tq" data-ptq="'+p.id+'" placeholder="Search previous tasks and messages"></div><div id="pt-tasks">'+patientTasksHTML(u,p.id,'')+'</div></div>';
  h += '<p class="tiny" style="margin-top:26px">Opening this record was recorded in the audit history.</p>';
  openDrawer(h, id);
}

/* expand a patient pop-up to a full-screen chart */
function expandStrip(id){
  const chev = '<path d="M9 5l7 7-7 7"/>';
  return '<button type="button" class="dr-expand" data-action="drawer-expand" data-id="'+id+'" aria-label="Expand to the full patient chart"><span class="dx-arrows" aria-hidden="true"><span class="dx-core"><svg width="22" height="22" viewBox="0 0 24 24"><path d="M8.5 4.5L17 12l-8.5 7.5z" fill="currentColor"/></svg></span><svg class="dx-g g1" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'+chev+'</svg><svg class="dx-g g2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'+chev+'</svg></span><span class="dx-lbl">Open full chart</span></button>';
}
function expandPatient(u, pid){
  const dr = document.querySelector('.drawer'), p = patient(pid); if(!dr || !p) return;
  const canChart = isPrac(u) && can(u,'clinical.view') && careTeam(p).includes(u.id);
  let body;
  if(canChart){
    try { chartAccess(u, pid); } catch(e){ toast('You do not have access to that chart. The attempt was recorded.'); return; }
    S.openChart = pid; save();
    audit(u,'Opened client chart','Client chart',true,{ pid, info: projectPatient(p,u).clin ? 'Demographics, clinical summary, results' : 'Demographics, wellness notes' });
    body = chartPage(u).replace(/^<a class="link" href="#\/\w+\/patients"[^>]*>[^<]*<\/a>/, '');
  } else {
    const keep = dr.cloneNode(true); const x = keep.querySelector('.x-row .icon-btn[data-action=close]'); if(x) x.remove();
    body = '<div class="full-narrow">'+keep.innerHTML+'</div>';
  }
  const strip = document.querySelector('.dr-expand'); if(strip) strip.remove();
  dr.classList.add('full');
  dr.setAttribute('aria-label', pName(p)+' · full chart');
  dr.innerHTML = '<div class="full-bar"><button type="button" class="link" data-action="drawer-collapse" data-id="'+pid+'">← Back to summary</button><span class="sub">'+(canChart?'Full chart':'Full view')+' · '+esc(pName(p))+'</span><button class="icon-btn" data-action="close" aria-label="Close">'+icon('close')+'</button></div><div class="full-body">'+body+'</div>';
  dr.scrollTop = 0;
  const c = dr.querySelector('[data-action=close]'); if(c) c.focus({ preventScroll:true });
}

/* ---------- 10. pages ---------- */
function greet(u){ const h = new Date().getHours(); return (h<12?'Good morning':h<17?'Good afternoon':'Good evening')+', <em>'+esc(u.first)+'.</em>'; }
function todayStr(){ return new Date().toLocaleDateString('en-CA',{ weekday:'long', day:'numeric', month:'long' }); }
function apptList(list, showStaff){
  return '<ul class="list">'+list.map(a => { const p = patient(a.pid); return '<li><div class="row grow"><div class="time">'+a.time+'<span class="tiny"> '+a.ap+'</span></div><div class="grow"><div class="t">'+esc(pName(p))+'</div><div class="tiny">'+esc(a.type)+(showStaff?' · '+a.staff.map(s=>byId(s).first).join(' + '):'')+'</div></div></div>'+pill(a.state)+'</li>'; }).join('')+'</ul>';
}
function reqCounts(){ const c = {}; REQ_STATUSES.forEach(s => c[s]=0); S.reqs.forEach(r => c[r.status]++); return c; }
function reqPipeline(){
  const c = reqCounts();
  return '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:14px">'+REQ_STATUSES.map(s => '<div class="pressed" style="padding:16px 18px"><div class="tiny" style="letter-spacing:0.12em;text-transform:uppercase">'+s+'</div><div class="tnum" style="font-family:var(--serif);font-size:2rem;line-height:1.1;margin-top:6px">'+c[s]+'</div></div>').join('')+'</div>';
}

/* OWNER */
function ownerOverview(u){
  const openTasks = S.tasks.filter(t=>!t.done).length, c = reqCounts();
  const awaiting = c['Draft']+c['Awaiting Authorization']+c['Authorized']+c['Ready to Send']+c['Failed'];
  const pending = PANELS.filter(x=>x.status!=='Published').length + allPlans().filter(x => planStatus(x).status!=='Published').length;
  let h = pageHead('Owner portal · '+todayStr(), greet(u), 'The whole clinic at a glance: patients, schedule, workflow and portal activity.', '<a class="cta cta-ghost" href="#/owner/reports">Reports</a><a class="cta cta-solid" href="#/owner/team">Manage team '+icon('arrow',14)+'</a>');
  h += '<div class="grid g4">'+stat('Active patients','214','<span class="dot" style="margin-right:8px;width:8px;height:8px"></span>12 more than last month')+stat('New registrations','26','This month · 3 this week',{href:'#/owner/patients'})+stat('Appointments','58','This week · '+APPTS.length+' today',{href:'#/owner/operations'})+stat('Portal sign-ins','162','Last 7 days · 71% of active patients',{href:'#/owner/portal'})+'</div>';
  h += '<div class="grid g4 sec">'+stat('Requisitions in progress',awaiting,c['Failed']+' failed delivery',{href:'#/owner/operations',deep:true})+stat('Admin tasks open',openTasks,'3 due today',{href:'#/owner/operations',deep:true})+stat('Practitioner updates',pending,'Results and care plans not yet published',{deep:true})+stat('Operational alerts','2','Needs attention today',{deep:true})+'</div>';
  h += '<div class="split sec"><div class="neo panel"><div class="panel-head"><div><span class="num">Schedule</span><h2>Appointments per week</h2></div><span class="small">Last 8 weeks · this week highlighted</span></div>'+barChart(WEEKS,{ max:60, ticks:[0,20,40,60], unit:'appointments', label:'Appointments per week, last 8 weeks, rising from 41 to 58' })+'</div>';
  h += '<div class="neo panel"><div class="panel-head"><div><span class="num">Attention</span><h2>Operational alerts</h2></div></div><ul class="list"><li><div class="row grow"><span class="dot alert"></span><div><div class="t">Requisition delivery failed</div><div class="tiny">R-1036 · secure email bounced on 15 Oct</div></div></div><a class="link" href="#/owner/operations">Review</a></li><li><div class="row grow"><span class="dot warn"></span><div><div class="t">Staff invitation not accepted</div><div class="tiny">Juniper Reyes · sent 3 days ago · MFA not enrolled</div></div></div><a class="link" href="#/owner/team">Team</a></li><li><div class="row grow"><span class="dot"></span><div><div class="t">Two Jane records need a manual update</div><div class="tiny">Demographic changes made in Bloom</div></div></div><a class="link" href="#/owner/operations">View</a></li></ul></div></div>';
  h += '<div class="split sec"><div class="neo panel"><div class="panel-head"><div><span class="num">Today</span><h2>Appointments</h2></div><span class="small">All virtual · '+APPTS.length+' visits</span></div>'+apptList(APPTS,true)+'</div>';
  h += '<div class="stack"><div class="neo panel"><div class="panel-head"><div><span class="num">Live</span><h2>Signed in now</h2></div><a class="link" href="#/owner/team">Staff activity</a></div><div id="live-mini">'+liveMini()+'</div></div><div class="neo panel"><div class="panel-head"><div><span class="num">This week</span><h2>Workflow completion</h2></div></div><div class="stack" style="gap:18px">'+[['Ivy Bennett','Admin tasks',14,18],['Lilac Ashford, NP','Clinical tasks',9,12],['Lavender Hale, NP','Clinical tasks',7,10],['Sage Whitford','Wellness tasks',6,7]].map(r => '<div><div class="row" style="justify-content:space-between"><span class="small" style="color:var(--ink)">'+r[0]+' <span class="tiny">· '+r[1]+'</span></span><span class="small tnum">'+r[2]+' of '+r[3]+'</span></div><div class="bar-track" style="margin-top:8px"><div class="bar-fill" style="width:'+(r[2]/r[3]*100)+'%"></div></div></div>').join('')+'</div></div>';
  h += '<div class="neo panel deep"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><div class="sub">Financial reporting</div><h2 style="font-size:1.7rem;margin-top:8px">Not connected yet</h2></div><span style="color:var(--burgundy)">'+icon('lock',22)+'</span></div><p class="small" style="margin-top:10px">Revenue and visit income appear here once an approved accounting integration is connected. No figures are estimated.</p><a class="link" href="#/owner/settings" style="margin-top:14px">Integration status</a></div></div></div>';
  return h;
}
function patientsPage(u){
  const list = api.patients(u);
  const assigned = isPrac(u);
  let h = pageHead(PORTAL_LABEL[u.role], assigned?'Your <em>patients</em>':'Patient <em>directory</em>', assigned?'Patients with an active care relationship with you. Other patients are not visible here.':'Search by name, email, patient ID or health care number. Select a patient to open their administrative profile.');
  if(u.role==='owner') h += '<div class="notice" style="margin-bottom:24px">'+icon('lock')+'<div><b>Operational view.</b> The owner portal shows the least information needed to run the clinic (HIA s. 58): no contact details, birth dates, health numbers or clinical records. Prototype sample: 12 of 214 active patients.</div></div>';
  h += '<div class="neo panel"><div class="filters"><label class="sr" for="pt-q">Search patients</label><input class="input" id="pt-q" placeholder="Search by name, email or patient ID" data-filter="patients"><label class="sr" for="pt-s">Status</label><select class="select" id="pt-s" data-filter="patients"><option value="">All statuses</option><option>Active</option><option>New</option><option>Inactive</option></select>'+(assigned?'':'<label class="sr" for="pt-j">Jane</label><select class="select" id="pt-j" data-filter="patients"><option value="">Any Jane status</option><option value="update">Update needed in Jane</option><option value="unlinked">Not linked</option><option value="matched">Matched</option></select>')+'</div><div id="pt-table">'+patientTable(u, list)+'</div></div>';
  return h;
}
function filterPatients(){
  const u = me(); const q = (document.getElementById('pt-q').value||'').toLowerCase().trim(); const s = document.getElementById('pt-s').value; const jEl = document.getElementById('pt-j'); const j = jEl?jEl.value:'';
  const digits = q.replace(/\D/g,'');
  const list = api.patients(u).filter(p => (!s||p.status===s) && (!j||p.janeState===j) && (!q || (p.first+' '+p.last).toLowerCase().includes(q) || (p.pref||'').toLowerCase().includes(q) || (p.email||'').toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || (digits.length>=4 && can(u,'patients.reveal_ahc') && patient(p.id).ahc.replace(/\D/g,'').includes(digits))));
  document.getElementById('pt-table').innerHTML = patientTable(u, list);
}
function teamPage(u){
  let h = pageHead('Owner portal', 'Your <em>team</em>', 'Invite and deactivate staff, assign roles and fine-tune permissions. Clinical permissions follow verified credentials, never ownership.', '<button class="cta cta-solid" data-action="invite">'+icon('plus',14)+' Invite staff</button>');
  h += '<div class="neo panel" id="activity" style="margin-bottom:26px"><div class="panel-head"><div><span class="num">Live</span><h2>Who’s signed in</h2></div><span class="small">Updates every few seconds</span></div><div id="live-sessions">'+liveSessionsTable()+'</div><p class="tiny" style="margin-top:16px">Active means a click, key press or scroll in the last 2 minutes. Only the portal page is shown, never which patient someone is viewing. Ending a session signs the person out everywhere and is recorded in the audit history. Prototype: other staff sessions are simulated.</p></div>';
  h += '<div class="neo panel"><div class="panel-head"><h2>All staff</h2></div><div class="tbl-wrap"><table style="min-width:1020px"><thead><tr><th>Staff member</th><th>Role</th><th>Credentials</th><th>MFA</th><th>Confidentiality</th><th>Last active</th><th>Status</th><th></th></tr></thead><tbody>';
  S.staff.forEach(s => {
    h += '<tr><th scope="row"><div class="row"><div class="avatar" style="width:38px;height:38px;font-size:0.95rem">'+initials(s)+'</div><div><div class="t-name">'+esc(fullName(s))+'</div><div class="t-sub">'+esc(s.title)+'</div></div></div></th><td>'+pill(ROLE_LABEL[s.role], s.role==='owner'?'p-burgundy':s.role==='admin'?'p-gold':s.role==='medical'?'p-emerald':'p-lilac')+'</td><td class="m">'+(s.cred?esc(s.cred.label)+(s.cred.reg?'<div class="t-sub">Reg. '+s.cred.reg+' · verified</div>':''):'None on file')+'</td><td class="m">'+esc(s.mfa)+'</td><td class="m">'+esc(s.conf||'—')+'</td><td class="m">'+(SESS[s.id]&&s.status==='active'?pill(sessState(SESS[s.id])):esc(s.seen))+'</td><td>'+pill(s.status[0].toUpperCase()+s.status.slice(1))+'</td><td class="w-min"><div class="row" style="gap:14px"><button class="link" data-action="activity" data-id="'+s.id+'">Activity</button><button class="link" data-action="perms" data-id="'+s.id+'">Permissions</button></div></td></tr>';
  });
  h += '</tbody></table></div></div>';
  h += timeoffRequestsPanel();
  h += '<div class="grid g4 sec"><div class="neo panel"><div class="sub">Owner</div><p class="small" style="margin-top:8px">Business oversight, staff, templates, portal publishing, settings and audit history. No clinical records.</p></div><div class="neo panel"><div class="sub">Administration</div><p class="small" style="margin-top:8px">Patient demographics, standard requisition preparation, delivery and the task queue. Cannot sign or issue medical orders.</p></div><div class="neo panel"><div class="sub">Holistic Practitioner</div><p class="small" style="margin-top:8px">Assigned patients only. Drafts wellness care plans and handles wellness tasks. No forms, results or requisitions.</p></div><div class="neo panel"><div class="sub">Medical Practitioner</div><p class="small" style="margin-top:8px">Assigned patients only. Forms, results, authorizing and publishing, with a verified NP registration.</p></div></div>';
  return h;
}
function permDrawer(id){
  const actor = me(), t = byId(id), eff = effectivePerms(t);
  let h = '<div class="x-row"><div class="row"><div class="avatar lg">'+initials(t)+'</div><div><div class="sub">'+ROLE_LABEL[t.role]+' · '+esc(t.title)+'</div><h2 style="font-size:2.1rem;margin-top:4px">'+esc(fullName(t))+'</h2></div></div><button class="icon-btn" data-action="close" aria-label="Close">'+icon('close')+'</button></div>';
  if(t.status!=='active') h += '<div class="notice y sec">'+icon('info')+'<div>This account is <b>'+t.status+'</b>, so it holds no permissions until it is active.</div></div>';
  const groups = {};
  ROLE_SCOPE[t.role].forEach(p => { const g = PERMISSIONS[p].group; (groups[g]=groups[g]||[]).push(p); });
  Object.keys(groups).forEach(g => {
    h += '<div class="sec"><div class="sub" style="margin-bottom:6px">'+g+'</div>';
    groups[g].forEach(p => {
      const el = eligibility(t,p), on = !(t.revoked||[]).includes(p) && el.ok;
      const lockSelf = t.id===actor.id && p==='team.manage';
      h += '<div class="perm-row"><div><div style="font-size:0.92rem">'+PERMISSIONS[p].label+'</div><div class="why">'+(el.ok?(lockSelf?'You cannot remove your own staff management access':(eff.has(p)?'Active':'Switched off for this person')):el.why)+'</div></div><button class="switch" role="switch" aria-checked="'+on+'" aria-label="'+esc(PERMISSIONS[p].label)+'" data-action="toggle-perm" data-id="'+t.id+'" data-perm="'+p+'"'+(!el.ok||lockSelf||t.status!=='active'?' disabled':'')+'></button></div>';
    });
    h += '</div>';
  });
  h += '<p class="tiny sec">Permissions outside the '+ROLE_LABEL[t.role]+' role cannot be added here. Changing a role is a separate, audited step for production.</p>';
  if(t.id!==actor.id){
    h += '<div class="row" style="gap:12px;flex-wrap:wrap;margin-top:20px">'+(t.status==='deactivated'?'<button class="cta cta-ghost" data-action="reactivate" data-id="'+t.id+'">Reactivate</button>':'<button class="cta cta-ghost" data-action="deactivate" data-id="'+t.id+'">Deactivate account</button>')+(t.status==='invited'?'<button class="cta cta-ghost" data-action="integration" data-what="Resending an invitation email">Resend invitation</button>':'')+'</div>';
  }
  openDrawer(h);
}
function operationsPage(u){
  let h = pageHead('Owner portal', '<em>Operations</em>', 'Requisition workflow, task load and Jane follow-ups across the team. Clinical content stays out of these summaries.');
  h += '<div class="neo panel"><div class="panel-head"><div><span class="num">Requisitions</span><h2>Workflow by status</h2></div></div>'+reqPipeline()+'</div>';
  h += '<div class="split sec"><div class="neo panel"><div class="panel-head"><h2>Recent requisitions</h2></div><div class="tbl-wrap"><table style="min-width:620px"><thead><tr><th>ID</th><th>Patient</th><th>Practitioner</th><th>Prepared by</th><th>Updated</th><th>Status</th></tr></thead><tbody>'+S.reqs.map(r => '<tr><td class="tnum">'+r.id+'</td><td>'+esc(pName(patient(r.pid)))+'</td><td class="m">'+staffShort(r.np)+'</td><td class="m">'+staffName(r.by)+'</td><td class="m">'+esc(r.updated)+'</td><td>'+pill(r.status)+'</td></tr>').join('')+'</tbody></table></div></div>';
  const cats = {}; S.tasks.filter(t=>!t.done).forEach(t => cats[t.cat]=(cats[t.cat]||0)+1);
  h += '<div class="stack"><div class="neo panel"><div class="panel-head"><h2>Open admin tasks</h2></div>'+hbars(Object.keys(cats).map(k=>[k,cats[k]]),'open')+'</div><div class="neo panel deep"><div class="sub">Jane follow-ups</div><p class="small" style="margin-top:8px">'+PATIENTS.filter(p=>(S.jane[p.id]||p.janeState)==='update').length+' patient records changed in Bloom still need a manual update in Jane. Bloom never marks Jane as updated on its own.</p></div></div></div>';
  return h;
}
function reportsPage(u){
  let h = pageHead('Owner portal', '<em>Reports</em>', 'Visit volume and registrations from the schedule and patient directory.');
  h += '<div class="split"><div class="neo panel"><div class="panel-head"><div><span class="num">Growth</span><h2>New registrations</h2></div><span class="small">By month</span></div>'+barChart(MONTHS,{ max:30, ticks:[0,10,20,30], unit:'registrations', label:'New patient registrations per month, May to October' })+'</div>';
  h += '<div class="neo panel"><div class="panel-head"><div><span class="num">This month</span><h2>Visit mix</h2></div></div>'+hbars(VISIT_MIX,'visits')+'<p class="tiny" style="margin-top:18px">Integrated visits pair a Nurse Practitioner with the Herbalist &amp; Nutrition Specialist.</p></div></div>';
  h += '<div class="neo panel deep sec"><div class="row" style="justify-content:space-between;flex-wrap:wrap"><div><div class="sub">Financial reports</div><h2 style="font-size:1.8rem;margin-top:8px">Waiting on an accounting integration</h2><p class="small" style="margin-top:6px;max-width:560px">Revenue by visit type, retreat income and monthly net income will appear here once a source is connected. The prototype does not invent financial figures.</p></div><a class="cta cta-ghost" href="#/owner/settings">Integration status</a></div></div>';
  return h;
}
function templatesPage(u){
  let h = pageHead('Owner portal', 'Document <em>templates</em>', 'The official PDF templates practitioners and admins work from. Only owners manage this library.', '<label class="cta cta-solid" for="tp-up" style="cursor:pointer">'+icon('upload',14)+' Upload PDF template</label><input type="file" id="tp-up" accept="application/pdf" class="sr" data-action-change="upload-template">');
  h += '<div class="neo panel"><div class="tbl-wrap"><table style="min-width:860px"><thead><tr><th>Document</th><th>Category</th><th>Version</th><th>Effective</th><th>Clinic</th><th>Mapped fields</th><th>Status</th></tr></thead><tbody>'+S.templates.map(t => '<tr><th scope="row"><div class="t-name">'+esc(t.name)+'</div>'+(t.owner?'<div class="t-sub">Owner-approved standard for new patients</div>':'')+'</th><td class="m">'+t.cat+'</td><td class="tnum">'+t.ver+'</td><td class="m">'+t.eff+'</td><td class="m">'+t.clinic+'</td><td class="m tnum">'+(t.fields?t.fields:'Not mapped')+'</td><td>'+pill(t.status)+'</td></tr>').join('')+'</tbody></table></div></div>';
  h += '<div class="notice sec">'+icon('info')+'<div>New uploads start as <b>Draft</b>. Field mapping and preview arrive in Phase 4, and a template only becomes available to staff once it is mapped and set to Active.</div></div>';
  return h;
}
function portalPage(u){
  const rows = [['Insights','Published results summary, latest care plan, next visit','Live'],['Results','Most recent published panel; history kept','Live'],['Care plans','Published visit summaries, newest first','Live'],['Library','Resources switched on below','Live'],['Patient profile','Validated demographics from Bloom','Live'],['Daisy wellness coach','General wellness only. Does not read health information; patients can turn it off','Live']];
  let h = pageHead('Owner portal', 'Portal <em>management</em>', 'What each page of the Bloom Client Portal shows, and which resources appear in the Library.');
  h += '<div class="split"><div class="neo panel"><div class="panel-head"><h2>Client portal pages</h2></div><ul class="list">'+rows.map(r => '<li><div><div class="t">'+r[0]+'</div><div class="tiny">'+r[1]+'</div></div>'+pill(r[2])+'</li>').join('')+'</ul><div class="notice l" style="margin-top:20px">'+icon('lock')+'<div>Drafts, items ready for review and staff-only notes never reach the client portal. Only published content is visible to patients.</div></div></div>';
  h += '<div class="neo panel"><div class="panel-head"><h2>Library resources</h2></div>'+S.library.map(l => '<div class="perm-row"><div><div style="font-size:0.92rem">'+esc(l.title)+'</div><div class="why">'+l.kind+' · '+(l.on?'Visible to patients':'Hidden')+'</div></div><button class="switch" role="switch" aria-checked="'+l.on+'" aria-label="Show '+esc(l.title)+'" data-action="toggle-lib" data-id="'+l.id+'"></button></div>').join('')+'</div></div>';
  h += '<div class="grid g3 sec">'+stat('Portal sign-ins','162','Last 7 days')+stat('Care plans viewed','48','Last 7 days')+stat('Profile update requests','3','Routed to the admin task queue')+'</div>';
  return h;
}
function ownerSettings(u){
  const c = S.clinic;
  const ints = [['Jane','Primary clinical chart. API capability and permissions to be confirmed before any sync.','Feasibility pending'],['Secure fax','Outbound fax for authorized requisitions and referrals.','Not connected'],['Secure email delivery','Encrypted delivery of documents to patients.','Not connected'],['Accounting','Source for financial reporting.','Not connected']];
  let h = pageHead('Owner portal · restricted', '<em>Settings</em>', 'Clinic details, security policy and integrations. Visible to owners only.', '<a class="cta cta-ghost" href="#/blueprint">Phase 1 blueprint</a>');
  h += '<div class="split"><form class="neo panel" data-form="clinic"><div class="panel-head"><h2>Clinic information</h2></div><div class="stack" style="gap:16px">'+[['c-name','Clinic name','name'],['c-legal','Legal name','legal'],['c-addr','Address','address'],['c-phone','Phone','phone'],['c-fax','Fax','fax'],['c-email','Email','email'],['c-priv','Privacy Officer','privacy']].map(f => '<div class="field"><label for="'+f[0]+'">'+f[1]+'</label><input class="input" id="'+f[0]+'" name="'+f[2]+'" value="'+esc(c[f[2]])+'"></div>').join('')+'<div><button class="cta cta-solid" type="submit">Save clinic details</button></div></div><p class="tiny" style="margin-top:14px">These details fill the clinic section of requisitions and clinical forms.</p></form>';
  h += '<div class="stack"><div class="neo panel"><div class="panel-head"><h2>Security policy</h2></div><div class="perm-row"><div><div style="font-size:0.92rem">Multifactor authentication</div><div class="why">Required for every staff account. Cannot be switched off.</div></div><button class="switch" role="switch" aria-checked="true" disabled aria-label="MFA required"></button></div><div class="perm-row"><div><label for="c-timeout" style="font-size:0.92rem">Sign out after inactivity</label><div class="why">Applies to all staff sessions</div></div><select class="select" id="c-timeout" style="width:150px;height:44px" data-action-change="timeout">'+[5,10,15,20].map(m => '<option value="'+m+'"'+(S.timeout===m?' selected':'')+'>'+m+' minutes</option>').join('')+'</select></div></div>';
  h += '<div class="neo panel"><div class="panel-head"><h2>Client status</h2></div><div class="perm-row"><div><label for="c-newdays" style="font-size:0.92rem">Mark new clients as “New” for</label><div class="why">Counted from the day they join. After that they show as Active automatically. Inactive is still set by staff.</div></div><select class="select" id="c-newdays" style="width:150px;height:44px" data-action-change="newdays">'+[14,30,60,90].map(d => '<option value="'+d+'"'+((S.newDays||30)===d?' selected':'')+'>'+d+' days</option>').join('')+'</select></div></div>';
  h += '<div class="neo panel"><div class="panel-head"><h2>Integrations</h2></div><ul class="list">'+ints.map(i => '<li><div><div class="t">'+i[0]+'</div><div class="tiny">'+i[1]+'</div></div>'+pill(i[2])+'</li>').join('')+'</ul><p class="tiny" style="margin-top:14px">Integrations are reviewed in Phase 6. Until then, staff upload to Jane and send documents through approved systems by hand.</p></div>';
  h += '</div></div>';
  const custodians = S.staff.filter(x => x.role==='medical' && x.status==='active' && x.cred && x.cred.verified);
  const done = COMPLIANCE.filter(c => S.compliance[c[0]]).length;
  h += '<div class="split sec"><div class="neo panel"><div class="panel-head"><div><span class="num">Before launch</span><h2>Compliance checklist</h2></div><span class="small tnum">'+done+' of '+COMPLIANCE.length+' complete</span></div><div class="bar-track" style="margin-bottom:10px"><div class="bar-fill" style="width:'+(done/COMPLIANCE.length*100)+'%"></div></div>'+COMPLIANCE.map(c => '<div class="perm-row"><div><div style="font-size:0.92rem">'+c[1]+'</div><div class="why">'+c[2]+'</div></div><button class="switch" role="switch" aria-checked="'+!!S.compliance[c[0]]+'" aria-label="'+esc(c[1])+'" data-action="toggle-comp" data-id="'+c[0]+'"></button></div>').join('')+'<p class="tiny" style="margin-top:14px">Switch an item on once it is done and documented. Every change is recorded in the audit history.</p></div>';
  h += '<div class="stack"><div class="neo panel"><div class="panel-head"><h2>Custodianship</h2></div><dl class="dl"><div><dt>HIA custodians</dt><dd>'+(custodians.map(x => esc(fullName(x))+', NP').join('<br>')||'None verified')+'<div class="tiny" style="margin-top:4px">Regulated CRNA members. Each signs their own PIA and vendor agreements.</div></dd></div><div><dt>Affiliates</dt><dd>Owner, Administration and Holistic Practitioners, plus vendors acting as information managers</dd></div><div><dt>Under PIPA</dt><dd>Wellness-only clients, marketing lists, retreat bookings, payments and staff records</dd></div><div><dt>Privacy Officer</dt><dd>'+esc(S.clinic.privacy)+'</dd></div></dl></div>';
  h += '<div class="neo panel"><div class="panel-head"><h2>Privacy reports</h2></div>'+(S.incidents.length?'<ul class="list">'+S.incidents.map(i => '<li><div><div class="t">'+i.id+' · '+esc(i.kind)+'</div><div class="tiny">Reported by '+esc(staffName(i.uid))+' · '+new Date(i.t).toLocaleDateString('en-CA',{day:'numeric',month:'short'})+(i.pid?' · '+i.pid:'')+' · Custodian: '+esc(i.cust||'All NP custodians')+'</div></div>'+pill(i.status,'p-yellow')+'</li>').join('')+'</ul><p class="tiny" style="margin-top:12px">The custodian assesses risk of harm. Where there is a risk of harm, the OIPC, the Minister of Health and the patient must be notified.</p>':'<p class="small">No reports. Any staff member can report a concern from the menu.</p>')+'</div>';
  h += '<div class="neo panel deep"><div class="sub">Prototype data</div><p class="small" style="margin-top:8px">This environment is marked testing. Clinical results and treatment plans are not stored here. The audit log cannot be cleared from this screen.</p><button class="link" data-action="reset" style="margin-top:10px">Reset demo data</button></div></div></div>';
  return h;
}
const COMPLIANCE = [
  ['pia','Privacy Impact Assessment submitted to the OIPC','Each NP custodian, before patient data enters the portal or Jane (HIA s. 64)'],
  ['ima','Information manager agreements signed','Hosting, Jane, secure email, fax, the developer and any AI vendor (HIA s. 66)'],
  ['policies','Written privacy and security policies adopted','Access by role, storage, transport, disposal and transfers (CRNA 2.7)'],
  ['conf','Confidentiality agreements signed by all staff','Renewed yearly; required before first sign-in'],
  ['training','Privacy training completed by all staff','Including how to report a privacy concern'],
  ['breach','Breach response plan in place','Risk-of-harm assessment and notice to OIPC, Minister and patient'],
  ['retention','Retention schedule set','Records 10 years after last service (minors: longer); audit logs 10 years'],
  ['hosting','Canadian hosting and encryption confirmed','Encrypted at rest and in transit; backups encrypted'],
  ['security','Independent security test passed','Penetration test and access-control review before launch'],
  ['recovery','Backup recovery and continuity plan tested','How care continues if the portal is unavailable (CRNA 2.8)'],
  ['notice','Patient privacy notice published','Why information is collected, who sees it, Privacy Officer contact, AI use and any vendor outside Canada'],
  ['review','Audit logs reviewed on a set schedule','Named reviewer, written results, plus a review after every incident'],
  ['staffnotice','Staff told about activity monitoring','Policy explains that sign-ins and portal use are visible to the owner (PIPA)']
];
function auditPage(u){
  audit(u,'Viewed audit history','Audit history',true);
  let h = pageHead('Owner portal', 'Audit <em>history</em>', 'Every sign-in, record view, change and denied request. Entries cannot be edited or deleted.');
  h += '<div class="neo panel"><div class="filters"><label class="sr" for="au-u">Staff member</label><select class="select" id="au-u" data-filter="audit"><option value="">All staff</option>'+S.staff.map(s => '<option value="'+s.id+'"'+(auditPreset===s.id?' selected':'')+'>'+esc(fullName(s))+'</option>').join('')+'</select><label class="sr" for="au-o">Outcome</label><select class="select" id="au-o" data-filter="audit"><option value="">All outcomes</option><option value="ok">Allowed</option><option value="no">Denied or blocked</option></select><label class="sr" for="au-p">Patient</label><select class="select" id="au-p" data-filter="audit"><option value="">All patients</option>'+PATIENTS.map(p => '<option value="'+p.id+'">'+p.id+'</option>').join('')+'</select></div><p class="tiny" style="margin:-8px 0 18px">Choose a patient ID for a patient activity report: everyone who opened or changed that record. Patients can ask for this.</p><div id="au-table">'+auditTable()+'</div></div>';
  h += '<div class="notice sec">'+icon('audit')+'<div>Each entry records who, their role, when, what they did, the patient ID and the type of information, never the clinical details. In production the server writes entries to append-only storage and keeps them for 10 years from the date of use, as Alberta’s provincial logging standard requires. This prototype keeps the last 400 entries in your browser.</div></div>';
  h += '<div class="neo panel sec"><div class="panel-head"><div><span class="num">HIA s. 41</span><h2>Disclosure log</h2></div><span class="small">Kept 10 years from each disclosure</span></div>'+disclosureTable()+'</div>';
  setTimeout(() => { auditPreset = ''; }, 0);
  return h;
}
function disclosureTable(){
  if(!S.disclosures.length) return '<p class="small">No disclosures recorded.</p>';
  return '<div class="tbl-wrap"><table style="min-width:820px"><thead><tr><th>Date</th><th>Patient ID</th><th>Disclosed to</th><th>Purpose</th><th>What was disclosed</th><th>Recorded by</th></tr></thead><tbody>'+S.disclosures.map(d => '<tr><td class="m tnum" style="white-space:nowrap">'+new Date(d.t).toLocaleDateString('en-CA',{day:'numeric',month:'short',year:'numeric'})+'</td><td class="m tnum" style="white-space:nowrap">'+d.pid+'</td><td>'+esc(d.to)+'</td><td class="m">'+esc(d.purpose)+'</td><td class="m">'+esc(d.what)+'</td><td class="m">'+esc(staffName(d.by))+'</td></tr>').join('')+'</tbody></table></div>';
}
function auditTable(){
  const fu = (document.getElementById('au-u')||{}).value||auditPreset||'', fo = (document.getElementById('au-o')||{}).value||'', fp = (document.getElementById('au-p')||{}).value||'';
  const rows = S.audit.slice().reverse().filter(a => (!fu||a.uid===fu) && (!fo || (fo==='ok')===a.ok) && (!fp||a.pid===fp));
  return '<div class="tbl-wrap"><table style="min-width:980px"><thead><tr><th>When</th><th>Staff member</th><th>Action</th><th>Patient ID</th><th>Information type</th><th>Detail</th><th>Outcome</th></tr></thead><tbody>'+rows.map(a => { const s = byId(a.uid); const d = new Date(a.t); return '<tr><td class="m tnum">'+d.toLocaleDateString('en-CA',{day:'numeric',month:'short'})+', '+d.toLocaleTimeString('en-CA',{hour:'numeric',minute:'2-digit'})+'</td><td>'+(s?esc(fullName(s)):'Unknown')+'<div class="t-sub">'+(ROLE_LABEL[a.role||(s&&s.role)]||'')+'</div></td><td>'+esc(a.action)+'</td><td class="m tnum" style="white-space:nowrap">'+(a.pid||'—')+'</td><td class="m">'+esc(a.info||'—')+'</td><td class="m">'+esc(a.target)+'</td><td>'+(a.ok?pill('Allowed','p-deep'):pill('Denied','p-burgundy'))+'</td></tr>'; }).join('')+'</tbody></table></div>';
}

/* ADMIN */
function adminOverview(u){
  const c = reqCounts(), open = S.tasks.filter(t=>!t.done);
  let h = pageHead('Administration portal · '+todayStr(), greet(u), 'Today’s administrative queue, requisitions and Jane follow-ups.', '<button class="cta cta-solid" data-action="new-req">'+icon('plus',14)+' New patient lab requisition</button>');
  h += '<div class="grid g4">'+stat('Requisitions to prepare', c['Draft']+1,'1 draft · 1 new patient without one',{href:'#/admin/requisitions'})+stat('Awaiting authorization',c['Awaiting Authorization'],'With the responsible NP',{href:'#/admin/requisitions'})+stat('Ready to deliver',DELIVERIES.filter(d=>d.status==='Ready to Send').length,'Documents awaiting delivery',{href:'#/admin/documents'})+stat('Failed deliveries',DELIVERIES.filter(d=>d.status==='Failed').length,'Retry by an approved method',{href:'#/admin/documents',deep:true})+'</div>';
  h += '<div class="split sec"><div class="neo panel"><div class="panel-head"><div><span class="num">Queue</span><h2>Today’s tasks</h2></div><a class="link" href="#/admin/tasks">All tasks</a></div>'+taskList(open.slice(0,6))+'</div>';
  h += '<div class="neo panel"><div class="panel-head"><div><span class="num">Today</span><h2>Appointments</h2></div></div>'+apptList(APPTS,true)+'</div></div>';
  h += '<div class="neo panel sec"><div class="panel-head"><div><span class="num">Requisitions</span><h2>Workflow by status</h2></div><a class="link" href="#/admin/requisitions">Open requisitions</a></div>'+reqPipeline()+'</div>';
  const upd = PATIENTS.filter(p => (S.jane[p.id]||p.janeState)==='update');
  h += '<div class="neo panel sec"><div class="panel-head"><div><span class="num">Jane</span><h2>Manual updates needed</h2></div><span class="small">Changes made in Bloom that Jane does not have yet</span></div>'+(upd.length?'<ul class="list">'+upd.map(p => '<li><div><div class="t">'+esc(pName(p))+'</div><div class="tiny">'+p.id+' · Jane '+p.jane+' · demographics changed in Bloom</div></div><button class="cta cta-ghost cta-sm" data-action="jane-done" data-id="'+p.id+'">Mark updated in Jane</button></li>').join('')+'</ul>':'<p class="small">Every changed record has been updated in Jane.</p>')+'</div>';
  return h;
}
function taskList(list, clinical){
  if(!list.length) return '<p class="small" style="padding:12px 0">Nothing here. Well done.</p>';
  return '<ul class="list">'+list.map(t => '<li class="'+(t.done?'done':'')+'"><div class="row grow"><input type="checkbox" class="check" id="tk-'+t.id+'" '+(t.done?'checked':'')+' data-action-change="'+(clinical?'ctask':'task')+'" data-id="'+t.id+'" aria-label="Mark complete: '+esc(t.title)+'"><label for="tk-'+t.id+'" class="grow" style="cursor:pointer"><div class="t">'+esc(t.title)+'</div><div class="tiny">'+esc(pName(patient(t.pid)))+' · '+(t.cat?t.cat+' · ':'')+'Due '+esc(t.due)+(t.from?' · from '+staffShort(t.from):'')+'</div></label></div>'+(t.pr&&!t.done?pill(t.pr):'')+'</li>').join('')+'</ul>';
}
function requisitionsPage(u){
  let h = pageHead('Administration portal', 'Lab <em>requisitions</em>', 'Prepare standard initial requisitions for practitioner authorization. Admins prepare; only an authorized NP can authorize an order.', '<button class="cta cta-solid" data-action="new-req">'+icon('plus',14)+' New patient lab requisition</button>');
  h += '<div class="neo panel"><div class="panel-head"><h2>Workflow by status</h2></div>'+reqPipeline()+'</div>';
  h += '<div class="neo panel sec"><div class="tbl-wrap"><table style="min-width:760px"><thead><tr><th>ID</th><th>Patient</th><th>Responsible NP</th><th>Prepared by</th><th>Updated</th><th>Status</th></tr></thead><tbody>'+S.reqs.map(r => { const p = patient(r.pid); return '<tr><td class="tnum">'+r.id+'</td><th scope="row"><div class="t-name">'+esc(pName(p))+'</div><div class="t-sub">'+p.id+' · born '+fmtDob(p.dob)+'</div></th><td class="m">'+staffShort(r.np)+'</td><td class="m">'+staffName(r.by)+'</td><td class="m">'+esc(r.updated)+(r.note?'<div class="t-sub">'+esc(r.note)+'</div>':'')+'</td><td>'+pill(r.status)+'</td></tr>'; }).join('')+'</tbody></table></div></div>';
  return h;
}
function adminTasks(u){
  const cats = ['All','Requisitions','Delivery','Failed delivery','Demographics','Access & correction','Practitioner request','Operational'];
  const f = adminTasks.f || 'All', showDone = !!adminTasks.done;
  const list = S.tasks.filter(t => (f==='All'||t.cat===f) && (showDone||!t.done));
  let h = '<div class="panel-head" style="margin-bottom:14px"><div><span class="num">Clinic queue</span><h2>Administrative tasks</h2></div><span class="small">The shared daily queue. Summaries never include clinical details.</span></div>';
  h += '<div class="filters">'+cats.map(c => '<button class="chip'+(c===f?' on':'')+'" data-action="task-filter" data-f="'+c+'">'+c+'</button>').join('')+'<button class="chip muted" data-action="task-done">'+(showDone?'Hide completed':'Show completed')+'</button></div>';
  h += '<div class="neo panel"><div class="tbl-wrap"><table style="min-width:820px"><thead><tr><th class="w-min">Done</th><th>Task</th><th>Patient</th><th>Category</th><th>Due</th><th>Priority</th><th>Assigned to</th></tr></thead><tbody>'+list.map(t => '<tr class="'+(t.done?'done':'')+'"><td><input type="checkbox" class="check" '+(t.done?'checked':'')+' data-action-change="task" data-id="'+t.id+'" aria-label="Mark complete: '+esc(t.title)+'"></td><td><div class="t">'+esc(t.title)+'</div>'+(t.from?'<div class="t-sub">From '+staffShort(t.from)+'</div>':'')+'</td><td class="m">'+esc(pName(patient(t.pid)))+'</td><td class="m">'+t.cat+'</td><td class="m">'+t.due+'</td><td>'+pill(t.pr)+'</td><td><label class="sr" for="as-'+t.id+'">Assign</label><select class="select" id="as-'+t.id+'" style="height:40px;width:170px;font-size:0.84rem" data-action-change="assign" data-id="'+t.id+'">'+S.staff.filter(s=>s.role==='admin'&&s.status!=='deactivated').map(s => '<option value="'+s.id+'"'+(s.id===t.who?' selected':'')+'>'+esc(fullName(s))+'</option>').join('')+'</select></td></tr>').join('')+'</tbody></table></div>'+(list.length?'':'<p class="small" style="padding:16px 0">No tasks in this view.</p>')+'</div>';
  return h;
}
function deliveryPage(u){
  let h = pageHead('Administration portal', '<em>Documents</em>', 'Authorized documents waiting to reach patients, and anything that failed on the way.');
  h += phaseNote(6,'Secure email, fax and portal delivery connect once integrations are approved. For now, send through approved systems by hand and record the outcome here.');
  h += '<div class="neo panel"><div class="tbl-wrap"><table style="min-width:760px"><thead><tr><th>Document</th><th>Patient</th><th>Method</th><th>Status</th><th></th></tr></thead><tbody>'+DELIVERIES.map(d => { const st = S.deliv[d.id]||d.status; return '<tr><th scope="row"><div class="t-name">'+esc(d.doc)+'</div>'+(d.note&&st==='Failed'?'<div class="t-sub">'+esc(d.note)+'</div>':'')+'</th><td class="m">'+esc(pName(patient(d.pid)))+'</td><td class="m">'+d.method+'<div class="t-sub">To: '+esc(d.to)+'</div></td><td>'+pill(st)+'</td><td class="w-min">'+(st==='Sent'||st==='Authorized'?'':'<button class="link" data-action="record-send" data-id="'+d.id+'">'+(st==='Failed'?'Record resend':'Record send')+'</button>')+'</td></tr>'; }).join('')+'</tbody></table></div></div>';
  h += '<div class="notice sec">'+icon('info')+'<div><b>Faxing:</b> use a confidentiality cover sheet, key in the number each time (no pre-programmed numbers for health information) and confirm it arrived. <b>Email:</b> health information must travel encrypted.</div></div>';
  h += '<div class="neo panel sec"><div class="panel-head"><div><span class="num">HIA s. 41</span><h2>Disclosure log</h2></div><span class="small">Kept 10 years from each disclosure</span></div>'+disclosureTable()+'</div>';
  return h;
}
function selfSettings(u){
  const prac = isPrac(u);
  let h = pageHead(PORTAL_LABEL[u.role], (prac||u.role==='owner')?'Your <em>profile</em>':'Your <em>settings</em>', prac?'Your verified professional details fill clinical forms when you choose to include them.':'Your account and sign-in security.');
  h += '<div class="split"><div class="neo panel"><div class="panel-head"><h2>'+(prac?'Professional profile':'Account')+'</h2></div><dl class="dl"><div><dt>Name</dt><dd>'+esc(fullName(u))+'</dd></div><div><dt>Title</dt><dd>'+esc(u.title)+'</dd></div><div><dt>Email</dt><dd>'+esc(u.email)+'</dd></div>';
  if(prac) h += '<div><dt>Designation</dt><dd>'+esc(u.cred.label)+'</dd></div><div><dt>Registration</dt><dd>'+(u.cred.reg?u.cred.reg+' · verified by owner':'Not a regulated designation')+'</dd></div><div><dt>Clinic</dt><dd>'+esc(S.clinic.name)+' · '+esc(S.clinic.address)+'</dd></div><div><dt>Clinic phone / fax</dt><dd class="tnum">'+S.clinic.phone+' · '+S.clinic.fax+'</dd></div>';
  h += '</dl>'+(prac?'<p class="tiny" style="margin-top:14px">Registration details are verified by the owner. Ask them to update anything that is out of date. Your signature is never available to other practitioners.</p>':'')+'</div>';
  h += '<div class="stack"><div class="neo panel"><div class="panel-head"><h2>Sign-in security</h2></div><dl class="dl"><div><dt>Multifactor</dt><dd>'+esc(u.mfa)+'</dd></div><div><dt>Session</dt><dd>Signs out after '+S.timeout+' minutes of inactivity</dd></div></dl><div class="row" style="gap:12px;flex-wrap:wrap;margin-top:20px"><button class="cta cta-ghost cta-sm" data-action="integration" data-what="Changing your password">Change password</button><button class="cta cta-ghost cta-sm" data-action="integration" data-what="Signing out other devices">Sign out other devices</button></div></div>';
  h += '<div class="neo panel deep"><div class="sub">What you can do</div><ul class="list" style="margin-top:10px">'+[...effectivePerms(u)].map(p => '<li style="padding:10px 0"><span class="small" style="color:var(--ink)">'+PERMISSIONS[p].label+'</span></li>').join('')+'</ul></div></div></div>';
  if(can(u,'hub.view')) h += timeOffSection(u) + myActivity(u);
  return h;
}

/* PRACTITIONER */
function myCTasks(){ const u = me(); return S.ctasks.filter(t => t.who===u.id && (!t.needs || can(u,t.needs))); }
function pracOverview(u){
  const mine = PATIENTS.filter(p => careTeam(p).includes(u.id));
  const appts = APPTS.filter(a => a.staff.includes(u.id));
  const panels = PANELS.filter(x => x.np===u.id && x.status!=='Published');
  const plans = allPlans().filter(x => (x.by===u.id || x.reviewer===u.id) && planStatus(x).status!=='Published');
  const reqs = S.reqs.filter(r => r.np===u.id && r.status==='Awaiting Authorization');
  const np = u.cred && u.cred.type==='NP';
  let h = pageHead(PORTAL_LABEL[u.role]+' · '+todayStr(), greet(u), np?'Your patients and clinical work for today.':'Your patients, wellness plans and tasks for today.', can(u,'forms.generate')?'<a class="cta cta-ghost" href="#/'+u.role+'/forms">Form library</a><a class="cta cta-solid" href="#/'+u.role+'/results">Lab results '+icon('arrow',14)+'</a>':'<a class="cta cta-solid" href="#/'+u.role+'/careplans">Care plans '+icon('arrow',14)+'</a>');
  h += '<div class="grid g4">'+stat('Assigned patients',mine.length,'Active care relationships',{href:'#/'+u.role+'/patients'})+stat('Visits today',appts.length,appts[0]?'First at '+appts[0].time+' '+appts[0].ap:'None booked');
  h += can(u,'results.enter') ? stat('Results to review',panels.length,'Draft or ready for review',{href:'#/'+u.role+'/results'}) : stat('Wellness plans',allPlans().filter(x=>x.by===u.id||x.co===u.id).length,'Drafts and sections you own',{href:'#/'+u.role+'/careplans'});
  h += can(u,'requisitions.authorize') ? stat('To authorize',reqs.length,'Requisitions prepared by admin',{href:'#/'+u.role+'/tasks',deep:true}) : stat('Open tasks',myCTasks().filter(t=>!t.done).length,'Assigned to you',{href:'#/'+u.role+'/tasks',deep:true});
  h += '</div>';
  h += '<div class="split sec"><div class="neo panel"><div class="panel-head"><div><span class="num">Today</span><h2>Your visits</h2></div></div>'+(appts.length?apptList(appts,false):'<p class="small">No visits today.</p>')+'</div>';
  h += '<div class="neo panel"><div class="panel-head"><div><span class="num">Tasks</span><h2>Clinical tasks</h2></div><a class="link" href="#/'+u.role+'/tasks">All</a></div>'+taskList(myCTasks().filter(t=>!t.done).slice(0,4),true)+'</div></div>';
  h += '<div class="split sec">';
  if(can(u,'results.enter')) h += '<div class="neo panel"><div class="panel-head"><div><span class="num">Results</span><h2>Awaiting review</h2></div></div><ul class="list">'+(panels.map(x => '<li><div><div class="t">'+esc(pName(patient(x.pid)))+'</div><div class="tiny">'+x.name+' · collected '+x.date+' · '+x.n+' markers</div></div>'+pill(x.status)+'</li>').join('')||'<li><span class="small">All results are published.</span></li>')+'</ul></div>';
  h += '<div class="neo panel"><div class="panel-head"><div><span class="num">Care plans</span><h2>Awaiting publication</h2></div></div><ul class="list">'+(plans.map(x => '<li><div><div class="t">'+esc(pName(patient(x.pid)))+'</div><div class="tiny">'+x.kind+' · '+x.date+(x.reviewer===u.id?' · drafted by '+byId(x.by).first+', your review':'')+'</div></div>'+pill(planStatus(x).status)+'</li>').join('')||'<li><span class="small">Nothing waiting.</span></li>')+'</ul></div>';
  if(u.role==='holistic') h += '<div class="neo panel deep"><div class="sub">Your scope</div><p class="small" style="margin-top:8px">As a Holistic Practitioner you draft wellness sections and choose library resources. A Nurse Practitioner reviews and publishes care plans, and results and requisitions stay with NPs.</p></div>';
  h += '</div>';
  h += '<div class="grid g2 sec"><div class="neo panel"><div class="panel-head"><div><span class="num">Client portal</span><h2>Recent patient activity</h2></div></div><ul class="list">'+([].filter(r => mine.some(p => pName(p)===r[0])).map(r => '<li><div><div class="t">'+r[0]+'</div><div class="tiny">'+r[1]+'</div></div><span class="tiny">'+r[2]+'</span></li>').join('')||'<li><span class="small">No recent portal activity from your patients.</span></li>')+'</ul></div>';
  h += '<div class="neo panel deep"><div class="sub">Jane remains the primary chart</div><h2 style="font-size:1.7rem;margin-top:8px">Bloom is the patient-facing layer</h2><p class="small" style="margin-top:8px">Generated PDFs are downloaded here and uploaded to the patient’s Jane chart by you. Bloom does not upload to Jane or send faxes automatically.</p>'+(can(u,'forms.generate')?'<p class="tiny" style="margin-top:12px">Recently generated: Community Laboratory Requisition · Priya Raman · 16 Oct</p>':'')+'</div></div>';
  return h;
}
function resultsPage(u){
  let h = pageHead(PORTAL_LABEL[u.role], 'Lab <em>results</em>', 'Individual results stay in Jane. This screen keeps its place in the medical portal and does not store biomarker values.', '<button class="cta cta-ghost" type="button" data-action="integration" data-what="Opening lab results in Jane">View in Jane</button>');
  h += '<div class="neo panel"><div class="sub">Held in Jane</div><h2 style="margin-top:8px">No results are copied here</h2><p class="small" style="margin-top:10px">Draft, review and publish happen in Jane, which remains the clinical record. A Jane address can be saved by the owner. Until then the button explains that the address is still a placeholder.</p></div>';
  h += '<div class="grid g3 sec"><div class="neo panel"><div class="sub">Draft</div><p class="small" style="margin-top:8px">Entered in Jane. Invisible to the patient.</p></div><div class="neo panel"><div class="sub">Ready for Review</div><p class="small" style="margin-top:8px">Checked in Jane. Still invisible here.</p></div><div class="neo panel"><div class="sub">Published</div><p class="small" style="margin-top:8px">Shown to the patient through Jane, not through a second copy in Bloom.</p></div></div>';
  return h;
}
function clinicalTasks(u){
  const all = myCTasks();
  let h = '<div class="panel-head" style="margin-bottom:14px"><div><span class="num">Clinical queue</span><h2>'+(u.role==='holistic'?'Wellness tasks':'Clinical tasks')+'</h2></div><span class="small">Work generated by requisitions, results and care plans.</span></div>';
  h += '<div class="split"><div class="neo panel"><div class="panel-head"><h2>Open</h2></div>'+taskList(all.filter(t=>!t.done),true)+'</div><div class="neo panel"><div class="panel-head"><h2>Completed</h2></div>'+taskList(all.filter(t=>t.done),true)+'</div></div>';
  return h;
}

/* client-portal previews (exact look of the existing Results / Care plans pages) */
function previewResults(){
  openDialog('<div class="sub">Patient view</div><h2>Results stay in Jane</h2><p class="small" style="margin-top:10px">The client portal keeps the Results screen, and it does not display biomarker values from this database.</p><div class="acts"><button class="cta cta-solid" data-action="close">Close</button></div>');
}
function previewPlan(){
  openDialog('<div class="sub">Patient view</div><h2>Clinical care plans stay in Jane</h2><p class="small" style="margin-top:10px">A published wellness note can appear in the client portal after Nurse Practitioner approval. Treatment recommendations are not stored here.</p><div class="acts"><button class="cta cta-solid" data-action="close">Close</button></div>');
}


/* ---------- 11. care plan editor ----------
   Two templates: Clinical assessment (Medical Practitioner) and Wellness assessment (Holistic Practitioner).
   The full assessment stays internal. Only the curated "Patient care plan" fields ever reach the client portal. */
const BIO_LIBRARY = {
  'Complete Blood Count':['White Blood Cell Count (WBC)','Red Blood Cell Count (RBC)','Hemoglobin','Hematocrit','MCV','MCH','MCHC','RDW','Platelet Count','Mean Platelet Volume','Neutrophils','Lymphocytes','Monocytes','Eosinophils','Basophils','Reticulocyte Count'],
  'Iron & Anemia':['Ferritin','Serum Iron','Transferrin','TIBC','Transferrin Saturation','Vitamin B12','Folate','Methylmalonic Acid','Homocysteine'],
  'Glucose & Metabolic':['Fasting Glucose','Random Glucose','Hemoglobin A1c','Fasting Insulin','C-Peptide','OGTT — Fasting','OGTT — 1 Hour','OGTT — 2 Hours','HOMA-IR','Uric Acid'],
  'Lipids & Cardiovascular':['Total Cholesterol','LDL Cholesterol','HDL Cholesterol','Non-HDL Cholesterol','Triglycerides','Total Cholesterol / HDL Ratio','Apolipoprotein B','Apolipoprotein A1','Lipoprotein(a)','High-Sensitivity CRP','NT-proBNP'],
  'Thyroid':['TSH','Free T4','Free T3','Total T4','Total T3','TPO Antibodies','Thyroglobulin Antibodies','TSH Receptor Antibodies','Thyroglobulin'],
  'Reproductive & Sex Hormones':['Total Testosterone','Free Testosterone','Calculated Free Testosterone','SHBG','Estradiol','Progesterone','FSH','LH','Prolactin','DHEA-S','Androstenedione','17-Hydroxyprogesterone','Anti-Müllerian Hormone','Beta-hCG','PSA'],
  'Adrenal & Pituitary':['Morning Serum Cortisol','ACTH','Aldosterone','Renin','Aldosterone-to-Renin Ratio','IGF-1','Growth Hormone','24-Hour Urinary Free Cortisol','Late-Night Salivary Cortisol'],
  'Liver':['ALT','AST','ALP','GGT','Total Bilirubin','Direct Bilirubin','Albumin','Total Protein','Globulin','INR','LDH'],
  'Kidney & Electrolytes':['Creatinine','Estimated GFR','Urea','Sodium','Potassium','Chloride','Bicarbonate','Calcium','Ionized Calcium','Phosphate','Magnesium','Urine Albumin-to-Creatinine Ratio','Urine Protein-to-Creatinine Ratio','Urinalysis','Urine Culture'],
  'Vitamins & Minerals':['Vitamin D (25-OH)','Vitamin B1','Vitamin B6','Vitamin A','Vitamin E','Vitamin C','Zinc','Copper','Ceruloplasmin','Selenium'],
  'Inflammation & Autoimmune':['C-Reactive Protein','Erythrocyte Sedimentation Rate','Rheumatoid Factor','Anti-CCP','ANA','Anti-dsDNA','ENA Panel','Complement C3','Complement C4','Immunoglobulin G','Immunoglobulin A','Immunoglobulin M','Total IgE','Tissue Transglutaminase IgA','Total IgA'],
  'Digestive':['Fecal Calprotectin','Fecal Immunochemical Test','H. pylori Stool Antigen','H. pylori Breath Test','Pancreatic Elastase','Stool Culture / PCR','Ova and Parasite Testing','Celiac Serology','Lipase','Amylase','Fecal Fat'],
  'Bone & Mineral':['Parathyroid Hormone','Bone-Specific Alkaline Phosphatase','P1NP','CTX'],
  'Additional':['Coagulation studies','Infectious disease testing','Therapeutic drug monitoring','Genetic testing','Toxicology testing','Imaging results','ECG findings','Bone density results']
};
const BIO_STATUS = ['In range','Below range','Above range','Borderline','Critical'];
const ROS_SYSTEMS = ['Constitutional','Eyes, ears, nose, throat','Cardiovascular','Respiratory','Gastrointestinal','Genitourinary','Musculoskeletal','Neurological','Endocrine','Dermatological','Hematological','Psychiatric','Reproductive'];

/* schema helpers: [key, label, type, opts] · types: text, area, seg, table, grid(text fields in 2 cols), ros, bio, herbs, checks, note */
const CLINICAL_SCHEMA = [
  { n:'Patient & consultation', f:[['visitType','Visit type','seg',['Initial consultation','Follow-up']],['format','Visit format','seg',['Virtual','Telephone']],['idVerified','Patient identity verified','seg',['Yes','No']],['consent','Consent for consultation','seg',['Obtained','Not obtained']],['reason','Primary reason for visit','area'],['concerns','Main health concerns','area'],['goals','Patient’s health goals','area']] },
  { n:'History of presenting concerns', f:[['hx','','grid',[['symptoms','Primary symptoms'],['onset','Onset and duration'],['severity','Frequency and severity'],['aggravating','Aggravating factors'],['relieving','Relieving factors'],['associated','Associated symptoms'],['prevInv','Previous investigations'],['prevTx','Previous treatments'],['impact','Impact on daily activities'],['priorities','Patient’s priorities and expectations']]]] },
  { n:'Medical history', f:[['conditions','Medical conditions','area'],['surgical','Surgical history','text'],['hospital','Hospitalizations','text'],['family','Family medical history','area'],['meds','Current medications','table',['Medication','Dose','Frequency','Indication']],['supps','Supplements and herbal products','table',['Product','Dose','Frequency','Reason for use']],['allergies','Allergies and reactions','text'],['specialists','Specialist involvement','text'],['screening','Preventative screening history','text']] },
  { n:'Lifestyle & functional health', f:[['ls','','grid',[['nutrition','Nutrition'],['sleep','Sleep'],['activity','Physical activity'],['stress','Stress & mental wellbeing'],['digestive','Digestive health'],['hormonal','Hormonal & reproductive health'],['environment','Environmental & social factors']]]] },
  { n:'Review of systems', f:[['ros','Pertinent positives and negatives','ros']] },
  { n:'Physical assessment', f:[['vit','','vitals',[['bp','Blood pressure'],['hr','Heart rate'],['rr','Respiratory rate'],['temp','Temperature'],['spo2','Oxygen saturation'],['height','Height'],['weight','Weight'],['bmi','BMI, if relevant']]],['measures','Patient-reported measurements','text'],['findings','Relevant examination findings','area'],['limits','Virtual assessment limitations','text']] },
  { n:'Biomarker review', f:[['bio','','bio']] },
  { n:'Laboratory interpretation', f:[['li','','grid',[['significant','Significant findings'],['abnormal','Abnormal or critical results'],['changes','Changes since previous results'],['correlation','Correlation with symptoms'],['furtherInv','Further investigations'],['labReferrals','Referrals indicated'],['urgent','Urgent follow-up or safety actions']]]] },
  { n:'Clinical assessment', f:[['ca','','grid',[['summary','Clinical summary'],['differential','Differential diagnoses'],['confirmed','Confirmed diagnoses'],['contributing','Contributing factors'],['risk','Risk factors'],['clinPriorities','Clinical priorities']]]] },
  { n:'Treatment plan', f:[['tp','','grid',[['rx','Medical treatment / prescriptions'],['medAdjust','Medication adjustments'],['nutritionRec','Nutrition'],['suppRec','Supplements'],['activityRec','Physical activity'],['sleepRec','Sleep'],['stressRec','Stress management'],['preventive','Preventative care'],['education','Patient education'],['referrals','Referrals'],['monitoring','Monitoring and safety']]]] },
  { n:'Follow-up plan', f:[['fu','','grid',[['repeatLabs','Repeat laboratory testing'],['interval','Follow-up interval'],['txMonitoring','Treatment monitoring'],['instructions','Patient instructions'],['redFlags','Symptoms needing earlier assessment']]]] },
  { n:'Documentation', f:[['checks','','checks',[['jane','Clinical documentation completed in Jane'],['understanding','Patient understanding confirmed'],['sdm','Shared decision-making documented'],['ready','Care plan ready for publication']]]] }
];
const WELLNESS_SCHEMA = [
  { n:'Client & consultation', f:[['visitType','Visit type','seg',['Initial consultation','Follow-up']],['format','Visit format','seg',['Virtual','Telephone']],['idVerified','Client identity verified','seg',['Yes','No']],['consent','Consent for consultation','seg',['Obtained','Not obtained']],['concerns','Primary wellness concerns','area'],['goals','Client’s main wellness goals','area'],['prevHerbal','Previous experience with herbal medicine','text']] },
  { n:'Wellness history', f:[['wh','','grid',[['general','General wellbeing'],['digestive','Digestive wellness'],['sleep','Sleep & restoration'],['stress','Stress & emotional wellbeing'],['nutrition','Nutrition'],['activity','Physical activity'],['hormonal','Hormonal & reproductive'],['environment','Environment & lifestyle']]]] },
  { n:'Medical & supplement history', f:[['conditions','Existing medical conditions','text'],['rxMeds','Prescription medications','table',['Medication','Dose','Frequency']],['otc','OTC medications','text'],['supps','Supplements','table',['Supplement','Dose','Frequency']],['herbsNow','Current herbal products','table',['Herb','Preparation','Dose','Frequency']],['allergies','Allergies & previous reactions','text'],['investigations','Relevant investigations or concerns','text']] },
  { n:'Herbal safety assessment', f:[['interactions','Medication–herb interactions reviewed','seg',['Yes','No']],['allergiesReviewed','Allergies reviewed','seg',['Yes','No']],['sa','','grid',[['pregnancy','Pregnancy / breastfeeding'],['liverKidney','Liver / kidney considerations'],['bleeding','Bleeding risk / anticoagulants'],['surgery','Upcoming surgery'],['prevReactions','Previous herbal reactions'],['contraindications','Contraindications identified']]],['referral','Medical referral required','seg',['Yes','No']],['safetyNotes','Safety notes','area']] },
  { n:'Holistic wellness assessment', f:[['ha','','grid',[['energy','Energy & vitality'],['digestiveP','Digestive patterns'],['sleepP','Sleep & restoration patterns'],['stressP','Stress & coping patterns'],['nutritionP','Nutritional patterns'],['lifestyle','Lifestyle contributors'],['strengths','Strengths & healthy habits'],['barriers','Barriers to wellness goals'],['priorities','Priority areas for support']]],['n1','Traditional herbal frameworks may be noted here where relevant to training, but never presented as a medical diagnosis.','note']] },
  { n:'Herbal recommendations', f:[['herbs','','herbs']] },
  { n:'Nutrition plan', f:[['np','','grid',[['currentDiet','Current dietary pattern'],['nutritionPriorities','Nutritional priorities'],['foodRecs','Food-based recommendations'],['mealPlan','Meal planning guidance'],['proteinFibre','Protein & fibre goals'],['hydration','Hydration goals'],['nutritionEd','Education provided'],['nutritionBarriers','Barriers & practical solutions']]]] },
  { n:'Lifestyle plan', f:[['lp','','grid',[['sleepRec','Sleep'],['stressRec','Stress management'],['movement','Movement'],['mindfulness','Relaxation / mindfulness'],['routines','Daily wellness routines'],['envRec','Environment / lifestyle'],['clientGoals','Client-selected goals']]]] },
  { n:'Collaborative care', f:[['cc','','grid',[['observations','Observations for the Nurse Practitioner'],['medicalConcerns','Potential medical concerns'],['interactionConcerns','Medication / herbal interaction concerns'],['consult','Referral or consultation recommended'],['communication','Communication with care team']]],['n2','Recommendations stay within the herbalist’s scope and complement, never replace, medical assessment and treatment.','note']] },
  { n:'Follow-up assessment', f:[['fa','','grid',[['changes','Changes since previous visit'],['improvements','Client-reported improvements'],['tolerability','Herbal product tolerability'],['adverse','Adverse effects or new concerns'],['nutritionProg','Nutrition progress'],['lifestyleProg','Lifestyle progress'],['updatedRecs','Updated recommendations'],['nextDate','Next follow-up']]]] },
  { n:'Documentation', f:[['checks','','checks',[['assessment','Assessment completed'],['safety','Safety review completed'],['understanding','Client understanding confirmed'],['ready','Wellness plan ready for publication']]]] }
];

/* the curated, client-facing sections — what clients care about most */
const CLINICAL_PATIENT = [
  ['p_why','Why you came in','area','In the patient’s own terms: the reason for this visit.'],
  ['p_discussed','What we talked about','area','A plain-language summary. No diagnostic codes or differentials.'],
  ['p_feeling','How you’ve been feeling','area','What the patient told you, in their words.'],
  ['p_results','Your results, in brief','results','Choose the few results that matter for this plan. Each needs a one-line explanation.'],
  ['p_plan','Your plan','lines','One clear action per line.'],
  ['p_meds','Medications & supplements','ptable','Only what the patient takes or should start, with simple instructions.'],
  ['p_next','Next steps','lines','Labs, bookings and anything the patient needs to do.'],
  ['p_sooner','Reach out sooner if','lines','Symptoms that should not wait for the next visit.']
];
const WELLNESS_PATIENT = [
  ['w_discussed','What we discussed','area','A warm, plain summary of the visit.'],
  ['w_goals','Your wellness goals','lines','The goals the client chose, one per line.'],
  ['w_herbs','Your herbal recommendations','herbcards','Built from the herbal recommendations. Untick any herb you do not want shown yet.'],
  ['w_nutrition','Your nutrition plan','lines','Simple food actions, one per line.'],
  ['w_rituals','Your daily rituals','lines','Sleep, stress and movement habits, one per line.'],
  ['w_next','Your next steps','lines','What happens next and who does it.'],
  ['w_sooner','Contact us if','lines','Reactions or changes that need a call.']
];

/* demo content (fictional) */
let DEMO_PLANS = {};
PLANS.forEach((x,i) => { if(!x.id) x.id = 'WP-'+(i+1); if(!x.type){ const who = byId(x.by); x.type = who && who.role==='holistic' ? 'wellness' : 'clinical'; } });
function planStatus(x){ return (S.planMeta && S.planMeta[x.id]) || { status:x.status, ver:x.ver }; }
function allPlans(){ return PLANS.concat(S.newPlans||[]); }
function planDraft(x){
  S.drafts = S.drafts || {};
  if(!S.drafts[x.id]) S.drafts[x.id] = DEMO_PLANS[x.id] ? JSON.parse(JSON.stringify(DEMO_PLANS[x.id])) : blankDraft(x);
  return S.drafts[x.id];
}
function blankDraft(x){
  const d = { hide:{}, checks:{}, bio:[], herbs:[], meds:[['','','','']], supps:[['','','','']], rxMeds:[['','','']], herbsNow:[['','','','']], p_meds:[['','','']] };
  return d;
}
let planUI = { tab:'assessment', open:{ 0:true }, bioCat:'Glucose & Metabolic', bioQ:'' };
function canOpenPlan(u, x){
  if(!(x.by===u.id || x.co===u.id || x.reviewer===u.id)) return false;
  if(x.type==='clinical' && u.role!=='medical') return false;
  return true;
}
function getPath(o, path){ return path.split('.').reduce((a,k) => a==null?undefined:a[k], o); }
function setPath(o, path, v){ const ks = path.split('.'); let a = o; ks.slice(0,-1).forEach((k,i) => { if(a[k]==null) a[k] = /^\d+$/.test(ks[i+1])?[]:{}; a = a[k]; }); a[ks[ks.length-1]] = v; }

/* ---- field renderers ---- */
function fText(d,k,label,area,sm){ const v = getPath(d,k)||''; const id = 'f-'+k.replace(/\./g,'-'); const s = d.src && d.src[k], sc = s ? ' src-'+s : ''; return '<div class="field"><div class="fl-head"><label for="'+id+'">'+esc(label)+'</label><span data-src-for="'+k+'">'+srcTag(d,k)+'</span></div>'+(area?'<textarea class="input pf'+(sm?' sm':'')+sc+'" id="'+id+'" data-k="'+k+'">'+esc(v)+'</textarea>':'<input class="input pf'+sc+'" id="'+id+'" data-k="'+k+'" value="'+esc(v)+'">')+'</div>'; }
function fSeg(d,k,label,opts){ const v = getPath(d,k)||''; return '<div class="field"><span class="lbl">'+esc(label)+'</span><div class="seg" role="radiogroup" aria-label="'+esc(label)+'">'+opts.map(o => '<button type="button" role="radio" aria-checked="'+(v===o)+'" class="seg-b'+(v===o?' on':'')+'" data-action="seg" data-k="'+k+'" data-v="'+esc(o)+'">'+esc(o)+'</button>').join('')+'</div></div>'; }
function fTable(d,k,label,cols){
  const rows = getPath(d,k)||[];
  return '<div class="field"><div class="fl-head"><span class="lbl">'+esc(label)+'</span><span data-src-for="'+k+'">'+srcTag(d,k)+'</span></div><div class="tbl-wrap"><table class="etable" style="min-width:'+(cols.length*150)+'px"><thead><tr>'+cols.map(c => '<th>'+esc(c)+'</th>').join('')+'<th></th></tr></thead><tbody>'+rows.map((r,i) => '<tr>'+cols.map((c,j) => '<td><input class="input pf mini" aria-label="'+esc(c)+' '+(i+1)+'" data-k="'+k+'.'+i+'.'+j+'" value="'+esc(r[j]||'')+'"></td>').join('')+'<td class="w-min"><button type="button" class="icon-btn xs" data-action="row-del" data-k="'+k+'" data-i="'+i+'" aria-label="Remove row">'+icon('close',12)+'</button></td></tr>').join('')+'</tbody></table></div><button type="button" class="link" data-action="row-add" data-k="'+k+'" data-n="'+cols.length+'" style="align-self:flex-start">Add row</button></div>';
}
function fGrid(d,k,items){ return '<div class="egrid">'+items.map(it => fText(d,k+'.'+it[0],it[1],true,true)).join('')+'</div>'; }
function fVitals(d,k,items){ return '<div class="egrid four">'+items.map(it => fText(d,k+'.'+it[0],it[1],false)).join('')+'</div>'; }
function fRos(d,k){ const v = getPath(d,k)||{}; return '<div class="field"><span class="lbl">Pertinent positives and negatives</span><div class="ros">'+ROS_SYSTEMS.map(sys => { const cur = v[sys]||'Not reviewed'; return '<div class="ros-row"><span class="small" style="color:var(--ink)">'+sys+'</span><div class="seg">'+['Not reviewed','Negative','Positive'].map(o => '<button type="button" class="seg-b sm'+(cur===o?' on':'')+(o==='Positive'&&cur===o?' pos':'')+'" data-action="seg" data-k="'+k+'.'+sys+'" data-v="'+o+'">'+o+'</button>').join('')+'</div></div>'; }).join('')+'</div></div>'; }
function fChecks(d,k,items){ const v = getPath(d,k)||{}; return '<div class="stack" style="gap:2px">'+items.map(it => '<label class="perm-row" style="cursor:pointer"><span style="font-size:0.92rem">'+esc(it[1])+'</span><input type="checkbox" class="check" data-k="'+k+'.'+it[0]+'"'+(v[it[0]]?' checked':'')+'></label>').join('')+'</div>'; }
function fBio(d){
  const rows = d.bio||[], q = planUI.bioQ.toLowerCase();
  const lib = Object.keys(BIO_LIBRARY).map(c => [c, BIO_LIBRARY[c].filter(n => (!q && c===planUI.bioCat) || (q && n.toLowerCase().includes(q)))]).filter(x => x[1].length);
  let h = '<div class="bio-lib pressed"><div class="filters" style="margin-bottom:12px"><label class="sr" for="bio-q">Search biomarkers</label><input class="input" id="bio-q" placeholder="Search the biomarker library" value="'+esc(planUI.bioQ)+'" data-bioq="1"><label class="sr" for="bio-c">Category</label><select class="select" id="bio-c" data-biocat="1">'+Object.keys(BIO_LIBRARY).map(c => '<option'+(c===planUI.bioCat?' selected':'')+'>'+c+'</option>').join('')+'</select></div><div class="bio-chips">'+lib.map(x => x[1].map(n => { const added = rows.some(r => r.name===n); return '<button type="button" class="chip'+(added?' on':'')+'" data-action="bio-add" data-name="'+esc(n)+'" data-cat="'+esc(x[0])+'"'+(added?' disabled':'')+'>'+(added?icon('check',12)+' ':'')+esc(n)+'</button>'; }).join('')).join('')+'</div><p class="tiny" style="margin-top:10px">Add only what is relevant to this presentation. Units and reference ranges come from the lab report; never assume them.</p></div>';
  if(!rows.length) return h+'<p class="small" style="margin-top:16px">No biomarkers added yet.</p>';
  h += '<div class="tbl-wrap" style="margin-top:18px"><table class="etable" style="min-width:1040px"><thead><tr><th>Biomarker</th><th>Result</th><th>Unit</th><th>Reference range</th><th>Previous</th><th>Collected</th><th>Status</th><th>Clinical notes</th><th></th></tr></thead><tbody>'+rows.map((r,i) => '<tr><th scope="row" style="min-width:150px"><div class="t-name" style="font-size:0.86rem">'+esc(r.name)+'</div><div class="t-sub">'+esc(r.cat)+'</div></th>'+[['result',70],['unit',80],['range',110],['prev',70],['date',80]].map(c => '<td><input class="input pf mini" style="width:'+c[1]+'px" aria-label="'+c[0]+' for '+esc(r.name)+'" data-k="bio.'+i+'.'+c[0]+'" value="'+esc(r[c[0]]||'')+'"></td>').join('')+'<td><select class="select pf mini" style="width:140px" aria-label="Status for '+esc(r.name)+'" data-k="bio.'+i+'.status">'+BIO_STATUS.map(s => '<option'+(r.status===s?' selected':'')+'>'+s+'</option>').join('')+'</select></td><td><input class="input pf mini" style="width:180px" aria-label="Notes for '+esc(r.name)+'" data-k="bio.'+i+'.notes" value="'+esc(r.notes||'')+'"></td><td class="w-min"><button type="button" class="icon-btn xs" data-action="row-del" data-k="bio" data-i="'+i+'" aria-label="Remove '+esc(r.name)+'">'+icon('close',12)+'</button></td></tr>').join('')+'</tbody></table></div>';
  return h;
}
const HERB_FIELDS = [['common','Common name'],['latin','Latin botanical name'],['part','Plant part','sel',['Leaf','Root','Flower','Seed','Bark','Other']],['prep','Preparation','sel',['Tea / infusion','Decoction','Tincture','Capsule','Topical','Other']],['product','Product / manufacturer (NPN)'],['standard','Concentration / standardization'],['amount','Suggested amount'],['frequency','Frequency'],['duration','Duration'],['review','Review date'],['goal','Intended wellness goal','area'],['rationale','Rationale & evidence','area'],['contra','Contraindications','area'],['interact','Medication interactions','area'],['adverse','Possible adverse effects','area'],['monitor','Monitoring instructions','area']];
function fHerbs(d){
  const hs = d.herbs||[];
  return '<div class="stack" style="gap:18px">'+hs.map((hb,i) => '<div class="pressed" style="padding:20px 22px"><div class="row" style="justify-content:space-between;margin-bottom:12px"><div><span class="num" style="margin:0">Botanical '+(i+1)+'</span><div style="font-family:var(--serif);font-size:1.5rem">'+esc(hb.common||'New botanical')+(hb.latin?' <i class="small">'+esc(hb.latin)+'</i>':'')+'</div></div><div class="row" style="gap:12px">'+(hb.common?(() => { const ph = plantPhoto(hb.common); return '<label class="ph-up" title="Macro photo of '+esc(hb.common)+', matching Bloom’s brand photography: close up, soft natural light, shallow depth of field, portrait 4:5">'+(ph?'<span class="ph-th" style="background-image:url(\''+ph+'\')"></span>Replace photo':icon('upload',13)+' Add plant photo')+'<input type="file" accept="image/jpeg,image/png,image/webp" data-plantfile="'+esc(hb.common)+'"></label>'; })():'')+'<button type="button" class="icon-btn xs" data-action="row-del" data-k="herbs" data-i="'+i+'" aria-label="Remove botanical">'+icon('close',12)+'</button></div><div class="egrid four">'+HERB_FIELDS.filter(f => f[2]!=='area').map(f => f[2]==='sel' ? '<div class="field"><label for="hb-'+i+'-'+f[0]+'">'+f[1]+'</label><select class="select pf" id="hb-'+i+'-'+f[0]+'" data-k="herbs.'+i+'.'+f[0]+'">'+f[3].map(o => '<option'+(hb[f[0]]===o?' selected':'')+'>'+o+'</option>').join('')+'</select></div>' : fText(d,'herbs.'+i+'.'+f[0],f[1],false)).join('')+'</div><div class="egrid" style="margin-top:12px">'+HERB_FIELDS.filter(f => f[2]==='area').map(f => fText(d,'herbs.'+i+'.'+f[0],f[1],true,true)).join('')+'</div></div>').join('')+'<button type="button" class="cta cta-ghost cta-sm" data-action="herb-add" style="align-self:flex-start">'+icon('plus',12)+' Add another botanical</button><p class="tiny">Plant photos are shared across the clinic: add one per plant and every client plan that recommends it shows the same photo. Use close-up macro shots that match Bloom’s brand photography.</p></div>';
}
function renderField(d,f){
  const [k,label,type,opts] = f;
  if(type==='text') return fText(d,k,label,false);
  if(type==='area') return fText(d,k,label,true);
  if(type==='seg') return fSeg(d,k,label,opts);
  if(type==='table') return fTable(d,k,label,opts);
  if(type==='grid') return fGrid(d,k,opts);
  if(type==='vitals') return fVitals(d,k,opts);
  if(type==='ros') return fRos(d,k);
  if(type==='checks') return fChecks(d,k,opts);
  if(type==='bio') return fBio(d);
  if(type==='herbs') return fHerbs(d);
  if(type==='note') return '<p class="tiny" style="font-style:italic">'+esc(label)+'</p>';
  return '';
}

/* ---- client-facing render (client portal Care plans style) ---- */
function linesOf(t){ return String(t||'').split('\n').map(x => x.trim()).filter(Boolean); }
function pubList(t){ const l = linesOf(t); return l.length ? '<ol class="plan">'+l.map(x => '<li>'+esc(x)+'</li>').join('')+'</ol>' : ''; }
function patientPlanHTML(x, d){
  const pt = patient(x.pid), author = byId(x.by), wellness = x.type==='wellness', hide = d.hide||{};
  const on = k => !hide[k];
  const sec = (k, title, body) => on(k) && body ? '<section class="cpp-sec"><h3>'+title+'</h3>'+body+'</section>' : '';
  let h = '<div class="cp-bar"><span class="brand logo-link"><img class="bloom-mark" src="/assets/logo/bloom-logo-animated-hover-dark.svg" alt="Bloom Integrative Health"></span><span class="tiny">Insights · Results · <b style="color:var(--burgundy);font-weight:400">Care plans</b> · Library</span></div>';
  h += '<article class="note cpp"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:10px"><div class="sub">'+esc(x.date)+' · '+esc(d.visitType||x.kind)+'</div><span class="pill p-emerald plain">'+esc(x.kind)+'</span></div>';
  h += '<h2 class="cpp-title">'+(wellness?'Your wellness plan':'Your visit summary')+'</h2><div class="small">'+(wellness?'Prepared by '+esc(author.first)+', your Herbalist &amp; Nutrition Specialist':'Written by '+esc(author.first)+', your Nurse Practitioner')+'</div>';
  if(!wellness){
    h += '<div class="cpp-cols">'+sec('p_why','Why you came in','<p>'+esc(d.p_why||'')+'</p>')+sec('p_feeling','How you’ve been feeling','<p>'+esc(d.p_feeling||'')+'</p>')+'</div>';
    h += sec('p_discussed','What we talked about','<p>'+esc(d.p_discussed||'')+'</p>');
    const res = (d.bio||[]).filter(r => r.show);
    h += sec('p_results','Your results, in brief', res.length ? '<div class="cpp-res">'+res.map(r => '<div class="cpp-r"><div class="row" style="justify-content:space-between;gap:8px"><span class="name">'+esc(r.name)+'</span><span class="pill plain '+(r.status==='In range'?'p-emerald':r.status==='Critical'?'p-burgundy':'p-lilac')+'">'+esc(r.status)+'</span></div><div class="v">'+esc(r.result)+'<small>'+esc(r.unit)+'</small></div><p class="small">'+esc(r.plain||'')+'</p></div>').join('')+'</div><button type="button" class="link" data-action="preview-results" style="margin-top:12px">See all your results</button>' : '');
    h += sec('p_plan','Your plan', pubList(d.p_plan));
    const meds = (d.p_meds||[]).filter(r => r[0]);
    h += sec('p_meds','Medications &amp; supplements', meds.length ? '<ul class="list">'+meds.map(r => '<li style="display:block"><div class="t">'+esc(r[0])+'</div><div class="small">'+esc(r[1])+(r[2]?' · '+esc(r[2]):'')+'</div></li>').join('')+'</ul>' : '');
    h += sec('p_next','Next steps', pubList(d.p_next));
    h += on('p_sooner') && linesOf(d.p_sooner).length ? '<div class="cpp-alert"><div class="sub">Reach out sooner if</div><ul>'+linesOf(d.p_sooner).map(l => '<li>'+esc(l)+'</li>').join('')+'</ul><p class="tiny">Message us in the portal or call the clinic. For chest pain, trouble breathing or any emergency, call 911.</p></div>' : '';
  } else {
    h += sec('w_discussed','What we discussed','<p>'+esc(d.w_discussed||'')+'</p>');
    const goals = linesOf(d.w_goals);
    h += sec('w_goals','Your wellness goals', goals.length ? '<div class="cpp-goals">'+goals.map(g => '<span class="cpp-goal">'+esc(g)+'</span>').join('')+'</div>' : '');
    const herbs = (d.herbs||[]).filter(hb => hb.show!==false && hb.common);
    h += sec('w_herbs','Your herbal recommendations', herbs.length ? '<div class="cpp-herbs">'+herbs.map(hb => '<div class="cpp-herb"><div class="hn">'+esc(hb.common)+'</div>'+(hb.latin?'<div class="hl">'+esc(hb.latin)+'</div>':'')+'<p class="small" style="margin-top:8px;color:var(--ink)">'+esc(hb.goal||'')+'</p><dl><div><dt>How</dt><dd>'+esc([hb.amount,hb.prep&&hb.prep.split(' / ')[0].toLowerCase()].filter(Boolean).join(' of ')||'')+'</dd></div><div><dt>When</dt><dd>'+esc(hb.frequency||'')+'</dd></div><div><dt>For</dt><dd>'+esc(hb.duration||'')+'</dd></div></dl>'+(hb.monitor?'<p class="tiny" style="margin-top:8px">'+esc(hb.monitor)+'</p>':'')+'</div>').join('')+'</div><p class="tiny" style="margin-top:12px">Choose products with a Natural Product Number (NPN) on the label. Your herbal plan works alongside your medical care, never instead of it.</p>' : '');
    h += '<div class="cpp-cols">'+sec('w_nutrition','Your nutrition plan', pubList(d.w_nutrition))+sec('w_rituals','Your daily rituals', pubList(d.w_rituals))+'</div>';
    h += sec('w_next','Your next steps', pubList(d.w_next));
    h += on('w_sooner') && linesOf(d.w_sooner).length ? '<div class="cpp-alert"><div class="sub">Contact us if</div><ul>'+linesOf(d.w_sooner).map(l => '<li>'+esc(l)+'</li>').join('')+'</ul><p class="tiny">Stop the herb and message us in the portal. For any emergency, call 911.</p></div>' : '';
  }
  h += '<p class="tiny" style="margin-top:22px">Questions about your plan? Message your care team in the portal or ask Daisy for general wellness help.</p></article>';
  return h;
}

/* ---- missing items before publish ---- */
function planGaps(x, d){
  const g = [], wellness = x.type==='wellness', c = d.checks||{};
  const ap = aiPending(d); if(ap) g.push(ap+' AI suggestion'+(ap>1?'s':'')+' still to review (edit or keep each one)');
  if(d.idVerified!=='Yes') g.push('Identity not verified');
  if(d.consent!=='Obtained') g.push('Consent not recorded');
  if(!wellness){
    if(!c.jane) g.push('Clinical documentation in Jane not confirmed');
    if(!c.understanding) g.push('Patient understanding not confirmed');
    if(!c.sdm) g.push('Shared decision-making not documented');
    if(!c.ready) g.push('Not marked ready for publication');
    if(!(d.p_discussed||'').trim()) g.push('“What we talked about” is empty');
    if(!linesOf(d.p_plan).length) g.push('“Your plan” is empty');
    (d.bio||[]).filter(r => r.show && !(r.plain||'').trim()).forEach(r => g.push(r.name+' is shown without an explanation'));
    if((d.bio||[]).some(r => r.status==='Critical')) g.push('A critical result needs direct follow-up before publishing');
  } else {
    if(d.interactions!=='Yes') g.push('Medication–herb interactions not reviewed');
    if(d.allergiesReviewed!=='Yes') g.push('Allergies not reviewed');
    if(!c.assessment) g.push('Assessment not marked complete');
    if(!c.safety) g.push('Safety review not marked complete');
    if(!c.understanding) g.push('Client understanding not confirmed');
    if(!c.ready) g.push('Not marked ready for publication');
    if(!(d.w_discussed||'').trim()) g.push('“What we discussed” is empty');
    if(d.referral==='Yes') g.push('Medical referral flagged: confirm the NP has it before publishing');
  }
  return g;
}

/* ---- pages ---- */
function plansPage(u){
  const list = allPlans().filter(x => x.by===u.id || x.co===u.id || x.reviewer===u.id);
  let h = pageHead(PORTAL_LABEL[u.role], 'Care <em>plans</em>', u.role==='holistic'?'Your wellness assessments and the simple plans clients see. A Nurse Practitioner reviews and publishes each one.':'Your clinical assessments and the simple plans patients see. Only the patient care plan is published; the assessment stays internal.', '<button class="cta cta-solid" data-action="plan-new">'+icon('plus',14)+' New '+(u.role==='holistic'?'wellness':'care')+' plan</button>');
  h += '<div class="notice l" style="margin-bottom:26px">'+icon('info')+'<div><b>Document in Jane as well.</b> Bloom’s care plan is the patient-facing summary. The clinical record must also be kept in Jane according to clinic policy.</div></div>';
  h += '<div class="neo panel"><div class="tbl-wrap"><table style="min-width:820px"><thead><tr><th>Patient</th><th>Template</th><th>Visit</th><th>Date</th><th>Author</th><th>Version</th><th>Status</th><th></th></tr></thead><tbody>'+list.map(x => { const m = planStatus(x); return '<tr><th scope="row"><div class="t-name">'+esc(pName(patient(x.pid)))+'</div><div class="t-sub">'+x.pid+'</div></th><td class="m">'+(x.type==='wellness'?'Wellness assessment':'Clinical assessment')+'</td><td class="m">'+x.kind+'</td><td class="m">'+x.date+'</td><td class="m">'+staffShort(x.by)+(x.co?' + '+byId(x.co).first:'')+(x.reviewer?'<div class="t-sub">Review: '+staffShort(x.reviewer)+'</div>':'')+'</td><td class="m tnum">v'+m.ver+'</td><td>'+pill(m.status)+'</td><td class="w-min">'+(x.id==='CP-1'?'<button class="link" data-action="preview-plan">Patient view</button>':canOpenPlan(u,x)?'<button class="link" data-action="plan-open" data-id="'+x.id+'">Open</button>':'<span class="tiny">Medical only</span>')+'</td></tr>'; }).join('')+'</tbody></table></div></div>';
  h += '<div class="grid g3 sec"><div class="neo panel"><div class="sub">1 · Assessment</div><p class="small" style="margin-top:8px">The full '+(u.role==='holistic'?'wellness':'clinical')+' assessment. Internal only, never shown to the '+(u.role==='holistic'?'client':'patient')+'.</p></div><div class="neo panel"><div class="sub">2 · '+(u.role==='holistic'?'Wellness':'Care')+' plan</div><p class="small" style="margin-top:8px">A short, plain-language version with only what matters to them, previewed exactly as they’ll see it.</p></div><div class="neo panel"><div class="sub">3 · Publish</div><p class="small" style="margin-top:8px">'+(u.role==='holistic'?'Sent to the client’s Nurse Practitioner, who publishes it.':'Published to the Care plans page. Earlier versions are always kept.')+'</p></div></div>';
  return h;
}
function planEditor(u){
  const x = allPlans().find(p => p.id===S.openPlan);
  if(!x) return '<div class="neo panel"><p class="small">Choose a plan from Care Plans to open it.</p><a class="cta cta-ghost" href="#/'+u.role+'/careplans" style="margin-top:16px">Back to care plans</a></div>';
  if(!canOpenPlan(u,x)){ audit(u,'Request denied','Care plan '+x.id,false,{ pid:x.pid, info:'Care plan' }); throw new Denied('Care plan'); }
  const d = planDraft(x), pt = patient(x.pid), m = planStatus(x), wellness = x.type==='wellness';
  const locked = m.status==='Published';
  const schema = wellness ? WELLNESS_SCHEMA : CLINICAL_SCHEMA;
  const canPub = can(u,'careplans.publish') && (!wellness || u.id===x.reviewer || u.role==='medical');
  const gaps = planGaps(x,d);
  let h = '<a class="link" href="#/'+u.role+'/careplans" style="margin-bottom:18px">← All care plans</a>';
  if(!wellness) h += '<div class="notice" style="margin-bottom:16px">'+icon('info')+'<div><b>Not stored in Bloom.</b> Nurse Practitioner treatment recommendations are delivered through Jane. This editor is a scratch pad in this browser and is cleared on refresh.</div></div>';
  h += '<div class="page-head" style="margin-bottom:26px"><div><div class="eyebrow">'+(wellness?'Herbal medicine &amp; holistic wellness':'Functional &amp; integrative medicine')+' · '+(wellness?'Wellness':'Clinical')+' assessment</div><h1>'+esc(pt.first)+' <em>'+esc(pt.last)+'</em></h1><div class="row" style="gap:10px;flex-wrap:wrap;margin-top:12px">'+pill(m.status)+'<span class="small">'+pt.id+' · born '+fmtDob(pt.dob)+' · '+esc(x.kind)+' · '+esc(x.date)+' · '+staffShort(x.by)+' · v'+m.ver+'</span></div></div>';
  h += '<div class="head-acts">'+(locked?'<button class="cta cta-ghost" data-action="plan-revise">Start a revision</button>':'<button class="cta cta-ghost" data-action="plan-save">Save draft</button><button class="cta cta-ghost" data-action="jane-import">'+icon('upload',14)+' Import Jane note</button>')+'<button class="cta cta-ghost" data-action="plan-preview">Preview</button>'+(locked?'':canPub?'<button class="cta cta-solid" data-action="plan-publish">Publish to portal</button>':'<button class="cta cta-solid" data-action="plan-submit">'+(wellness?'Send to NP for review':'Mark ready for review')+'</button>')+'</div></div>';
  h += '<div class="filters" role="tablist"><button class="chip'+(planUI.tab==='assessment'?' on':'')+'" role="tab" aria-selected="'+(planUI.tab==='assessment')+'" data-action="plan-tab" data-t="assessment">1 · '+(wellness?'Wellness':'Clinical')+' assessment · internal</button><button class="chip'+(planUI.tab==='patient'?' on':'')+'" role="tab" aria-selected="'+(planUI.tab==='patient')+'" data-action="plan-tab" data-t="patient">2 · '+(wellness?'Client wellness plan':'Patient care plan')+'</button><button class="chip muted" data-action="phase" data-n="4" data-what="PDF export">Export PDF</button></div>';
  if(locked) h += '<div class="notice y" style="margin-bottom:20px">'+icon('lock')+'<div><b>Published v'+m.ver+'.</b> This is what the patient sees now. Start a revision to make changes; the published version stays visible until you publish again.</div></div>';
  h += '<div id="editor-body"'+(locked?' class="locked"':'')+'>'+editorBody(u,x,d,schema,gaps)+'</div>';
  return h;
}
function editorBody(u,x,d,schema,gaps){
  const wellness = x.type==='wellness';
  let h = '';
  if(d.janeNote){ const ap = aiPending(d); h += '<div class="notice jane-note">'+icon('documents')+'<div class="grow"><b>Filled from a Jane note</b> · '+esc(d.janeNote.name)+' · '+new Date(d.janeNote.at).toLocaleDateString('en-CA',{day:'numeric',month:'short'})+'. <span class="src-tag n">From Jane note</span> fields copy what the note says. <span class="src-tag a">AI suggestion</span> fields were drafted by Claude: <b id="ai-left">'+ap+'</b> left to review. Jane is unchanged.'+((d.janeMissing||[]).length?'<div class="tiny" style="margin-top:6px">Not covered in the note: '+esc(d.janeMissing.join('; '))+'</div>':'')+'</div></div>'; }
  if(planUI.tab==='assessment'){
    h += '<div class="ed-split"><div class="stack" style="gap:16px">'+schema.map((s,i) => '<details class="neo ed-sec"'+(planUI.open[i]?' open':'')+' data-sec="'+i+'"><summary><span class="num" style="margin:0">'+(i+1)+'</span><span class="ed-h">'+esc(s.n)+'</span>'+icon('arrow',14)+'</summary><div class="ed-body">'+s.f.map(f => renderField(d,f)).join('')+'</div></details>').join('')+'</div>';
    h += '<aside class="ed-side"><div class="neo panel"><div class="sub">At a glance</div>'+sideSummary(x,d)+'</div><div class="neo panel deep"><div class="sub">Internal record</div><p class="small" style="margin-top:8px">This assessment is never shown to the '+(wellness?'client':'patient')+'. Only the '+(wellness?'client wellness plan':'patient care plan')+' is published. Keep the official record in Jane.</p><button class="link" data-action="plan-tab" data-t="patient" style="margin-top:12px">Write the '+(wellness?'client':'patient')+' plan</button></div></aside></div>';
  } else {
    const P = wellness ? WELLNESS_PATIENT : CLINICAL_PATIENT;
    h += '<div class="ed-split wide"><div class="stack" style="gap:16px"><div class="notice">'+icon('info')+'<div>Keep it short and kind. Show only what the '+(wellness?'client':'patient')+' needs to understand and act on. Switch off any section that doesn’t apply.</div></div>';
    h += P.map(p => { const [k,title,type,hint] = p, shown = !(d.hide||{})[k]; let body = '';
      if(type==='area') body = '<textarea class="input pf'+((d.src||{})[k]?' src-'+d.src[k]:'')+'" aria-label="'+esc(title)+'" data-k="'+k+'">'+esc(d[k]||'')+'</textarea>';
      if(type==='lines') body = '<textarea class="input pf'+((d.src||{})[k]?' src-'+d.src[k]:'')+'" aria-label="'+esc(title)+'" data-k="'+k+'" placeholder="One item per line">'+esc(d[k]||'')+'</textarea>';
      if(type==='ptable') body = fTable(d,k,'',['Name','How to take it','What it’s for']);
      if(type==='results') body = (d.bio||[]).length ? '<div class="stack" style="gap:10px">'+(d.bio||[]).map((r,i) => '<div class="pick'+(r.show?' on':'')+'"><label class="row" style="gap:12px;cursor:pointer"><input type="checkbox" class="check" data-k="bio.'+i+'.show"'+(r.show?' checked':'')+'><span class="grow"><span style="font-weight:400">'+esc(r.name)+'</span> <span class="small">'+esc(r.result)+' '+esc(r.unit)+' · '+esc(r.status)+'</span></span></label>'+(r.show?'<input class="input pf mini" style="margin-top:10px" aria-label="Plain-language note for '+esc(r.name)+'" placeholder="One plain sentence the patient will understand" data-k="bio.'+i+'.plain" value="'+esc(r.plain||'')+'">':'')+'</div>').join('')+'</div>' : '<p class="small">Add biomarkers in the assessment first.</p>';
      if(type==='herbcards') body = (d.herbs||[]).length ? '<div class="stack" style="gap:10px">'+(d.herbs||[]).map((hb,i) => '<label class="pick'+(hb.show!==false?' on':'')+' row" style="gap:12px;cursor:pointer"><input type="checkbox" class="check" data-k="herbs.'+i+'.show"'+(hb.show!==false?' checked':'')+'><span class="grow"><span style="font-weight:400">'+esc(hb.common||'Untitled')+'</span> <span class="small">'+esc(hb.amount||'')+' · '+esc(hb.frequency||'')+' · '+esc(hb.duration||'')+'</span></span></label>').join('')+'</div><p class="tiny" style="margin-top:8px">The client sees the common name, Latin name, purpose, how and when to take it, for how long, and what to watch for. Rationale, interactions and product details stay internal.</p>' : '<p class="small">Add botanicals in the assessment first.</p>';
      return '<div class="neo ed-sec pad'+(shown?'':' off')+'"><div class="row" style="justify-content:space-between;gap:12px"><div><div style="font-family:var(--serif);font-size:1.45rem">'+title+'</div>'+(type!=='ptable'?'<div class="fl-head" data-src-for="'+k+'">'+srcTag(d,k)+'</div>':'')+'<div class="tiny">'+esc(hint)+'</div></div><button class="switch" role="switch" aria-checked="'+shown+'" aria-label="Show '+esc(title)+'" data-action="plan-hide" data-k="'+k+'"></button></div>'+(shown?'<div style="margin-top:14px">'+body+'</div>':'')+'</div>'; }).join('');
    h += '</div><aside class="ed-side"><div class="sub" style="margin-bottom:10px">Live preview · what '+esc(patient(x.pid).first)+' will see</div><div class="cp cpp-wrap" id="cp-preview">'+patientPlanHTML(x,d)+'</div></aside></div>';
  }
  h += '<div class="neo panel sec"><div class="panel-head"><h2 style="font-size:1.6rem">Before publishing</h2><span class="small">'+(gaps.length?gaps.length+' item'+(gaps.length>1?'s':'')+' to resolve':'Ready')+'</span></div>'+(gaps.length?'<ul class="list">'+gaps.map(g => '<li style="padding:10px 0;justify-content:flex-start;gap:12px"><span class="dot warn"></span><span class="small" style="color:var(--ink)">'+esc(g)+'</span></li>').join('')+'</ul>':'<p class="small">Everything required is complete.</p>')+'</div>';
  return h;
}
function sideSummary(x,d){
  const wellness = x.type==='wellness';
  const rows = wellness
    ? [['Concerns',d.concerns],['Allergies',d.allergies],['Interactions reviewed',d.interactions],['Medical referral',d.referral],['Botanicals',(d.herbs||[]).map(h => h.common).filter(Boolean).join(', ')],['Next follow-up',(d.fa||{}).nextDate]]
    : [['Reason',d.reason],['Allergies',d.allergies],['Flagged results',(d.bio||[]).filter(r => r.status!=='In range').map(r => r.name+' ('+r.status.toLowerCase()+')').join(', ')],['Follow-up',(d.fu||{}).interval]];
  return '<dl class="dl" style="margin-top:12px">'+rows.map(r => '<div style="grid-template-columns:1fr"><dt>'+r[0]+'</dt><dd class="small" style="color:var(--ink)">'+esc(r[1]||'—')+'</dd></div>').join('')+'</dl>';
}
function refreshEditor(){
  const u = me(), x = allPlans().find(p => p.id===S.openPlan); if(!x) return;
  const body = document.getElementById('editor-body'); if(!body) return;
  const y = window.scrollY;
  body.innerHTML = editorBody(u,x,planDraft(x),x.type==='wellness'?WELLNESS_SCHEMA:CLINICAL_SCHEMA,planGaps(x,planDraft(x)));
  window.scrollTo(0,y);
}
let planSaveT = null;
function planInput(el){
  const x = allPlans().find(p => p.id===S.openPlan); if(!x) return;
  if(planStatus(x).status==='Published'){ return; }
  const d = planDraft(x), k = el.dataset.k;
  let v = el.type==='checkbox' ? el.checked : el.value;
  const tm = k.match(/^(\w+)\.(\d+)\.(\d+)$/);
  if(tm && Array.isArray(d[tm[1]])){ d[tm[1]][+tm[2]] = d[tm[1]][+tm[2]] || []; d[tm[1]][+tm[2]][+tm[3]] = v; } else setPath(d, k, v);
  const sk = tm ? tm[1] : k;
  if(d.src && d.src[sk]){ delete d.src[sk]; document.querySelectorAll('[data-src-for="'+sk+'"]').forEach(n => n.innerHTML = ''); el.classList.remove('src-ai','src-note'); const gp = document.getElementById('ai-left'); if(gp) gp.textContent = aiPending(d); }
  clearTimeout(planSaveT); planSaveT = setTimeout(save, 400);
  const pv = document.getElementById('cp-preview'); if(pv) pv.innerHTML = patientPlanHTML(x,d);
  if(el.type==='checkbox' || el.tagName==='SELECT') refreshEditor();
}

/* ---------- 11b. import a Jane visit note into a care plan draft ----------
   The practitioner uploads the note exported from Jane (PDF). The text is read in the browser,
   Claude maps it onto the template, and drafts any empty sections as suggestions.
   Nothing is published until the practitioner reviews every suggestion. Jane itself is never changed. */
const PDFJS = '/assets/vendor/';
let pdfjsReady = null;
function loadPdfJs(){
  if(window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if(pdfjsReady) return pdfjsReady;
  pdfjsReady = new Promise((ok, no) => { const s = document.createElement('script'); s.src = PDFJS+'pdf.min.js'; s.onload = () => { try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS+'pdf.worker.min.js'; ok(window.pdfjsLib); } catch(e){ no(e); } }; s.onerror = () => { pdfjsReady = null; no(new Error('pdf')); }; document.head.appendChild(s); });
  return pdfjsReady;
}
async function readNoteFile(file, onStep){
  if(/\.txt$/i.test(file.name) || file.type==='text/plain') return { text: (await file.text()).slice(0, 120000), pages:1, images:[] };
  const lib = await loadPdfJs();
  const pdf = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  let text = '';
  for(let i=1; i<=pdf.numPages && i<=40; i++){
    onStep && onStep('Reading page '+i+' of '+pdf.numPages);
    const pg = await pdf.getPage(i), tc = await pg.getTextContent();
    let line = '', lastY = null;
    tc.items.forEach(it => { const y = Math.round(it.transform[5]); if(lastY!==null && Math.abs(y-lastY) > 3){ text += line.trim()+'\n'; line = ''; } line += it.str + (it.hasEOL ? '\n' : ' '); lastY = y; });
    text += line.trim()+'\n\n';
  }
  const images = [];
  if(text.replace(/\s/g,'').length < 200){ // a scanned note: send page pictures instead
    for(let i=1; i<=pdf.numPages && i<=5; i++){
      const pg = await pdf.getPage(i), vp = pg.getViewport({ scale:1.6 }), c = document.createElement('canvas');
      c.width = vp.width; c.height = vp.height; await pg.render({ canvasContext:c.getContext('2d'), viewport:vp }).promise;
      images.push(await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85)));
    }
  }
  return { text: text.slice(0, 120000), pages: pdf.numPages, images };
}
// Every field the template holds, flattened for Claude.
const NEVER_SUGGEST = ['idVerified','consent','interactions','allergiesReviewed','referral'];
const FACT_FIELDS = /^(vit\.|meds|supps|rxMeds|herbsNow|allergies|conditions|surgical|hospital|family|specialists|screening|otc|investigations|ca\.confirmed|ca\.differential|tp\.rx|tp\.medAdjust|measures|findings|bio)/;
function templateCatalogue(x){
  const wellness = x.type==='wellness', schema = wellness ? WELLNESS_SCHEMA : CLINICAL_SCHEMA, P = wellness ? WELLNESS_PATIENT : CLINICAL_PATIENT;
  const text = {}, choice = {}, tables = {};
  schema.forEach(s => s.f.forEach(f => {
    const [k,label,type,opts] = f;
    if(type==='text' || type==='area') text[k] = s.n+' · '+label;
    if(type==='seg') choice[k] = { label:s.n+' · '+label, options:opts };
    if(type==='grid' || type==='vitals') opts.forEach(it => { text[k+'.'+it[0]] = s.n+' · '+it[1]; });
    if(type==='table') tables[k] = { label:s.n+' · '+label, columns:opts };
  }));
  P.forEach(p => { const [k,title,type,hint] = p;
    if(type==='area') text[k] = 'CLIENT-FACING · '+title+' ('+hint+')';
    if(type==='lines') text[k] = 'CLIENT-FACING · '+title+' (one item per line, separated by \\n; '+hint+')';
    if(type==='ptable') tables[k] = { label:'CLIENT-FACING · '+title, columns:['Name','How to take it','What it’s for'] };
  });
  return { text, choice, tables };
}
function janePrompt(x, pt, note){
  const wellness = x.type==='wellness', cat = templateCatalogue(x), author = byId(x.by);
  const shape = wellness
    ? '"herbs": [{"common","latin","part","prep","amount","frequency","duration","goal","rationale","contra","interact","adverse","monitor"}]'
    : '"bio": [{"name","result","unit","range","prev","date","status","notes","plain"}]  (status is one of: In range, Below range, Above range, Borderline, Critical)';
  return [
    'You are helping a '+(wellness?'herbalist and nutrition specialist':'nurse practitioner')+' at Bloom, a private integrative virtual clinic in Alberta, turn a visit note exported from their charting system (Jane) into Bloom\'s '+(wellness?'wellness':'clinical')+' care plan template.',
    'Patient: '+pt.first+' '+pt.last+'. Visit: '+x.kind+'. Practitioner: '+author.first+' '+author.last+'.',
    '',
    'Fill the template in two ways:',
    '1. "fromNote": values the note actually states. Copy facts faithfully and concisely. Do not add anything the note does not say.',
    '2. "suggested": short drafts for EMPTY fields that the note does not state directly but that a practitioner would reasonably write from what the note says: summaries, education, lifestyle advice, follow-up instructions, red flags to watch for, and every CLIENT-FACING section. The practitioner will review each one.',
    'Rules:',
    '- Never invent clinical facts: no made-up vitals, lab values, medications, doses, allergies, diagnoses, prescriptions or examination findings. If the note does not state them, leave them out entirely.',
    '- Never fill these from guesswork, only if the note states them: '+NEVER_SUGGEST.join(', ')+'.',
    '- CLIENT-FACING fields speak to the client as "you", in warm plain language at about a grade 7 reading level, with no diagnostic codes, no differential diagnoses and no jargon. Keep each one brief.',
    wellness ? '- Herbal recommendations stay within an herbalist\'s scope and never replace medical care.' : '- For lab results in the note, add each to "bio" with a one-line plain-language explanation in "plain".',
    '- Use only the field keys listed below. Omit any field you have nothing for.',
    '',
    'Text fields (key: what it is):',
    JSON.stringify(cat.text),
    'Choice fields (value must be one of the options):',
    JSON.stringify(cat.choice),
    'Table fields (each row is an array of strings in column order):',
    JSON.stringify(cat.tables),
    '',
    'Reply with only one JSON object of this shape:',
    '{"fromNote": {"key": "value"}, "suggested": {"key": "value"}, "tables": {"key": [["col1","col2"]]}, '+shape+', "missing": ["short list of important things the note does not cover"]}',
    '',
    'The Jane visit note'+(note.images.length?' is attached as page images.':':'),
    note.images.length ? '' : '"""\n'+note.text+'\n"""'
  ].join('\n');
}
function applyJane(x, d, r){
  const cat = templateCatalogue(x), src = d.src = d.src || {};
  let fromNote = 0, suggested = 0;
  const put = (k, v, kind) => {
    if(typeof v !== 'string' || !v.trim()) return;
    if(kind==='ai' && (NEVER_SUGGEST.includes(k) || FACT_FIELDS.test(k))) return;
    const cur = getPath(d,k);
    if(kind==='ai' && cur && String(cur).trim()) return;          // never overwrite what is already written
    if(cat.choice[k]){ if(!cat.choice[k].options.includes(v.trim())) return; }
    else if(!(k in cat.text)) return;
    setPath(d, k, v.trim().slice(0, 4000)); src[k] = kind; kind==='note' ? fromNote++ : suggested++;
  };
  Object.entries((r && r.fromNote) || {}).forEach(([k,v]) => put(k, v, 'note'));
  Object.entries((r && r.suggested) || {}).forEach(([k,v]) => put(k, v, 'ai'));
  Object.entries((r && r.tables) || {}).forEach(([k,rows]) => {
    const t = cat.tables[k]; if(!t || !Array.isArray(rows)) return;
    const clean = rows.filter(Array.isArray).map(row => t.columns.map((c,j) => String(row[j]==null?'':row[j]).slice(0,300))).filter(row => row.some(Boolean)).slice(0,20);
    if(!clean.length) return;
    const cur = (getPath(d,k)||[]).filter(row => row && row.some && row.some(Boolean));
    setPath(d, k, cur.concat(clean)); src[k] = k.startsWith('p_') ? 'ai' : 'note'; src[k]==='ai' ? suggested++ : fromNote++;
  });
  if(x.type!=='wellness' && Array.isArray(r && r.bio)){
    const ok = ['In range','Below range','Above range','Borderline','Critical'];
    r.bio.slice(0,40).forEach(b => { if(!b || !b.name || !b.result) return; d.bio = d.bio||[];
      d.bio.push({ name:String(b.name).slice(0,80), cat:'From Jane note', result:String(b.result).slice(0,30), unit:String(b.unit||'').slice(0,20), range:String(b.range||'').slice(0,40), prev:String(b.prev||'').slice(0,30), date:String(b.date||'').slice(0,20), status:ok.includes(b.status)?b.status:'In range', notes:String(b.notes||'').slice(0,300), show:false, plain:String(b.plain||'').slice(0,300), src:'note' }); fromNote++; });
  }
  if(x.type==='wellness' && Array.isArray(r && r.herbs)){
    r.herbs.slice(0,12).forEach(h => { if(!h || !h.common) return; d.herbs = d.herbs||[]; const o = { show:true, src:'note' }; HERB_FIELDS.forEach(f => { if(h[f[0]]) o[f[0]] = String(h[f[0]]).slice(0,400); }); o.common = String(h.common).slice(0,80); d.herbs.push(o); fromNote++; });
  }
  d.janeMissing = Array.isArray(r && r.missing) ? r.missing.filter(m => typeof m==='string').slice(0,12).map(m => m.slice(0,200)) : [];
  return { fromNote, suggested };
}
function srcTag(d, k){
  const s = d && d.src && d.src[k]; if(!s) return '';
  return s==='note' ? '<span class="src-tag n">From Jane note</span>' : '<span class="src-tag a">AI suggestion · review</span><button type="button" class="src-keep" data-action="src-keep" data-sk="'+k+'">Keep</button>';
}
function aiPending(d){ return Object.values((d && d.src) || {}).filter(v => v==='ai').length; }
let janeFile = null, janeCtl = null;
function janeZone(id){
  return '<label class="jane-drop" for="'+id+'"><input type="file" id="'+id+'" accept="application/pdf,.pdf,.txt,text/plain" data-janefile="1"><span class="jd-ic">'+icon('upload',20)+'</span><span class="grow"><span class="jd-t" id="'+id+'-name">Upload the visit note from Jane</span><span class="tiny">PDF export of the chart note. Claude reads it and fills the template; you review before anything is published.</span></span></label><p class="tiny jane-warn">'+icon('lock',12)+' Prototype: use fictional notes only. Real patient notes need an approved, Canadian-hosted AI service covered by the clinic’s privacy impact assessment.</p>';
}
function janeDialog(){
  openDialog('<div class="x-row"><div><div class="sub">Care plan draft</div><h2>Import a <em>Jane note</em></h2></div><button class="icon-btn" data-action="close" aria-label="Close">'+icon('close')+'</button></div><p class="small" style="margin-top:10px">Fields that are already filled stay as they are. New information is added and marked so you can review it.</p><form class="form" data-form="jane-import" style="margin-top:18px">'+janeZone('ji-file')+'<div class="acts"><button type="button" class="cta cta-ghost" data-action="close">Cancel</button><button class="cta cta-solid" type="submit">Read note</button></div></form>');
}
async function runJaneImport(){
  toast('Clinical notes stay in Jane. This portal does not read a chart note into its database.');
  janeDone();
}
function janeDone(ok){ const b = document.getElementById('jn-stop'); if(b){ b.textContent = ok ? 'Review the plan' : 'Close'; b.dataset.action = 'close'; b.className = 'cta '+(ok?'cta-solid':'cta-ghost'); } janeCtl = null; }
document.addEventListener('change', e => {
  if(!e.target.matches || !e.target.matches('[data-janefile]')) return;
  const f = e.target.files && e.target.files[0]; janeFile = f || null;
  const lbl = document.getElementById(e.target.id+'-name'); if(lbl) lbl.textContent = f ? f.name : 'Upload the visit note from Jane';
  const z = e.target.closest('.jane-drop'); if(z) z.classList.toggle('has', !!f);
});

/* ---------- 11c. client care plan document (full-screen view + letter-size PDF) ----------
   The Nurse Practitioner "Visit summary" and the Herbalist & Nutrition "Wellness plan" share one frame,
   with their own accent, hero photograph and sections. Plant photos come from the clinic's plant photo library. */
const CD_W = 816, CD_H = 1056;
const PLANT_LOCAL_KEY = 'bloom-plant-photos-local';
function plantKey(n){ return String(n||'').toLowerCase().trim().replace(/\s+/g,' '); }
function plantLocal(){ try { return JSON.parse(localStorage.getItem(PLANT_LOCAL_KEY)) || {}; } catch(e){ return {}; } }
function plantPhoto(name){ const k = plantKey(name), a = (S.plantPhotos||{})[k]; if(a && a.id) return '/_blob/'+a.id; return plantLocal()[k] || ''; }
const ICON_RULES = [
  [/reach out|short of breath|chest pain|faint|emergency|911|rash|itch|reaction|blood in|weight loss|pregnant|thirsty/i,'alert'],
  [/blood work|blood test|\blabs?\b|requisition|ferritin|panel|tsh|a1c|celiac|serolog/i,'flask'],
  [/\bbook|follow-?up|appointment|meet with|consult|review whether/i,'calendar'],
  [/\biron\b|vitamin|supplement|magnesium|capsule|tablet|medication/i,'pill'],
  [/\bteas?\b|infusion|tincture|peppermint|chamomile|lemon balm|herb/i,'cup'],
  [/sleep|bed\b|wind[- ]?down|screens?|night|wake/i,'moon'],
  [/breath|4-7-8|meditat|mindful|relax|calm/i,'wind'],
  [/journal|writ|track/i,'pen'],
  [/walk|strength|exercise|movement|yoga|stretch|steps/i,'walk'],
  [/water|hydrat|litre|fizzy|sparkling|drink/i,'droplet'],
  [/daylight|sunlight|outside|outdoors/i,'sun'],
  [/breakfast|lunch|dinner|meal|food|\beat|protein|fibre|fiber|vegetable|fruit|coffee|caffeine|lentil|spinach|snack|fork/i,'bowl'],
  [/message|portal|call|contact|tell us/i,'chat']
];
function iconFor(t, dflt){ const r = ICON_RULES.find(x => x[0].test(t)); return r ? r[1] : (dflt||'leaf'); }
function cdList(t, dflt){ const l = linesOf(t); return l.length ? '<ul class="cd-ilist">'+l.map(x => '<li><span class="cd-ic">'+icon(iconFor(x,dflt),17)+'</span><span>'+esc(x)+'</span></li>').join('')+'</ul>' : ''; }
function cdSec(title, ic, body, cls){ return body ? '<section class="cd-sec'+(cls?' '+cls:'')+'"><h3><span class="cd-hic">'+icon(ic,17)+'</span>'+title+'</h3>'+body+'</section>' : ''; }
function clientDocBlocks(x, d, exporting){
  const pt = patient(x.pid), author = byId(x.by), w = x.type==='wellness', hide = d.hide||{}, on = k => !hide[k];
  const B = [];
  B.push({ html:'<div class="cd-hero"><div class="cd-ht"><div class="cd-eb">'+esc(x.date)+' · '+esc(d.visitType||x.kind)+'</div><h1 class="cd-h1">'+(w?'Your wellness <em>plan</em>':'Your visit <em>summary</em>')+'</h1><p class="cd-by">'+(w?'Prepared by '+esc(author.first+' '+author.last)+', your Herbalist &amp; Nutrition Specialist':'Written by '+esc(author.first+' '+author.last)+', your Nurse Practitioner')+'</p><div class="cd-for"><span>Prepared for</span>'+esc(pt.first+' '+pt.last)+'</div></div><div class="cd-arch '+(w?'w':'c')+'" role="img" aria-label="'+(w?'Green leaves, close up':'Ivory peony, close up')+'"></div></div>' });
  if(!w){
    const why = on('p_why') && (d.p_why||'').trim(), feel = on('p_feeling') && (d.p_feeling||'').trim();
    if(why || feel) B.push({ html:'<div class="cd-cols">'+(why?cdSec('Why you came in','chat','<p class="cd-p">'+esc(d.p_why)+'</p>'):'<div></div>')+(feel?cdSec('How you’ve been feeling','heart','<p class="cd-p">'+esc(d.p_feeling)+'</p>'):'')+'</div>' });
    if(on('p_discussed') && (d.p_discussed||'').trim()) B.push({ html:cdSec('What we talked about','leaf','<p class="cd-p">'+esc(d.p_discussed)+'</p>') });
    const res = (d.bio||[]).filter(r => r.show);
    if(on('p_results') && res.length) B.push({ html:cdSec('Your results, in brief','flask','<div class="cd-res">'+res.map(r => '<div class="cd-r"><div class="cd-rn">'+esc(r.name)+'</div><div class="cd-rv"><b>'+esc(r.result)+'</b> '+esc(r.unit||'')+'<span class="cd-st '+(r.status==='In range'?'ok':r.status==='Critical'?'crit':'watch')+'">'+esc(r.status)+'</span></div><p>'+esc(r.plain||'')+'</p><div class="cd-rr">Healthy range '+esc(r.range||'')+'</div></div>').join('')+'</div>') });
    if(on('p_plan')) B.push({ html:cdSec('Your plan','check',cdList(d.p_plan)) });
    const meds = (d.p_meds||[]).filter(r => r && r[0]);
    if(on('p_meds') && meds.length) B.push({ html:cdSec('Medications &amp; supplements','pill','<ul class="cd-ilist">'+meds.map(r => '<li><span class="cd-ic">'+icon('pill',17)+'</span><span><b>'+esc(r[0])+'</b><br>'+esc(r[1]||'')+(r[2]?' · '+esc(r[2]):'')+'</span></li>').join('')+'</ul>') });
    if(on('p_next')) B.push({ html:cdSec('Next steps','calendar',cdList(d.p_next,'calendar')) });
    if(on('p_sooner') && linesOf(d.p_sooner).length) B.push({ html:'<div class="cd-alert"><h3><span class="cd-hic">'+icon('alert',17)+'</span>Reach out sooner if</h3>'+cdList(d.p_sooner,'alert')+'<p class="cd-small">Message us in the portal or call the clinic. For chest pain, trouble breathing or any emergency, call 911.</p></div>' });
  } else {
    if(on('w_discussed') && (d.w_discussed||'').trim()) B.push({ html:cdSec('What we discussed','chat','<p class="cd-p">'+esc(d.w_discussed)+'</p>') });
    const goals = linesOf(d.w_goals);
    if(on('w_goals') && goals.length) B.push({ html:cdSec('Your wellness goals','heart','<div class="cd-goals">'+goals.map(g => '<span>'+esc(g)+'</span>').join('')+'</div>') });
    const herbs = (d.herbs||[]).filter(hb => hb.show!==false && hb.common);
    if(on('w_herbs') && herbs.length){
      B.push({ keep:true, html:'<section class="cd-sec"><h3><span class="cd-hic">'+icon('leaf',17)+'</span>Your herbal recommendations</h3></section>' });
      herbs.forEach(hb => {
        const ph = plantPhoto(hb.common);
        const img = ph ? '<div class="cd-hph" style="background-image:url(\''+ph+'\')" role="img" aria-label="'+esc(hb.common)+', close up"></div>' : (exporting ? '' : '<div class="cd-hph empty">'+icon('upload',18)+'<span>Plant photo not added yet. Add one in the herbal recommendations. It is left out of the PDF until then.</span></div>');
        const how = [[ 'How to take', [hb.prep, hb.amount].filter(Boolean).join(' · ') ], ['When', hb.frequency], ['For how long', hb.duration]].filter(r => r[1]);
        B.push({ html:'<div class="cd-herb'+(img?'':' nophoto')+'">'+img+'<div class="cd-hb"><div class="cd-hn">'+esc(hb.common)+'</div>'+(hb.latin?'<div class="cd-hl">'+esc(hb.latin)+(hb.part?' · '+esc(hb.part):'')+'</div>':'')+(hb.goal?'<p class="cd-p" style="margin-top:10px">'+esc(hb.goal)+'</p>':'')+'<dl>'+how.map(r => '<div><dt>'+r[0]+'</dt><dd>'+esc(r[1])+'</dd></div>').join('')+'</dl>'+(hb.monitor||hb.adverse?'<div class="cd-care">'+icon('alert',14)+'<span>'+esc(hb.monitor||hb.adverse)+'</span></div>':'')+'</div></div>' });
      });
    }
    const nut = on('w_nutrition') && linesOf(d.w_nutrition).length, rit = on('w_rituals') && linesOf(d.w_rituals).length;
    if(nut) B.push({ html:cdSec('Your nutrition plan','bowl',cdList(d.w_nutrition,'bowl')) });
    if(rit) B.push({ html:cdSec('Your daily rituals','sun',cdList(d.w_rituals,'leaf')) });
    if(on('w_next')) B.push({ html:cdSec('Your next steps','calendar',cdList(d.w_next,'calendar')) });
    if(on('w_sooner') && linesOf(d.w_sooner).length) B.push({ html:'<div class="cd-alert"><h3><span class="cd-hic">'+icon('alert',17)+'</span>Contact us if</h3>'+cdList(d.w_sooner,'alert')+'<p class="cd-small">Stop the herb and message us in the portal. For any emergency, call 911.</p></div>' });
  }
  B.push({ html:'<p class="cd-small cd-close">Questions about your plan? Message your care team in the Bloom portal. This plan is part of your health record and is shared only with you.</p>' });
  return B.filter(b => b.html);
}
function cdPageShell(x, pt){
  const w = x.type==='wellness', today = new Date().toLocaleDateString('en-CA',{ day:'numeric', month:'long', year:'numeric' });
  return '<div class="cd-page '+(w?'w':'c')+'"><div class="cd-top"><span class="cd-brand logo-link"><img class="bloom-mark" src="/assets/logo/bloom-logo-animated-hover-dark.svg" alt="Bloom Integrative Health"></span><span class="cd-kind">'+(w?'Wellness plan':'Visit summary')+'</span></div><div class="cd-body"></div><div class="cd-foot"><span>Prepared for '+esc(pt.first+' '+pt.last)+' · '+today+'</span><span>Confidential health information</span><span class="cd-pn"></span></div></div>';
}
function cdPaginate(x, d, exporting){
  const stage = document.getElementById('cd-stage'); if(!stage) return;
  const pt = patient(x.pid), blocks = clientDocBlocks(x, d, exporting);
  stage.innerHTML = '<div class="cd-pages" id="cd-pages"></div>';
  const wrap = document.getElementById('cd-pages');
  let body = null;
  const newPage = () => { wrap.insertAdjacentHTML('beforeend', cdPageShell(x, pt)); body = wrap.lastElementChild.querySelector('.cd-body'); };
  const over = () => body.scrollHeight > body.clientHeight + 1;
  newPage();
  for(let i=0; i<blocks.length; i++){
    const group = blocks[i].keep && blocks[i+1] ? [blocks[i], blocks[++i]] : [blocks[i]];
    const els = group.map(b => { const t = document.createElement('div'); t.className = 'cd-blk'; t.innerHTML = b.html; body.appendChild(t); return t; });
    if(over() && body.children.length > els.length){ els.forEach(e => e.remove()); newPage(); els.forEach(e => body.appendChild(e)); }
  }
  const pages = wrap.querySelectorAll('.cd-page');
  pages.forEach((p,i) => { p.querySelector('.cd-pn').textContent = 'Page '+(i+1)+' of '+pages.length; });
  const sc = exporting ? 1 : Math.min(1, (stage.clientWidth - 32) / CD_W);
  wrap.style.zoom = sc < 1 ? String(sc) : '';
}
var cdPlan = null;
function openClientDoc(x){
  cdPlan = x.id;
  const pt = patient(x.pid), w = x.type==='wellness';
  document.getElementById('layer').innerHTML = '<div class="cd-view" role="dialog" aria-modal="true" aria-label="'+(w?'Wellness plan':'Visit summary')+' for '+esc(pt.first+' '+pt.last)+'"><div class="cd-bar"><div><div class="sub">What '+esc(pt.first)+' receives · letter-size PDF</div><div class="cd-bt">'+esc(pt.first+' '+pt.last)+' · '+(w?'Wellness plan':'Visit summary')+'</div></div><div class="row" style="gap:12px"><span class="tiny" id="cd-status" role="status"></span><button class="cta cta-solid cta-sm" data-action="cd-pdf">'+icon('download',14)+' Download PDF</button><button class="icon-btn" data-action="close" aria-label="Close">'+icon('close')+'</button></div></div><div class="cd-stage" id="cd-stage"></div></div>';
  cdPaginate(x, planDraft(x), false);
}
window.addEventListener('resize', () => { if(cdPlan && document.getElementById('cd-stage')){ const x = allPlans().find(p => p.id===cdPlan); if(x) cdPaginate(x, planDraft(x), false); } });
function loadScript(src){ return new Promise((ok, no) => { if(document.querySelector('script[src="'+src+'"]')) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
async function cdPdf(){
  const x = allPlans().find(p => p.id===cdPlan); if(!x) return;
  if(x.type!=='wellness'){ toast('Clinical care plans are delivered through Jane and are not exported from this portal.'); return; }
  const st = document.getElementById('cd-status'), btn = document.querySelector('[data-action=cd-pdf]'), pt = patient(x.pid);
  const say = t => { if(st) st.textContent = t; };
  if(btn) btn.disabled = true; say('Preparing the PDF…');
  try {
    /* libraries are self-hosted */
    if(document.fonts && document.fonts.ready) await document.fonts.ready;
    cdPaginate(x, planDraft(x), true);
    const pages = document.querySelectorAll('#cd-pages .cd-page');
    const pdf = new window.jspdf.jsPDF({ orientation:'portrait', unit:'pt', format:'letter' });
    for(let i=0; i<pages.length; i++){
      say('Page '+(i+1)+' of '+pages.length+'…');
      const c = await window.html2canvas(pages[i], { scale:2, backgroundColor:'#F5F0E8', useCORS:true, logging:false });
      if(i) pdf.addPage('letter','portrait');
      pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 612, 792);
    }
    const blob = pdf.output('blob'), name = 'Bloom '+(x.type==='wellness'?'wellness plan':'visit summary')+' - '+pt.first+' '+pt.last+' - '+x.date+'.pdf';
    cdPaginate(x, planDraft(x), false);
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    audit(me(),'Downloaded care plan PDF',x.kind,true,{ pid:x.pid, info:x.type==='wellness'?'Wellness plan':'Care plan' });
    say('PDF ready.');
  } catch(e){
    cdPaginate(x, planDraft(x), false);
    say('The PDF could not be made in this browser.');
  } finally { if(btn) btn.disabled = false; }
}
async function plantUpload(name, file){
  if(!file || !/^image\//.test(file.type)){ toast('Choose a JPEG, PNG or WebP photo.'); return; }
  const k = plantKey(name);
  try {
    const bmp = await createImageBitmap(file), max = 1400, s = Math.min(1, max/Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width*s); c.height = Math.round(bmp.height*s); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.88));
    S.plantPhotos = S.plantPhotos || {}; S.plantPhotos[k] = { name:String(name).slice(0,80), by:me().id, at:new Date().toISOString() };
      toast(esc(name)+' photo is kept for this session only.');
    audit(me(),'Added plant photo',String(name).slice(0,80),true);
    refreshEditor();
  } catch(e){ toast('The photo could not be added. '+(e && e.code==='forbidden' ? 'Ask the owner for edit access.' : 'Try a smaller JPEG.')); }
}
document.addEventListener('change', e => {
  if(!e.target.matches || !e.target.matches('[data-plantfile]')) return;
  const f = e.target.files && e.target.files[0]; if(f) plantUpload(e.target.dataset.plantfile, f);
});

/* ---------- 12. tasks & notes between staff (all portals) ----------
   Every task keeps a conversation log: created, messages, hand-offs, completion, reopening.
   Completed tasks move to Previous; patient-linked tasks also appear in that patient's record. */
const URGENCY = [ ['routine','Routine'], ['soon','Soon'], ['important','Important'], ['urgent','Urgent'] ];
const URG_RANK = { routine:0, soon:1, important:2, urgent:3 };
function isoDay(offset){ const d = new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+offset); return d.toISOString().slice(0,10); }
function agoISO(min){ return new Date(Date.now()-min*60000).toISOString(); }
function seedNotes(){ return []; }
function normNote(n){
  if(!n.log){ n.log = [{ t:n.t, by:n.from, type:'created', to:n.to, text:n.body||'' }]; if(n.done) n.log.push({ t:n.doneAt||n.t, by:n.doneBy||n.to, type:'completed', text:'' }); if(n.withdrawn) n.log.push({ t:n.t, by:n.from, type:'withdrawn', text:'' }); }
  if(!n.unread) n.unread = (n.read===false && n.from!==n.to && !n.done) ? [n.to] : [];
  return n;
}
S.notes = S.notes || [];
S.notes.forEach(normNote);
function allNotes(){ return S.notes.map(normNote); }
let tasksUI = { view:'me', urg:'all', q:'', scope:'mine' };
let taskBack = '';
function canSeePatient(u, pid){ const p = patient(pid); if(!p) return false; return can(u,'patients.directory') || (can(u,'patients.assigned') && careTeam(p).includes(u.id)); }
function participants(n){ const s = new Set([n.from, n.to]); n.log.forEach(l => { s.add(l.by); if(l.to) s.add(l.to); }); return s; }
function canSeeTask(u, n){ if(u.role==='owner') return true; if(n.withdrawn || n.private) return participants(n).has(u.id); return true; }
function canActOn(u, n){ return u.role==='owner' || participants(n).has(u.id); }
function myOpenNotes(u){ return allNotes().filter(n => n.to===u.id && !n.done && !n.withdrawn); }
function unreadFor(u){ return allNotes().filter(n => (n.unread||[]).includes(u.id) && !n.withdrawn); }
function dueLabel(iso){
  if(!iso) return '';
  const d = new Date(iso+'T12:00:00'), t = new Date(); t.setHours(12,0,0,0);
  const diff = Math.round((d-t)/86400000);
  if(diff<0) return '<span class="due late">Overdue · '+d.toLocaleDateString('en-CA',{day:'numeric',month:'short'})+'</span>';
  if(diff===0) return '<span class="due today">Due today</span>';
  if(diff===1) return '<span class="due">Due tomorrow</span>';
  return '<span class="due">Due '+d.toLocaleDateString('en-CA',{weekday:'short',day:'numeric',month:'short'})+'</span>';
}
function upill(k){ const u = URGENCY.find(x => x[0]===k)||URGENCY[0]; return '<span class="pill up-'+u[0]+'">'+u[1]+'</span>'; }
function shortDate(iso){ const d = new Date(iso); return d.toLocaleDateString('en-CA',{day:'numeric',month:'short'})+', '+d.toLocaleTimeString('en-CA',{hour:'numeric',minute:'2-digit'}); }
function ptLabel(u, pid){ if(!pid) return ''; return canSeePatient(u,pid) ? esc(pName(patient(pid)))+' · '+pid : pid; }
function taskText(u, n){ return (n.title+' '+n.body+' '+n.log.map(l => l.text||'').join(' ')+' '+fullName(byId(n.from))+' '+fullName(byId(n.to))+' '+(n.pid||'')+' '+(n.pid && canSeePatient(u,n.pid)?pName(patient(n.pid)):'')).toLowerCase(); }
function noteCard(u, n){
  const self = n.from===n.to && n.log.length<3, forMe = n.to===u.id, holder = byId(n.to), creator = byId(n.from);
  const isNew = (n.unread||[]).includes(u.id);
  const msgs = n.log.filter(l => l.type==='message' || l.type==='forwarded').length;
  const last = n.log.slice().reverse().find(l => l.text);
  let ctl = (forMe && n.kind==='task' && !n.done && !n.withdrawn) ? '<input type="checkbox" class="check" data-action-change="note-done" data-id="'+n.id+'" aria-label="Mark complete: '+esc(n.title)+'">' : '<span class="tk-ico" aria-hidden="true">'+icon(n.done?'check':n.kind==='note'?'info':'tasks',16)+'</span>';
  const who = self ? (n.from===u.id?'Reminder to yourself':'Reminder · '+esc(fullName(creator))) : (n.done ? 'Completed by '+esc(fullName(byId(n.doneBy||n.to)))+' · '+new Date(n.doneAt||n.t).toLocaleDateString('en-CA',{day:'numeric',month:'short',year:'numeric'}) : (forMe ? 'From '+esc(fullName(creator)) : 'With '+esc(fullName(holder))+' · from '+esc(n.from===u.id?'you':fullName(creator))));
  return '<article class="tk u-'+n.urg+(n.done||n.withdrawn?' is-done':'')+' tk-click" data-action="task-open" data-id="'+n.id+'" tabindex="0"><div class="tk-row">'+ctl+'<div class="grow"><div class="row" style="gap:10px;flex-wrap:wrap"><span class="tk-t">'+esc(n.title)+'</span>'+(isNew?'<span class="tk-new">New</span>':'')+(n.private?'<span class="tiny">'+icon('lock',11)+' Private</span>':'')+'<span class="tiny" style="letter-spacing:0.14em;text-transform:uppercase">'+(n.kind==='note'?'Note':'Task')+'</span></div><div class="tiny" style="margin-top:3px">'+who+(n.pid?' · '+ptLabel(u,n.pid):'')+'</div>'+(last?'<p class="small tk-last"><b>'+esc(byId(last.by).first)+':</b> '+esc(last.text)+'</p>':'')+'<div class="row" style="gap:16px;flex-wrap:wrap;margin-top:8px">'+(n.done||n.withdrawn?'':dueLabel(n.due))+(msgs?'<span class="tiny">'+icon('info',11)+' '+msgs+' update'+(msgs>1?'s':'')+'</span>':'')+(n.withdrawn?'<span class="tiny">Withdrawn</span>':'')+'<span class="link tk-open">Open</span></div></div>'+upill(n.urg)+'<button class="cta cta-ghost cta-sm" type="button" data-action="fill-form" data-name="'+esc(name)+'" data-num="'+esc(num)+'">Fill for a patient</button></div></article>';
}
function viewList(u){
  const v = tasksUI.view, q = tasksUI.q.toLowerCase().trim(), all = allNotes().filter(n => canSeeTask(u,n));
  let list = v==='me' ? all.filter(n => n.to===u.id && !n.done && !n.withdrawn)
    : v==='sent' ? all.filter(n => n.from===u.id && n.to!==u.id && !n.done && !n.withdrawn)
    : v==='team' ? all.filter(n => !n.done && !n.withdrawn)
    : all.filter(n => (n.done || n.withdrawn) && (tasksUI.scope==='all' || participants(n).has(u.id)));
  if(tasksUI.urg!=='all') list = list.filter(n => n.urg===tasksUI.urg);
  if(q) list = list.filter(n => q.split(/\s+/).every(w => taskText(u,n).includes(w)));
  return v==='previous' ? list.sort((a,b) => (b.doneAt||b.t).localeCompare(a.doneAt||a.t)) : list.sort((a,b) => (URG_RANK[b.urg]-URG_RANK[a.urg]) || ((a.due||'9999').localeCompare(b.due||'9999')) || b.t.localeCompare(a.t));
}
function noteList(u){
  const list = viewList(u), v = tasksUI.view;
  if(!list.length) return '<div class="pressed" style="padding:26px;text-align:center"><p class="small">'+(tasksUI.q?'No tasks match “'+esc(tasksUI.q)+'”.':v==='me'?'Nothing waiting for you. Add a reminder or send a task to a colleague.':v==='sent'?'Nothing you sent is still open.':v==='team'?'No open tasks across the team.':'No previous tasks yet.')+'</p></div>';
  if(v==='team'){
    const by = {}; list.forEach(n => { (by[n.to]=by[n.to]||[]).push(n); });
    return Object.keys(by).sort((a,b) => (a===u.id?-1:b===u.id?1:fullName(byId(a)).localeCompare(fullName(byId(b))))).map(id => '<div class="tk-person"><div class="row" style="gap:12px;margin:6px 0 12px"><div class="avatar" style="width:34px;height:34px;font-size:0.85rem">'+initials(byId(id))+'</div><div><div class="t" style="font-size:0.95rem">'+(id===u.id?'You':esc(fullName(byId(id))))+'</div><div class="tiny">'+ROLE_LABEL[byId(id).role]+' · '+by[id].length+' open</div></div></div><div class="stack" style="gap:12px">'+by[id].map(n => noteCard(u,n)).join('')+'</div></div>').join('');
  }
  return '<div class="stack" style="gap:14px">'+list.map(n => noteCard(u,n)).join('')+'</div>';
}
function composerHTML(p, preset){
  preset = preset || {};
  const u = me();
  const others = S.staff.filter(s => s.status==='active' && s.id!==u.id);
  const groups = ['owner','admin','holistic','medical'].map(r => [r, others.filter(s => s.role===r)]).filter(g => g[1].length);
  const pts = (() => { try { return api.patients(u); } catch(e){ return []; } })();
  const kind = preset.kind || 'task', urg = preset.urg || 'routine';
  return '<form class="form" data-form="task-new" data-p="'+p+'" style="margin-top:14px">'+
    '<div class="field"><label for="'+p+'-to">Send to</label><select class="select" id="'+p+'-to"><option value="'+u.id+'"'+(preset.to===u.id?' selected':'')+'>Myself · a reminder</option>'+groups.map(g => '<optgroup label="'+ROLE_LABEL[g[0]]+'">'+g[1].map(s => '<option value="'+s.id+'"'+(preset.to===s.id?' selected':'')+'>'+esc(fullName(s))+' · '+esc(s.title)+'</option>').join('')+'</optgroup>').join('')+'</select></div>'+
    '<div class="field"><span class="lbl">Type</span><div class="seg">'+[['task','Task'],['note','Note']].map(k => '<label class="seg-b seg-r"><input type="radio" name="'+p+'-kind" value="'+k[0]+'"'+(kind===k[0]?' checked':'')+'>'+k[1]+'</label>').join('')+'</div><span class="tiny">A task gets ticked off when it’s done. A note just needs a “Got it”.</span></div>'+
    '<div class="field"><label for="'+p+'-title">Title</label><input class="input" id="'+p+'-title" required maxlength="120" value="'+esc(preset.title||'')+'" placeholder="What needs to happen?"></div>'+
    '<div class="field"><label for="'+p+'-body">Details <span style="text-transform:none;letter-spacing:0;color:var(--muted)">(optional)</span></label><textarea class="input" id="'+p+'-body" placeholder="Anything they need to know">'+esc(preset.body||'')+'</textarea></div>'+
    '<div class="field"><span class="lbl">Urgency</span><div class="seg urg-pick">'+URGENCY.map(x => '<label class="seg-b seg-r ur-'+x[0]+'"><input type="radio" name="'+p+'-urg" value="'+x[0]+'"'+(urg===x[0]?' checked':'')+'><span class="ud"></span>'+x[1]+'</label>').join('')+'</div></div>'+
    '<div class="egrid"><div class="field"><label for="'+p+'-due">Due date <span style="text-transform:none;letter-spacing:0;color:var(--muted)">(optional)</span></label><input class="input" type="date" id="'+p+'-due" min="'+isoDay(0)+'" value="'+esc(preset.due||'')+'"></div>'+
    '<div class="field"><label for="'+p+'-pid">Patient <span style="text-transform:none;letter-spacing:0;color:var(--muted)">(optional)</span></label><select class="select" id="'+p+'-pid"><option value="">None</option>'+pts.map(pt => '<option value="'+pt.id+'"'+(preset.pid===pt.id?' selected':'')+'>'+esc(pt.first+' '+pt.last)+' · '+pt.id+'</option>').join('')+'</select></div></div>'+
    '<label class="row" style="gap:10px;cursor:pointer;font-size:0.86rem"><input type="checkbox" class="check" id="'+p+'-private"> Private: only the people on this task and the owner can see it</label>'+
    '<p class="tiny">Link the patient instead of writing clinical details. The chart stays in Jane. Completed patient tasks are kept in the patient’s record.</p>'+
    '<div class="row" style="gap:12px;flex-wrap:wrap"><button class="cta cta-solid" type="submit">'+icon('arrow',14)+' Send</button></div></form>';
}
function tasksPage(u){
  const all = allNotes().filter(n => canSeeTask(u,n));
  const cMe = all.filter(n => n.to===u.id && !n.done && !n.withdrawn).length, cSent = all.filter(n => n.from===u.id && n.to!==u.id && !n.done && !n.withdrawn).length, cTeam = all.filter(n => !n.done && !n.withdrawn).length, cPrev = all.filter(n => n.done && participants(n).has(u.id)).length;
  const urgentN = all.filter(n => n.to===u.id && !n.done && !n.withdrawn && n.urg==='urgent').length;
  let h = pageHead(PORTAL_LABEL[u.role], '<em>Tasks</em>', 'Reminders for yourself, and tasks for anyone on the team. Every reply and hand-off is kept with the task.');
  h += '<div class="ed-split"><div class="stack" style="gap:18px">';
  h += '<div class="filters" style="margin-bottom:0">'+[['me','For me',cMe],['sent','Sent',cSent],['team',u.role==='owner'?'Everyone':'Team',cTeam],['previous','Previous',cPrev]].map(v => '<button class="chip'+(tasksUI.view===v[0]?' on':'')+'" data-action="tasks-view" data-v="'+v[0]+'">'+v[1]+' · '+v[2]+'</button>').join('')+'</div>';
  h += '<div class="filters" style="margin:0"><div class="search" style="flex:1 1 260px;max-width:none">'+icon('search',16)+'<label class="sr" for="tk-q">Search tasks</label><input class="input" id="tk-q" data-tkq="1" placeholder="Search by title, person, patient or message" value="'+esc(tasksUI.q)+'"></div>'+[['all','All']].concat(URGENCY).map(x => '<button class="chip urg-f'+(tasksUI.urg===x[0]?' on':'')+' uf-'+x[0]+'" data-action="tasks-urg" data-v="'+x[0]+'">'+(x[0]!=='all'?'<span class="ud"></span>':'')+x[1]+'</button>').join('')+'</div>';
  if(tasksUI.view==='previous') h += '<div class="row" style="gap:10px;flex-wrap:wrap"><span class="tiny">Show</span>'+[['mine','Tasks I was part of'],['all',u.role==='owner'?'Everyone’s':'The whole team’s']].map(s => '<button class="chip'+(tasksUI.scope===s[0]?' on':'')+'" data-action="tasks-scope" data-v="'+s[0]+'">'+s[1]+'</button>').join('')+'</div>';
  if(tasksUI.view==='team') h += '<p class="tiny">'+(u.role==='owner'?'Every open task in the clinic, by who has it now.':'Open tasks across the team, by who has it now. Private reminders are hidden.')+'</p>';
  if(urgentN && tasksUI.view==='me') h += '<div class="notice" style="background:rgba(111,62,86,0.1)">'+icon('alert')+'<div><b>'+urgentN+' urgent item'+(urgentN>1?'s':'')+'</b> waiting for you. Urgent items are listed first.</div></div>';
  h += '<div id="note-list">'+noteList(u)+'</div></div>';
  h += '<aside class="ed-side"><div class="neo panel"><div class="sub">New task or note</div><h2 style="font-size:1.7rem;margin-top:6px">Remind yourself, or send it on</h2>'+composerHTML('tk')+'</div><div class="neo panel deep"><div class="sub">Urgency colours</div><ul class="list" style="margin-top:10px">'+[['routine','Whenever you get to it'],['soon','Within a day or two'],['important','Today, before routine work'],['urgent','Drop what you’re doing']].map(x => '<li style="padding:10px 0;justify-content:flex-start;gap:12px">'+upill(x[0])+'<span class="small">'+x[1]+'</span></li>').join('')+'</ul></div></aside></div>';
  if(u.role==='admin' && can(u,'tasks.admin')) h += '<div class="sec">'+adminTasks(u)+'</div>';
  if(isPrac(u) && can(u,'tasks.clinical')) h += '<div class="sec">'+clinicalTasks(u)+'</div>';
  return h;
}
const LOG_LABEL = { created:'created this', message:'replied', forwarded:'passed it to', completed:'marked it complete', reopened:'reopened it', withdrawn:'withdrew it', acknowledged:'marked it read' };
function taskDrawer(id){
  const u = me(), n = normNote(S.notes.find(x => x.id===id));
  if(!n || !canSeeTask(u,n)){ toast('You can’t open that task.'); return; }
  if((n.unread||[]).includes(u.id)){ n.unread = n.unread.filter(x => x!==u.id); save(); }
  const open = !n.done && !n.withdrawn, act = canActOn(u,n);
  const others = S.staff.filter(s => s.status==='active');
  let h = '<div class="x-row"><div><div class="sub">'+(n.kind==='note'?'Note':'Task')+' · '+n.id+'</div><h2 style="font-size:2rem;margin-top:6px">'+esc(n.title)+'</h2><div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap">'+upill(n.urg)+(n.done?pill('Completed','p-emerald'):n.withdrawn?pill('Withdrawn','p-outline'):pill('Open','p-deep'))+(n.private?'<span class="tiny">'+icon('lock',11)+' Private</span>':'')+(open?dueLabel(n.due):'')+'</div></div><button class="icon-btn" data-action="close" aria-label="Close">'+icon('close')+'</button></div>';
  if(taskBack) h += '<button class="link" data-action="task-back" style="margin-top:12px">← Back to '+esc(canSeePatient(u,taskBack)?pName(patient(taskBack)):taskBack)+'</button>';
  h += '<dl class="dl sec"><div><dt>'+(open?'With':'Completed by')+'</dt><dd>'+esc(fullName(byId(open?n.to:(n.doneBy||n.to))))+' · '+ROLE_LABEL[byId(open?n.to:(n.doneBy||n.to)).role]+'</dd></div><div><dt>Created by</dt><dd>'+esc(fullName(byId(n.from)))+' · '+shortDate(n.t)+'</dd></div>'+(n.pid?'<div><dt>Patient</dt><dd>'+(canSeePatient(u,n.pid)?'<button class="link" style="text-transform:none;letter-spacing:0;font-size:0.95rem" data-action="open-patient" data-id="'+n.pid+'">'+ptLabel(u,n.pid)+'</button>':n.pid+' <span class="tiny">· not in your patient list</span>')+'</dd></div>':'')+'</dl>';
  h += '<div class="sub sec" style="margin-bottom:12px">Conversation</div><ol class="thread">'+n.log.map(l => { const p = byId(l.by); return '<li class="th-'+l.type+'"><div class="avatar" style="width:32px;height:32px;font-size:0.8rem">'+initials(p)+'</div><div class="grow"><div class="tiny"><b style="color:var(--ink);font-weight:400">'+esc(l.by===u.id?'You':fullName(p))+'</b> '+(LOG_LABEL[l.type]||l.type)+(l.to&&l.type!=='created'?' <b style="color:var(--ink);font-weight:400">'+esc(l.to===u.id?'you':fullName(byId(l.to)))+'</b>':'')+(l.type==='created'&&l.to&&l.to!==l.by?' for <b style="color:var(--ink);font-weight:400">'+esc(l.to===u.id?'you':fullName(byId(l.to)))+'</b>':'')+' · '+shortDate(l.t)+'</div>'+(l.text?'<div class="th-msg">'+esc(l.text)+'</div>':'')+'</div></li>'; }).join('')+'</ol>';
  if(act && open){
    h += '<div class="pressed" style="padding:18px 20px;margin-top:18px"><div class="field"><label for="td-msg">Reply or add an update</label><textarea class="input" id="td-msg" placeholder="Write a message. It’s saved with the task."></textarea></div><div class="egrid" style="margin-top:12px;align-items:end"><div class="field"><label for="td-to">Who has it next</label><select class="select" id="td-to">'+others.map(s => '<option value="'+s.id+'"'+(s.id===n.to?' selected':'')+'>'+(s.id===n.to?'Keep with ':'Pass to ')+esc(s.id===u.id?'me':fullName(s))+'</option>').join('')+'</select></div><button class="cta cta-ghost" data-action="td-send" data-id="'+n.id+'">Send</button></div><div class="row" style="gap:12px;flex-wrap:wrap;margin-top:14px">'+((n.to===u.id||u.role==='owner'||n.from===u.id)?'<button class="cta cta-solid" data-action="td-complete" data-id="'+n.id+'">'+icon('check',14)+' '+(n.kind==='note'?'Got it':'Mark complete')+'</button>':'')+(n.from===u.id?'<button class="link" data-action="note-withdraw" data-id="'+n.id+'">'+(n.from===n.to?'Delete reminder':'Withdraw')+'</button>':'')+'</div></div>';
  } else if(act && n.done){
    h += '<div class="row" style="gap:12px;margin-top:18px"><button class="cta cta-ghost" data-action="td-reopen" data-id="'+n.id+'">Reopen</button><span class="tiny">Completed tasks stay in Previous'+(n.pid?' and in the patient’s record':'')+'.</span></div>';
  }
  h += '<p class="tiny" style="margin-top:20px">Every message and hand-off is saved with the task and recorded in the audit history.</p>';
  openDrawer(h);
}
function logTask(n, entry, notify){ n.log.push(Object.assign({ t:new Date().toISOString() }, entry)); const me_ = me().id; n.unread = Array.from(new Set((n.unread||[]).concat(notify.filter(x => x && x!==me_)))); save(); }
function patientTasksHTML(u, pid, q){
  q = (q||'').toLowerCase().trim();
  const list = allNotes().filter(n => n.pid===pid && canSeeTask(u,n) && !n.withdrawn && (!q || q.split(/\s+/).every(w => taskText(u,n).includes(w))));
  const openL = list.filter(n => !n.done), prev = list.filter(n => n.done).sort((a,b) => (b.doneAt||'').localeCompare(a.doneAt||''));
  if(!list.length) return '<p class="small">'+(q?'No tasks match.':'No tasks for this patient yet.')+'</p>';
  const row = n => '<li class="pt-task" data-action="task-open" data-id="'+n.id+'" data-pid="'+pid+'" tabindex="0"><div class="row grow"><span class="ud" style="--u:var('+(n.urg==='urgent'?'--burgundy':n.urg==='important'?'--lilac':n.urg==='soon'?'--gold':'--emerald')+')"></span><div class="grow"><div style="font-size:0.92rem">'+esc(n.title)+'</div><div class="tiny">'+(n.done?'Completed by '+esc(fullName(byId(n.doneBy||n.to)))+' · '+new Date(n.doneAt).toLocaleDateString('en-CA',{day:'numeric',month:'short',year:'numeric'}):'With '+esc(fullName(byId(n.to))))+' · '+n.log.length+' entr'+(n.log.length>1?'ies':'y')+'</div></div></div><span class="link" style="font-size:0.6rem">Open</span></li>';
  return (openL.length?'<div class="tiny" style="margin:4px 0 6px;letter-spacing:0.14em;text-transform:uppercase">Open</div><ul class="list">'+openL.map(row).join('')+'</ul>':'')+(prev.length?'<div class="tiny" style="margin:14px 0 6px;letter-spacing:0.14em;text-transform:uppercase">Previous</div><ul class="list">'+prev.map(row).join('')+'</ul>':'');
}
function taskCount(u){ return myOpenNotes(u).length; }


/* ---------- 13. team dashboard, time off and staff activity ---------- */
const HUB_TYPES = { announcement:['Announcement','p-deep'], policy:['Policy change','p-lilac'], holiday:['Holiday or closure','p-yellow'], event:['Team event','p-emerald'] };
const TIMEOFF_TYPES = ['Vacation','Personal day','Unpaid leave'];
function seedHub(){ return { policyUrl:'', posts:[], reads:{} }; }
function seedVac(){ return { allow:{}, used:{}, requests:[] }; }
S.hub = S.hub || seedHub();
S.vac = S.vac || seedVac();
function fmtD(iso, opts){ return new Date(iso+'T12:00:00').toLocaleDateString('en-CA', opts||{ weekday:'short', day:'numeric', month:'short', year:'numeric' }); }
function fmtRange(a,b){ return a===b||!b ? fmtD(a) : fmtD(a,{ day:'numeric', month:'short' })+' – '+fmtD(b,{ day:'numeric', month:'short', year:'numeric' }); }
function weekdayHours(a,b){ let n = 0; const d = new Date(a+'T12:00:00'), e = new Date((b||a)+'T12:00:00'); while(d<=e){ const w = d.getDay(); if(w>0 && w<6) n++; d.setDate(d.getDate()+1); } return n*8; }
function vacFor(uid){
  const today = isoDay(0), req = S.vac.requests.filter(r => r.uid===uid);
  const annual = S.vac.allow[uid]||0, used = S.vac.used[uid]||0;
  const booked = req.filter(r => r.status==='Approved' && r.type==='Vacation' && r.end>=today).reduce((a,r) => a+r.hours, 0);
  const pending = req.filter(r => r.status==='Pending' && r.type==='Vacation').reduce((a,r) => a+r.hours, 0);
  return { annual, used, booked, pending, avail: annual-used-booked, list: req.filter(r => r.end>=today && r.status!=='Cancelled').sort((x,y) => x.start.localeCompare(y.start)) };
}
const VSTATUS = { Approved:'p-emerald', Pending:'p-yellow', Declined:'p-outline', Cancelled:'p-outline' };
function timeOffSection(u){
  const v = vacFor(u.id);
  let h = '<div class="neo panel sec"><div class="panel-head"><div><span class="num">This year</span><h2>Time off</h2></div><button class="cta cta-solid cta-sm" data-action="timeoff-new">'+icon('calendar',14)+' Request time off</button></div>';
  h += '<div class="grid g4" style="gap:16px">'+[['Annual allowance',v.annual],['Used',v.used],['Booked',v.booked],['Available',v.avail]].map((x,i) => '<div class="pressed" style="padding:16px 18px'+(i===3?';background:var(--bone-light)':'')+'"><div class="tiny" style="letter-spacing:0.14em;text-transform:uppercase">'+x[0]+'</div><div class="tnum" style="font-family:var(--serif);font-size:2.2rem;line-height:1.1;margin-top:6px'+(i===3?';color:var(--emerald)':'')+'">'+x[1]+'<span class="tiny" style="margin-left:4px">h</span></div></div>').join('')+'</div>';
  h += '<div class="bar-track" style="margin-top:16px" aria-label="'+v.used+' used and '+v.booked+' booked of '+v.annual+' hours"><div class="bar-fill" style="width:'+Math.min(100,(v.used+v.booked)/Math.max(1,v.annual)*100)+'%"></div></div><p class="tiny" style="margin-top:8px">'+(v.pending?v.pending+' h waiting for approval. ':'')+'Vacation hours reset each January. Ask the owner about carrying hours over.</p>';
  h += '<div class="sub" style="margin-top:24px">Upcoming</div>'+(v.list.length?'<ul class="list" style="margin-top:8px">'+v.list.map(r => '<li><div class="row grow"><span style="color:var(--burgundy)">'+icon('calendar',18)+'</span><div><div class="t">'+fmtRange(r.start,r.end)+'</div><div class="tiny">'+r.type+' · '+r.hours+' h'+(r.note?' · '+esc(r.note):'')+(r.status==='Approved'&&r.by?' · approved by '+esc(byId(r.by).first):'')+'</div></div></div><div class="row" style="gap:12px">'+pill(r.status, VSTATUS[r.status])+(r.status==='Pending'?'<button class="link" data-action="timeoff-cancel" data-id="'+r.id+'">Cancel</button>':'')+'</div></li>').join('')+'</ul>':'<p class="small" style="margin-top:8px">No time off booked yet.</p>');
  return h+'</div>';
}
function myActivity(u){
  const rows = S.audit.filter(a => a.uid===u.id).slice(-8).reverse();
  return '<div class="neo panel sec"><div class="panel-head"><div><span class="num">Your account</span><h2>Recent activity</h2></div><span class="small">Recorded for every staff member and visible to the owner</span></div>'+activityList(rows)+'</div>';
}
function activityList(rows){
  if(!rows.length) return '<p class="small">No activity recorded yet.</p>';
  return '<ul class="list">'+rows.map(a => { const d = new Date(a.t); return '<li style="padding:12px 0;align-items:flex-start"><div class="row grow" style="align-items:flex-start"><span class="dot'+(a.ok?'':' alert')+'" style="margin-top:7px;width:8px;height:8px"></span><div class="grow"><div style="font-size:0.92rem">'+esc(a.action)+'</div><div class="tiny">'+esc(a.target)+(a.pid?' · '+a.pid:'')+(a.info?' · '+esc(a.info):'')+'</div></div></div><span class="tiny tnum" style="white-space:nowrap">'+d.toLocaleDateString('en-CA',{day:'numeric',month:'short'})+', '+d.toLocaleTimeString('en-CA',{hour:'numeric',minute:'2-digit'})+'</span></li>'; }).join('')+'</ul>';
}
function activityDrawer(id){
  const s = byId(id), wk = Date.now()-7*86400000;
  const mine = S.audit.filter(a => a.uid===id);
  const recent = mine.filter(a => new Date(a.t).getTime()>wk);
  const count = re => recent.filter(a => re.test(a.action)).length;
  const sess = SESS[id] && s.status==='active' ? SESS[id] : null, v = vacFor(id);
  audit(me(),'Viewed staff activity',fullName(s),true);
  let h = '<div class="x-row"><div class="row"><div class="avatar lg">'+initials(s)+'</div><div><div class="sub">'+ROLE_LABEL[s.role]+' · '+esc(s.title)+'</div><h2 style="font-size:2.1rem;margin-top:4px">'+esc(fullName(s))+'</h2><div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap">'+(sess?pill(sessState(sess))+'<span class="tiny">'+esc(sess.area)+' · last activity '+ago(sess.last).toLowerCase()+'</span>':'<span class="tiny">Not signed in · last active '+esc(s.seen)+'</span>')+'</div></div></div><button class="icon-btn" data-action="close" aria-label="Close">'+icon('close')+'</button></div>';
  h += '<div class="sub sec" style="margin-bottom:10px">Last 7 days</div><div class="grid g4" style="gap:12px">'+[['Sign-ins',count(/^Signed in/)],['Records opened',count(/^(Viewed record|Opened)/)],['Changes',recent.filter(a => a.ok && !/^(Signed|Viewed|Opened|MFA)/.test(a.action)).length],['Denied',recent.filter(a => !a.ok).length]].map(x => '<div class="pressed" style="padding:12px 14px"><div class="tiny" style="letter-spacing:0.1em;text-transform:uppercase">'+x[0]+'</div><div class="tnum" style="font-family:var(--serif);font-size:1.9rem;line-height:1.1">'+x[1]+'</div></div>').join('')+'</div>';
  h += '<div class="sub sec" style="margin-bottom:6px">Time off</div><p class="small" style="color:var(--ink)">'+v.avail+' h available of '+v.annual+' h'+(v.pending?' · '+v.pending+' h pending':'')+'</p>'+(v.list.length?'<ul class="list" style="margin-top:8px">'+v.list.slice(0,3).map(r => '<li style="padding:10px 0"><span class="small" style="color:var(--ink)">'+fmtRange(r.start,r.end)+' · '+r.hours+' h</span>'+pill(r.status,VSTATUS[r.status])+'</li>').join('')+'</ul>':'');
  h += '<div class="sub sec" style="margin-bottom:4px">Recent activity</div>'+activityList(mine.slice(-20).reverse());
  h += '<div class="row" style="gap:12px;flex-wrap:wrap;margin-top:22px"><button class="cta cta-ghost cta-sm" data-action="activity-audit" data-id="'+id+'">Full audit history</button></div><p class="tiny" style="margin-top:16px">Activity shows what was done and which record, never clinical details. Staff are told about this in their confidentiality agreement. Viewing this page is itself recorded.</p>';
  openDrawer(h);
}
let auditPreset = '';

/* team dashboard */
function hubPage(u){
  const today = isoDay(0), own = can(u,'hub.manage'), hub = S.hub;
  const posts = hub.posts.filter(p => p.type==='announcement' || p.type==='policy').sort((a,b) => b.t.localeCompare(a.t));
  const hol = hub.posts.filter(p => p.type==='holiday' && (p.end||p.date)>=today).sort((a,b) => a.date.localeCompare(b.date));
  const ev = hub.posts.filter(p => p.type==='event' && p.date>=today).sort((a,b) => a.date.localeCompare(b.date));
  const away = S.vac.requests.filter(r => r.status==='Approved' && r.end>=today && r.start<=isoDay(60)).sort((a,b) => a.start.localeCompare(b.start));
  const active = S.staff.filter(s => s.status==='active');
  let h = pageHead(PORTAL_LABEL[u.role], 'Team <em>dashboard</em>', 'News, policy changes, holidays and team events for everyone at Bloom.', own?'<button class="cta cta-ghost" data-action="hub-link">'+icon('link',14)+' Policies link</button><button class="cta cta-solid" data-action="hub-new">'+icon('plus',14)+' New post</button>':'');
  h += '<div class="neo panel deep" style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:18px"><div class="row" style="gap:18px;align-items:center"><div class="seal-sm">'+icon('documents',26)+'</div><div><div class="sub">Policies &amp; procedures</div><h2 style="font-size:1.9rem;margin-top:4px">The Bloom policy library</h2><p class="small" style="margin-top:4px">Privacy, security, clinical and HR policies, kept in the shared Google Drive folder.</p></div></div>'+(hub.policyUrl?'<a class="cta cta-solid" href="'+esc(hub.policyUrl)+'" target="_blank" rel="noopener noreferrer" data-action="hub-open-policies">Open in Google Drive '+icon('arrow',14)+'</a>':(own?'<button class="cta cta-solid" data-action="hub-link">Add the Google Drive link</button>':'<span class="small">The owner hasn’t added the link yet.</span>'))+'</div>';
  h += '<div class="split sec"><div class="stack" style="gap:18px"><div class="panel-head" style="margin-bottom:0"><div><span class="num">News</span><h2>Announcements &amp; policy changes</h2></div></div>'+(posts.length?posts.map(p => { const reads = (hub.reads[p.id]||[]), readMe = reads.includes(u.id); return '<article class="neo hub-post'+(p.type==='policy'?' is-policy':'')+'"><div class="row" style="justify-content:space-between;gap:12px;flex-wrap:wrap"><div class="row" style="gap:10px">'+pill(HUB_TYPES[p.type][0],HUB_TYPES[p.type][1])+(p.type==='policy'&&p.date?'<span class="tiny">Effective '+fmtD(p.date,{day:'numeric',month:'long'})+'</span>':'')+'</div><span class="tiny">'+esc(byId(p.by).first)+' · '+new Date(p.t).toLocaleDateString('en-CA',{day:'numeric',month:'short'})+'</span></div><h3 class="hub-t">'+esc(p.title)+'</h3><p class="small" style="color:var(--soft)">'+esc(p.body)+'</p>'+(p.link?'<a class="link" href="'+esc(p.link)+'" target="_blank" rel="noopener noreferrer" style="margin-top:8px">Open document</a>':'')+'<div class="row" style="gap:16px;flex-wrap:wrap;margin-top:12px">'+(p.type==='policy'?(readMe?'<span class="tiny" style="color:var(--emerald)">'+icon('check',12)+' You’ve read this</span>':'<button class="cta cta-ghost cta-sm" data-action="hub-read" data-id="'+p.id+'">I’ve read this</button>')+(own?'<span class="tiny">Read by '+reads.filter(x => active.some(s => s.id===x)).length+' of '+active.length+'</span>':''):'')+(own?'<button class="link" data-action="hub-del" data-id="'+p.id+'">Remove</button>':'')+'</div></article>'; }).join(''):'<p class="small">No announcements yet.</p>')+'</div>';
  h += '<div class="stack"><div class="neo panel"><div class="panel-head"><div><span class="num">Calendar</span><h2>Holidays &amp; closures</h2></div></div>'+(hol.length?'<ul class="list">'+hol.map(p => '<li><div class="row grow"><div class="cal"><span>'+fmtD(p.date,{month:'short'})+'</span><b>'+fmtD(p.date,{day:'numeric'})+'</b></div><div><div class="t">'+esc(p.title)+'</div><div class="tiny">'+(p.end?fmtRange(p.date,p.end):fmtD(p.date,{weekday:'long'}))+' · '+esc(p.body)+'</div></div></div>'+(own?'<button class="link" data-action="hub-del" data-id="'+p.id+'">Remove</button>':'')+'</li>').join('')+'</ul>':'<p class="small">Nothing coming up.</p>')+'</div>';
  h += '<div class="neo panel"><div class="panel-head"><div><span class="num">Together</span><h2>Team events</h2></div></div>'+(ev.length?'<ul class="list">'+ev.map(p => '<li style="align-items:flex-start"><div class="row grow" style="align-items:flex-start"><div class="cal ev"><span>'+fmtD(p.date,{month:'short'})+'</span><b>'+fmtD(p.date,{day:'numeric'})+'</b></div><div><div class="t">'+esc(p.title)+'</div><div class="tiny">'+fmtD(p.date,{weekday:'long'})+(p.time?' · '+esc(p.time):'')+'</div><p class="small" style="margin-top:4px">'+esc(p.body)+'</p></div></div>'+(own?'<button class="link" data-action="hub-del" data-id="'+p.id+'">Remove</button>':'')+'</li>').join('')+'</ul>':'<p class="small">No events planned.</p>')+'</div>';
  h += '<div class="neo panel deep"><div class="panel-head"><div><span class="num">Next 60 days</span><h2>Who’s away</h2></div></div>'+(away.length?'<ul class="list">'+away.map(r => '<li style="padding:12px 0"><div class="row grow"><div class="avatar" style="width:34px;height:34px;font-size:0.85rem">'+initials(byId(r.uid))+'</div><div><div class="t" style="font-size:0.9rem">'+esc(fullName(byId(r.uid)))+'</div><div class="tiny">'+fmtRange(r.start,r.end)+'</div></div></div></li>').join('')+'</ul>':'<p class="small">Everyone’s in.</p>')+'<p class="tiny" style="margin-top:10px">Shows dates only. Reasons for time off stay private.</p></div></div></div>';
  return h;
}
function timeoffRequestsPanel(){
  const pend = S.vac.requests.filter(r => r.status==='Pending');
  return '<div class="neo panel sec"><div class="panel-head"><div><span class="num">Time off</span><h2>Requests to review</h2></div><span class="small">'+(pend.length?pend.length+' waiting':'All caught up')+'</span></div>'+(pend.length?'<ul class="list">'+pend.map(r => { const v = vacFor(r.uid); return '<li><div class="row grow"><div class="avatar" style="width:38px;height:38px;font-size:0.95rem">'+initials(byId(r.uid))+'</div><div><div class="t">'+esc(fullName(byId(r.uid)))+' · '+fmtRange(r.start,r.end)+'</div><div class="tiny">'+r.type+' · '+r.hours+' h · '+v.avail+' h available'+(r.note?' · '+esc(r.note):'')+'</div></div></div><div class="row" style="gap:10px"><button class="cta cta-ghost cta-sm" data-action="timeoff-decide" data-id="'+r.id+'" data-v="Declined">Decline</button><button class="cta cta-solid cta-sm" data-action="timeoff-decide" data-id="'+r.id+'" data-v="Approved">Approve</button></div></li>'; }).join('')+'</ul>':'<p class="small">No time off requests waiting.</p>')+'</div>';
}

/* ---------- Form Library: verified official Alberta forms (links checked 18 Oct 2026) ---------- */
const AHS = n => 'https://www.albertahealthservices.ca/frm-'+n+'.pdf';
const SRC = {
  apl:'https://www.albertaprecisionlabs.ca/hp/Page13849.aspx',
  gen:'https://www.albertaprecisionlabs.ca/webapps/reqgenerator/Step1',
  di:'https://www.albertahealthservices.ca/info/page9911.aspx',
  ard:'https://www.albertahealthservices.ca/info/page14282.aspx',
  ardSite:'https://albertareferraldirectory.ca',
  mayfair:'https://physicians.radiology.ca/requisition-forms/',
  abc:'https://www.ab.bluecross.ca/dbl/forms.php'
};
const FORM_CATS = [
  ['lab','Laboratory Requisitions',['General','Hormone & endocrine','Specialized testing','Microbiology & pathology','Genetic testing','Other APL requisitions']],
  ['img','Diagnostic Imaging',['X-ray','Ultrasound','Mammography','CT','MRI','Bone density (DEXA)','Other imaging']],
  ['ref','Specialist Referrals',['General referral forms','Cardiology','Endocrinology','Gastroenterology','Gynecology','Dermatology','Neurology','Rheumatology','Other specialist referrals']],
  ['rx','Prescriptions & Treatment Forms',['Prescriptions','Medication authorization','Treatment consent']],
  ['scr','Screening & Assessments',['Preventive health screening','Mental health','Women’s health','Men’s health','Other validated tools']],
  ['oth','Other Clinical Forms',['General medical forms','Patient consent','Medical records requests','Practitioner documentation']]
];
const FORM_NOTES = {
  'lab|Hormone & endocrine':'Routine hormone and thyroid tests (TSH, free T4, estradiol, testosterone, FSH, LH, prolactin and others) are ordered on the General Laboratory Requisition.',
  'img|X-ray':'Many outpatient exams in Calgary are done at community imaging clinics, which use their own requisitions. The AHS forms below are for AHS imaging sites.',
  'ref|Cardiology':'Each Alberta specialty service sets its own referral form and criteria. Search the Alberta Referral Directory for the service, then use the form it lists. Where none is listed, the AHS Generic Referral is accepted by many services.',
  'rx|Prescriptions':'Alberta has no official prescription template. A Bloom prescription must include every element in the CRNA standards below.',
  'scr|Men’s health':'PSA, testosterone and other men’s health bloodwork are ordered on the General Laboratory Requisition.'
};
// [name, number, cat, sub, description, pdf, source, org, tags, also]
const FORM_LIB = [
  // Laboratory · General
  ['General Laboratory Requisition','21302','lab','General','The standard APL community requisition for chemistry, hematology, endocrine, urine and most routine bloodwork.',AHS(21302),SRC.apl,'Alberta Precision Laboratories','bloodwork cbc lipids a1c tsh ferritin general'],
  ['APL Requisition Generator','','lab','General','Fill and print nine common APL requisitions online: General, Microbiology, Anatomical Pathology, Dermatopathology, Gynecological Cytopathology, IgE Allergy, Mobile Collections, Semen Analysis and Urea Breath Test.','',SRC.gen,'Alberta Precision Laboratories','online generator fillable'],
  ['Laboratory Requisition Completion Aid','','lab','General','APL’s guide to completing requisitions so specimens aren’t rejected.','https://www.albertahealthservices.ca/assets/wf/lab/wf-lab-qa08-103-requisition-completion-aid.pdf',SRC.apl,'Alberta Precision Laboratories','how to guide'],
  ['Laboratory Add-on / Order Modification Requisition','CH-0679','lab','General','Add a test to, or change, an order already sent to the lab.','https://www.albertahealthservices.ca/frm-ch-0679.pdf',SRC.apl,'Alberta Precision Laboratories','add on modify'],
  ['Mobile Collections Requisition','22108','lab','General','For patients who need specimens collected at home or another off-site location.',AHS(22108),SRC.apl,'Alberta Precision Laboratories','home collection homebound'],
  // Hormone & endocrine
  ['Laboratory Services Vitamin D (25-Hydroxy)','19500','lab','Hormone & endocrine','25-hydroxy vitamin D testing, which is limited to specific clinical criteria in Alberta.',AHS(19500),SRC.apl,'Alberta Precision Laboratories','vitamin d 25oh bone'],
  ['AMA & AHS Vitamin D Completion Aid','','lab','Hormone & endocrine','Which patients qualify for vitamin D testing, and how to complete the request.','https://www.albertahealthservices.ca/assets/wf/lab/wf-lab-ama-ahs-vitamin-d-sheet.pdf',SRC.apl,'Alberta Medical Association & AHS','vitamin d criteria'],
  ['Chemistry Specialty Requisition','CH-0311','lab','Hormone & endocrine','Edmonton Zone requisition for restricted vitamin D, ANA screen, biochemical genetics and trace elements.','https://www.albertahealthservices.ca/frm-ch-0311.pdf',SRC.apl,'Alberta Precision Laboratories','trace elements ana edmonton'],
  ['Cancer and Endocrine Next Generation Sequencing Requisition','20897','lab','Hormone & endocrine','Provincial requisition for hereditary cancer and endocrine gene panels.',AHS(20897),SRC.apl,'Alberta Precision Laboratories','genetic endocrine ngs hereditary',[['lab','Genetic testing']]],
  // Specialized
  ['IgE Allergy Testing Requisition','22106','lab','Specialized testing','Specific IgE testing for environmental and food allergens.',AHS(22106),SRC.apl,'Alberta Precision Laboratories','allergy ige food'],
  ['Urea Breath Test for H. pylori Requisition','22107','lab','Specialized testing','Breath test for Helicobacter pylori infection.',AHS(22107),SRC.apl,'Alberta Precision Laboratories','h pylori ubt stomach gastroenterology'],
  ['Special Coagulation: Hemostasis Investigations','21905','lab','Specialized testing','Bleeding-disorder workup, including factor levels and von Willebrand studies.',AHS(21905),SRC.apl,'Alberta Precision Laboratories','bleeding coagulation'],
  ['Special Coagulation: Hereditary Thrombophilia','21911','lab','Specialized testing','Inherited clotting-risk investigations.',AHS(21911),SRC.apl,'Alberta Precision Laboratories','clotting thrombophilia'],
  ['Antiphospholipid Syndrome Investigation Requisition','22071','lab','Specialized testing','Testing for antiphospholipid syndrome.',AHS(22071),SRC.apl,'Alberta Precision Laboratories','aps lupus anticoagulant'],
  ['QuantiFERON TB Testing','21996','lab','Specialized testing','Interferon-gamma release assay for tuberculosis.',AHS(21996),SRC.apl,'Alberta Precision Laboratories','tb tuberculosis igra'],
  ['Flow Cytometry Requisition','22229','lab','Specialized testing','Flow cytometry for hematologic investigations.',AHS(22229),SRC.apl,'Alberta Precision Laboratories','hematology'],
  ['Infliximab Level Order','20740','lab','Specialized testing','Infliximab drug and antibody levels.',AHS(20740),SRC.apl,'Alberta Precision Laboratories','drug monitoring ibd'],
  ['Semen Analysis Requisition','20774','lab','Specialized testing','Semen analysis for fertility or post-vasectomy testing.',AHS(20774),SRC.apl,'Alberta Precision Laboratories','fertility vasectomy male',[['scr','Men’s health']]],
  // Microbiology & pathology
  ['Microbiology Requisition','20571','lab','Microbiology & pathology','Cultures, swabs, urine, stool and other community microbiology. Also used for clinical tick submission.',AHS(20571),SRC.apl,'Alberta Precision Laboratories','culture swab urine stool'],
  ['STI Test Requisition','19914','lab','Microbiology & pathology','Sexually transmitted infection testing.',AHS(19914),SRC.apl,'Alberta Precision Laboratories','chlamydia gonorrhea syphilis hiv',[['scr','Women’s health'],['scr','Men’s health']]],
  ['COVID-19, Influenza & Respiratory Pathogen Panel','21701','lab','Microbiology & pathology','Respiratory virus testing.',AHS(21701),SRC.apl,'Alberta Precision Laboratories','covid flu rsv'],
  ['Serology and Molecular Testing Requisition','20676','lab','Microbiology & pathology','Public health lab serology and molecular tests, such as hepatitis and immune status.',AHS(20676),SRC.apl,'Alberta Precision Laboratories','hepatitis immunity serology'],
  ['Public Health Microbiology Requisition','20691','lab','Microbiology & pathology','Specimens for the Public Health Laboratory.',AHS(20691),SRC.apl,'Alberta Precision Laboratories','provlab public health'],
  ['Rapid HIV Antibody Requisition','21636','lab','Microbiology & pathology','Rapid HIV antibody testing.',AHS(21636),SRC.apl,'Alberta Precision Laboratories','hiv'],
  ['Blood and Body Fluid Exposure','21150','lab','Microbiology & pathology','Testing after a blood or body fluid exposure.',AHS(21150),SRC.apl,'Alberta Precision Laboratories','needlestick exposure'],
  ['Gynecological Cytopathology Requisition','21815','lab','Microbiology & pathology','Pap tests and cervical cytology.',AHS(21815),SRC.apl,'Alberta Precision Laboratories','pap cervical screening',[['scr','Women’s health']]],
  ['Colposcopy Pathology Requisition','22272','lab','Microbiology & pathology','Pathology from colposcopy procedures.',AHS(22272),SRC.apl,'Alberta Precision Laboratories','colposcopy cervical'],
  ['Non-Gynecological Cytopathology Requisition','22204','lab','Microbiology & pathology','Cytology from non-gynecologic sites.',AHS(22204),SRC.apl,'Alberta Precision Laboratories','cytology'],
  ['Anatomical Pathology Consultation Request','19027','lab','Microbiology & pathology','Tissue and biopsy specimens for pathology.',AHS(19027),SRC.apl,'Alberta Precision Laboratories','biopsy tissue'],
  ['Dermatopathology Requisition','21147','lab','Microbiology & pathology','Skin biopsies.',AHS(21147),SRC.apl,'Alberta Precision Laboratories','skin biopsy dermatology'],
  // Genetic
  ['Molecular Genetics Laboratory General Requisition','21892','lab','Genetic testing','General molecular genetics testing.',AHS(21892),SRC.apl,'Alberta Precision Laboratories','dna genetic'],
  ['Cytogenetic Analysis, Constitutional','21890','lab','Genetic testing','Constitutional chromosome studies, North and South.',AHS(21890),SRC.apl,'Alberta Precision Laboratories','karyotype chromosome'],
  ['Biochemical Genetics Laboratory Requisition','18521','lab','Genetic testing','Metabolic and biochemical genetics testing.',AHS(18521),SRC.apl,'Alberta Precision Laboratories','metabolic'],
  ['Cardiac, Connective Tissue & Vascular NGS Requisition','21778','lab','Genetic testing','Gene panels for inherited cardiac, connective tissue and vascular conditions.',AHS(21778),SRC.apl,'Alberta Precision Laboratories','cardiac genetic marfan',[['ref','Cardiology']]],
  ['Oncotype DX Requisition','21809','lab','Genetic testing','Tumour gene-expression testing, usually ordered by specialists.',AHS(21809),SRC.apl,'Alberta Precision Laboratories','oncology breast'],
  // Other APL
  ['Prenatal Testing Requisition','21151','lab','Other APL requisitions','Prenatal serology and immune status.',AHS(21151),SRC.apl,'Alberta Precision Laboratories','pregnancy prenatal',[['scr','Women’s health']]],
  ['First Trimester Prenatal Risk Assessment','21909','lab','Other APL requisitions','First trimester prenatal screening.',AHS(21909),SRC.apl,'Alberta Precision Laboratories','pregnancy screening',[['scr','Women’s health']]],
  ['Second Trimester Prenatal Risk Assessment','21908','lab','Other APL requisitions','Second trimester prenatal screening.',AHS(21908),SRC.apl,'Alberta Precision Laboratories','pregnancy screening',[['scr','Women’s health']]],
  ['Canadian Blood Services Perinatal Requisitions','','lab','Other APL requisitions','Perinatal blood group and antibody testing, handled by Canadian Blood Services.','','https://www.blood.ca/en/requisitions-and-forms','Canadian Blood Services','perinatal rh antibody'],
  ['Zoonotic Serology Requisition','20087','lab','Other APL requisitions','Serology for animal-borne infections.',AHS(20087),SRC.apl,'Alberta Precision Laboratories','lyme zoonotic'],
  ['Malaria PCR Requisition','20722','lab','Other APL requisitions','Malaria PCR testing.',AHS(20722),SRC.apl,'Alberta Precision Laboratories','travel malaria'],
  ['All APL requisitions','','lab','Other APL requisitions','The full, current list of more than 70 APL requisitions, including transplant, transfusion and hospital forms.','',SRC.apl,'Alberta Precision Laboratories','complete list'],
  // Imaging
  ['X-Ray Request','00040','img','X-ray','AHS request for general radiography.',AHS('00040'),SRC.di,'Alberta Health Services','xray radiograph'],
  ['Lumbar Spine Imaging Screening Record','19747','img','X-ray','Screening record for lumbar spine imaging requests.',AHS(19747),SRC.di,'Alberta Health Services','back pain spine'],
  ['Ultrasound Request','09922','img','Ultrasound','AHS request for ultrasound.',AHS('09922'),SRC.di,'Alberta Health Services','us sonography pelvic abdominal'],
  ['Mammography Request','21356','img','Mammography','AHS request for screening or diagnostic mammography.',AHS(21356),SRC.di,'Alberta Health Services','breast screening',[['scr','Women’s health']]],
  ['Computed Tomography (CT) Request','00033','img','CT','AHS request for CT.',AHS('00033'),SRC.di,'Alberta Health Services','ct scan'],
  ['MRI Request','04998','img','MRI','AHS request for MRI.',AHS('04998'),SRC.di,'Alberta Health Services','mri'],
  ['MRI Patient History & Screening','18821','img','MRI','Safety screening that goes with an MRI request.',AHS(18821),SRC.di,'Alberta Health Services','mri safety implants'],
  ['Bone mineral density (DEXA): community imaging','','img','Bone density (DEXA)','AHS doesn’t publish a separate bone density form. In Calgary, DEXA is booked through community imaging clinics using their requisitions.','','https://physicians.radiology.ca/services/bone-mineral-densitometry/','Mayfair Diagnostics','dexa bmd osteoporosis'],
  ['Nuclear Medicine Request','19031','img','Other imaging','AHS request for nuclear medicine studies.',AHS(19031),SRC.di,'Alberta Health Services','bone scan nuclear'],
  ['PET/CT Imaging Request','19032','img','Other imaging','AHS request for PET/CT.',AHS(19032),SRC.di,'Alberta Health Services','pet'],
  ['Image Guided Interventional Procedures Request','09015','img','Other imaging','Biopsies, drains and other image-guided procedures.',AHS('09015'),SRC.di,'Alberta Health Services','interventional biopsy'],
  ['Mayfair General Requisition (Calgary)','','img','Other imaging','Community imaging requisition for Mayfair Diagnostics clinics in Calgary.','https://physicians.radiology.ca/wp-content/uploads/2025/11/10.1-General-Calgary-REQ-fillable.pdf',SRC.mayfair,'Mayfair Diagnostics','community x-ray ultrasound calgary'],
  ['Mayfair MRI/CT Requisition','','img','Other imaging','Community MRI and CT at Mayfair Diagnostics.','https://physicians.radiology.ca/wp-content/uploads/2024/10/Mayfair_MRI_CT_Req-fillable.pdf',SRC.mayfair,'Mayfair Diagnostics','community mri ct'],
  ['Mayfair Vascular Ultrasound Requisition','','img','Other imaging','Community vascular ultrasound.','https://physicians.radiology.ca/wp-content/uploads/2024/10/Mayfair_Vascular_Requisition-fillable.pdf',SRC.mayfair,'Mayfair Diagnostics','doppler vascular'],
  ['Mayfair Cardiac Requisition','','img','Other imaging','Community cardiac imaging at Mayfair Diagnostics.','https://physicians.radiology.ca/wp-content/uploads/2024/11/Mayfair_Cardiac_Req-fillable_2024.pdf',SRC.mayfair,'Mayfair Diagnostics','echo cardiac',[['ref','Cardiology']]],
  // Referrals
  ['Generic Referral','19619','ref','General referral forms','AHS referral form for services without their own. Covers reason, priority, history, medications, allergies and investigations.',AHS(19619),SRC.ard,'Alberta Health Services','referral consult'],
  ['Connect Care Referral','21396','ref','General referral forms','Referral or eConsult form for services that use Connect Care.',AHS(21396),SRC.ard,'Alberta Health Services','connect care econsult'],
  ['Alberta Referral Directory','','ref','General referral forms','Every Alberta specialty service with its referral criteria, forms and fax numbers.','',SRC.ardSite,'Alberta Health Services','ard directory'],
  ['Specialist LINK (Calgary)','','ref','General referral forms','Calgary’s same-day telephone advice line from specialists, plus referral pathways.','','https://www.specialistlink.ca','Specialist LINK','tele-advice calgary'],
  ['Cardiology referral (Calgary Zone)','','ref','Cardiology','Find the Calgary cardiology service you need, such as arrhythmia or the Women’s Cardiovascular Health Clinic, and its required form in the Alberta Referral Directory.','',SRC.ardSite,'Alberta Health Services','heart cardiac'],
  ['Endocrinology referral (Calgary Zone)','','ref','Endocrinology','Calgary Zone Endocrinology Central Access and Triage. Criteria and form are listed in the Alberta Referral Directory.','',SRC.ardSite,'Alberta Health Services','thyroid diabetes hormone'],
  ['Gastroenterology Central Access & Triage (Calgary)','19619','ref','Gastroenterology','Calgary GI Central Access and Triage accepts the AHS Generic Referral for non-Connect Care users.',AHS(19619),'https://www.albertahealthservices.ca/findhealth/service.aspx?Id=1019457','Alberta Health Services','gi bowel liver'],
  ['High Risk Iron Deficiency Anemia Referral Checklist','','ref','Gastroenterology','Checklist that goes with GI referrals for high-risk iron deficiency anemia, Calgary.','https://www.specialistlink.ca/assets/pdf/HR-IDA-Referral-Checklist-v.Jan2022.pdf','https://www.albertahealthservices.ca/findhealth/service.aspx?Id=1019457','Specialist LINK / AHS','anemia iron gi'],
  ['High Risk Rectal Bleeding Referral Checklist','','ref','Gastroenterology','Checklist that goes with GI referrals for high-risk rectal bleeding, Calgary.','https://www.specialistlink.ca/assets/pdf/HR-Rectal-Bleeding-Referral-Checklist_Calgary-v.Jan2022.pdf','https://www.albertahealthservices.ca/findhealth/service.aspx?Id=1019457','Specialist LINK / AHS','bleeding gi'],
  ['Gynecology referral','','ref','Gynecology','Find the right gynecology service and its referral form in the Alberta Referral Directory.','',SRC.ardSite,'Alberta Health Services','women gynecology'],
  ['Dermatology referral','','ref','Dermatology','Find the right dermatology service and its referral form in the Alberta Referral Directory.','',SRC.ardSite,'Alberta Health Services','skin'],
  ['Neurology Central Access & Triage (Calgary)','','ref','Neurology','Calgary Zone neurology intake. Criteria and form are listed on the service page.','','https://www.albertahealthservices.ca/findhealth/Service.aspx?id=1074551&serviceAtFacilityID=1119415','Alberta Health Services','headache seizure neurology'],
  ['Rheumatology referral (Calgary Zone)','','ref','Rheumatology','Calgary Zone Rheumatology Central Access and Triage. Criteria and form are listed in the Alberta Referral Directory.','',SRC.ardSite,'Alberta Health Services','arthritis lupus'],
  ['Adult Chronic Pain Specialist Referral','19344','ref','Other specialist referrals','AHS referral to adult chronic pain specialists.',AHS(19344),SRC.ard,'Alberta Health Services','pain'],
  // Prescriptions & treatment
  ['Prescribing Standards for Nurse Practitioners','','rx','Prescriptions','CRNA standards, effective 31 March 2023, including what every prescription must contain.','https://nurses.ab.ca/media/ubme2coj/prescribing-standards-for-nurse-practitioners-2022.pdf','https://nurses.ab.ca/protecting-the-public/standards-code-of-ethics/standards-for-rns-and-nps/prescribing-standards-for-nurse-practitioners/','College of Registered Nurses of Alberta','prescription crna'],
  ['Triplicate Prescription Program (TPP) Guide','','rx','Prescriptions','How TPP works for monitored drugs. TPP pads are ordered from CPSA and can’t be downloaded. This guide is from 2020, so check CPSA for changes, including the newer two-part forms.','https://cpsa.ca/wp-content/uploads/2020/06/TPP-Guide.pdf','https://cpsa.ca/news/tpp-alberta-news-two-part-forms-now-in-use-update-on-foquest/','College of Physicians & Surgeons of Alberta','opioid controlled tpp'],
  ['Drug Special Authorization Request','ABC 60015','rx','Medication authorization','Alberta Blue Cross general special authorization form, for drugs without their own form. Confirm NP eligibility with Alberta Blue Cross.','https://idbl.ab.bluecross.ca/idbl/DBL/60015.pdf',SRC.abc,'Alberta Blue Cross','special authorization coverage'],
  ['Drug-specific Special Authorization forms','','rx','Medication authorization','More than 100 drug-specific Blue Cross forms, such as osteoporosis, migraine and biologics.','',SRC.abc,'Alberta Blue Cross','special authorization biologics'],
  ['Special Access Program: request a drug','','rx','Medication authorization','Health Canada’s process to request a drug not marketed in Canada.','','https://www.canada.ca/en/health-canada/services/drugs-health-products/special-access/drugs.html','Health Canada','sap unapproved drug'],
  ['Consent to Treatment Plan or Procedure','09741','rx','Treatment consent','AHS consent form (Rev 2013-10). Useful as a reference when Bloom writes its own consent.',AHS('09741'),'https://albertahealthservices.ca/info/Page3064.aspx','Alberta Health Services','consent procedure'],
  // Screening & assessments
  ['Alberta Colorectal Cancer Screening Program (FIT)','','scr','Preventive health screening','Home FIT screening for Albertans aged 50 to 74. Providers give eligible patients a lab requisition for the kit.','','https://www.albertahealthservices.ca/findhealth/Service.aspx?id=1026405','Alberta Health Services','colon cancer fit'],
  ['Fracture risk assessment','','scr','Preventive health screening','Osteoporosis Canada’s tools for 10-year fracture risk.','','https://osteoporosis.ca/fracture-risk-assessment/','Osteoporosis Canada','frax caroc bone'],
  ['CANRISK: Canadian Diabetes Risk Questionnaire','','scr','Preventive health screening','Validated questionnaire for type 2 diabetes risk.','','https://diabetes.ca/static/risk-assessment.html','Diabetes Canada','diabetes risk'],
  ['PHQ-9 and GAD-7 screeners','','scr','Mental health','Validated depression and anxiety screening questionnaires.','','https://www.phqscreeners.com/','Pfizer PHQ Screeners','depression anxiety mood']
  ,
  // Other clinical forms
  ['Medical Examination for Motor Vehicle Operators','TRANS3050','oth','General medical forms','Completed by a physician or nurse practitioner when a driver medical is requested.','','https://cfr.forms.gov.ab.ca/Form/TRANS3050','Government of Alberta','driver licence medical'],
  ['Consent to Disclose Health Information','18028','oth','Patient consent','AHS form recording a patient’s consent to share health information with another person or organization.',AHS(18028),'https://www.albertahealthservices.ca/frm-18028.pdf','Alberta Health Services','consent release disclose'],
  ['Request to Access Information','09718','oth','Medical records requests','For requesting records held by AHS, such as hospital records (Rev 2026-04).',AHS('09718'),'https://www.albertahealthservices.ca/frm-09718.pdf','Alberta Health Services','records access hospital'],
  ['Bloom record requests','','oth','Medical records requests','Requests for Bloom’s own records are handled by the Privacy Officer under the Health Information Act, with a response within 30 days.','','#/','Bloom','hia access correction'],
  ['Clinic templates','','oth','Practitioner documentation','Clinic-made templates appear here once the owner uploads and maps them in Documents.','','#/','Bloom','template']
];
let formsUI = { cat:'all', q:'' };
function formMatches(f, q){ if(!q) return true; const hay = (f[0]+' '+f[1]+' '+f[3]+' '+f[4]+' '+f[7]+' '+(f[8]||'')+' '+FORM_CATS.find(c => c[0]===f[2])[1]).toLowerCase(); return q.split(/\s+/).every(w => hay.includes(w)); }
function formCard(f){
  const [name,num,cat,sub,desc,pdf,src,org] = f;
  const internal = src==='#/';
  return '<article class="neo fl-card"><div class="row" style="justify-content:space-between;gap:10px;flex-wrap:wrap"><span class="tiny fl-sub">'+esc(sub)+'</span>'+(num?'<span class="pill p-deep plain tnum">'+esc(/^[A-Z]/.test(num)?num:'Form '+num)+'</span>':'')+'</div><h3 class="fl-name">'+esc(name)+'</h3><p class="small">'+esc(desc)+'</p><div class="tiny" style="margin-top:auto">'+esc(org)+'</div><div class="fl-acts">'+(pdf?'<a class="cta cta-solid cta-sm" href="'+esc(pdf)+'" target="_blank" rel="noopener noreferrer" data-action="form-open" data-name="'+esc(name)+'">'+icon('download',13)+' Download PDF</a>':'')+(internal?'<span class="tiny">Managed in Bloom</span>':'<a class="link" href="'+esc(src)+'" target="_blank" rel="noopener noreferrer" data-action="form-open" data-name="'+esc(name)+' (source)">View official source</a>')+'</div></article>';
}
function formResults(){
  const q = formsUI.q.toLowerCase().trim();
  const cats = formsUI.cat==='all' ? FORM_CATS : FORM_CATS.filter(c => c[0]===formsUI.cat);
  let h = '', total = 0;
  cats.forEach(c => {
    let block = '';
    c[2].forEach(sub => {
      const items = FORM_LIB.filter(f => ((f[2]===c[0] && f[3]===sub) || (formsUI.cat!=='all' && (f[9]||[]).some(a => a[0]===c[0] && a[1]===sub))) && formMatches(f,q));
      if(!items.length) return;
      total += items.length;
      const note = !q ? FORM_NOTES[c[0]+'|'+sub] : '';
      block += '<div class="fl-group"><div class="fl-gh"><h3>'+esc(sub)+'</h3><span class="tiny">'+items.length+' form'+(items.length>1?'s':'')+'</span></div>'+(note?'<p class="small fl-note">'+icon('info',14)+' '+esc(note)+'</p>':'')+'<div class="grid g3 fl-grid">'+items.map(formCard).join('')+'</div></div>';
    });
    if(block) h += '<section class="fl-cat"><div class="panel-head" style="margin-bottom:6px"><div><span class="num">'+(FORM_CATS.indexOf(c)+1)+'</span><h2>'+esc(c[1])+'</h2></div></div>'+block+'</section>';
  });
  if(!total) h = '<div class="pressed" style="padding:30px;text-align:center"><p class="small">No forms match “'+esc(formsUI.q)+'”. Try a specialty or test name, or check the full lists at <a href="'+SRC.apl+'" target="_blank" rel="noopener noreferrer">APL requisitions</a> and the <a href="'+SRC.ardSite+'" target="_blank" rel="noopener noreferrer">Alberta Referral Directory</a>.</p></div>';
  return h;
}
function formsPage(u){
  const count = id => FORM_LIB.filter(f => f[2]===id || (f[9]||[]).some(a => a[0]===id)).length;
  let h = pageHead(PORTAL_LABEL[u.role], 'Form <em>library</em>', 'Official Alberta requisitions, referral forms and clinical tools in one place. Every link goes to the official source.');
  h += '<div class="neo panel deep fl-official"><div class="sub">Official Alberta resources</div><div class="fl-links">'+[['Alberta Precision Laboratories','https://www.albertaprecisionlabs.ca/'],['APL Requisition Generator',SRC.gen],['General Laboratory Requisition',AHS(21302)],['Alberta Health Services','https://www.albertahealthservices.ca/'],['Alberta Referral Directory',SRC.ard]].map(l => '<a class="chip" href="'+l[1]+'" target="_blank" rel="noopener noreferrer" data-action="form-open" data-name="'+esc(l[0])+'">'+esc(l[0])+' '+icon('arrow',12)+'</a>').join('')+'</div></div>';
  h += '<div class="fl-bar"><div class="search fl-search">'+icon('search',16)+'<label class="sr" for="fl-q">Search forms</label><input class="input" id="fl-q" placeholder="Search by form name, number, specialty or keyword" value="'+esc(formsUI.q)+'" data-flq="1"></div><div class="filters" style="margin:0">'+[['all','All',FORM_LIB.length]].concat(FORM_CATS.map(c => [c[0],c[1],count(c[0])])).map(c => '<button class="chip'+(formsUI.cat===c[0]?' on':'')+'" data-action="fl-cat" data-c="'+c[0]+'">'+esc(c[1])+' <span class="tnum" style="opacity:0.7">'+c[2]+'</span></button>').join('')+'</div></div>';
  h += '<div id="fl-results">'+formResults()+'</div>';
  h += '<p class="tiny sec">Links checked against official sources on 18 October 2026. Forms change, so always use the current version from the source. Download opens the official PDF in a new tab.</p>';
  return h;
}

/* ---------- 14. client chart (practitioner view) ----------
   A one-page summary of what Bloom holds for a client, laid out as panels.
   Jane remains the official clinical record. All chart data below is fictional. */
let CHART = {};
function ageOf(dob){ const [y,m,d] = dob.split('-').map(Number), n = new Date(); let a = n.getFullYear()-y; if(n.getMonth()+1 < m || (n.getMonth()+1===m && n.getDate() < d)) a--; return a; }
function chartData(p){
  const c = CHART[p.id] || {};
  const plans = allPlans().filter(x => x.pid===p.id);
  // herbs: the chart record, or the herbs in the client's wellness plan
  let herbs = c.herbs;
  if(!herbs){ const w = plans.find(x => x.type==='wellness' && DEMO_PLANS[x.id]); herbs = w ? (planDraft(w).herbs||[]).filter(h => h.common).map(h => [h.common, [h.amount,h.frequency].filter(Boolean).join(' · ')+' · wellness plan, '+w.date]) : []; }
  // labs: the chart record, or the biomarkers in the client's clinical plan
  let labs = c.labs, labDate = c.labDate;
  if(!labs){ const k = plans.find(x => x.type==='clinical' && DEMO_PLANS[x.id]); const bio = k ? (planDraft(k).bio||[]) : []; labs = bio.map(b => [b.name,b.result,b.unit,b.range,b.prev,b.status]); if(bio.length) labDate = bio[0].date; }
  const notes = c.notes || plans.map(x => [x.date, x.kind+(x.type==='wellness'?' · wellness plan':' · care plan'), x.by, planStatus(x).status, x.type, x.id]);
  const panel = PANELS.find(x => x.pid===p.id);
  const reminders = c.reminders || [['Next visit', p.clin.next]];
  return { profile:c.profile||[], allergies:c.allergies, meds:c.meds||[], herbs, social:c.social||[], vitals:c.vitals||[], family:c.family||'', notes, labs, labDate:labDate||(panel?panel.date:''), labStatus:panel?panel.status:'', reminders, activity:c.activity||[] };
}
function chPanel(title, body, tools, tone){
  return '<section class="neo ch-panel'+(tone?' '+tone:'')+'"><header class="ch-h"><h3>'+title+'</h3>'+(tools?'<div class="ch-tools">'+tools+'</div>':'')+'</header><div class="ch-b">'+body+'</div></section>';
}
const chEmpty = t => '<p class="ch-empty">'+t+'</p>';
const chTool = (action, label, ic, extra) => '<button class="ch-tool" data-action="'+action+'" aria-label="'+esc(label)+'" title="'+esc(label)+'"'+(extra||'')+'>'+icon(ic,15)+'</button>';
const chJane = what => chTool('integration','Edit in Jane','plus',' data-what="'+esc(what)+'"');
const chList = (rows, mark) => '<ul class="ch-list">'+rows.map(r => '<li>'+mark(r)+'<div class="grow"><div>'+esc(r[0])+'</div>'+(r[1]?'<div class="tiny">'+esc(r[1])+'</div>':'')+'</div></li>').join('')+'</ul>';
const chDl = rows => '<dl class="ch-dl">'+rows.map(r => '<div><dt>'+esc(r[0])+'</dt><dd>'+esc(r[1])+(r[2]?'<span class="tiny">'+esc(r[2])+'</span>':'')+'</dd></div>').join('')+'</dl>';
function chartAccess(u, pid){
  const raw = patient(pid);
  if(!raw) return null;
  if(!(can(u,'patients.assigned') && can(u,'clinical.view') && careTeam(raw).includes(u.id))){ audit(u,'Request denied','Client chart',false,{ pid, info:'Chart' }); throw new Denied('Client chart'); }
  return raw;
}
function chartPage(u){
  const pid = S.openChart;
  const raw = pid ? chartAccess(u, pid) : null;
  if(!raw) return '<div class="neo panel"><div class="sub">Client chart</div><p class="small" style="margin-top:10px">Choose a client from <a href="#/'+u.role+'/patients">Patients</a> to open their chart.</p></div>';
  const p = projectPatient(raw, u), med = u.role==='medical', restricted = !p.clin, c = chartData(raw);
  const np = byId(raw.np), hns = byId(raw.hns), appt = APPTS.find(a => a.pid===pid);
  const allergyPill = c.allergies===undefined ? '<span class="pill p-outline">Allergies not recorded</span>' : c.allergies.length ? '<span class="pill p-burgundy">Allergy · '+esc(c.allergies.map(a => a[0]).join(', '))+'</span>' : '<span class="pill p-outline">No known allergies</span>';
  let h = '<a class="link" href="#/'+u.role+'/patients" style="display:inline-block;margin-bottom:18px">← All patients</a>';
  // banner
  h += '<div class="neo ch-banner"><div class="ch-id"><div class="avatar lg">'+raw.first[0]+raw.last[0]+'</div><div><div class="sub">'+(med?'Medical':'Holistic')+' chart · '+pid+'</div><h1 class="ch-name">'+esc(raw.first)+' <em>'+esc(raw.last)+'</em>'+(raw.pref?' <span class="ch-pref">prefers '+esc(raw.pref)+'</span>':'')+'</h1><div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px">'+pill(p.status)+allergyPill+(raw.wish?'<span class="pill p-lilac">Sharing preference on file</span>':'')+'</div></div></div>';
  h += '<dl class="ch-facts"><div><dt>Born</dt><dd>'+fmtDob(raw.dob)+' · '+ageOf(raw.dob)+' yrs</dd></div><div><dt>Health care no.</dt><dd><span class="mask">'+p.ahcMasked+'</span></dd></div><div><dt>Phone</dt><dd class="tnum">'+raw.phone+'</dd></div><div><dt>Email</dt><dd>'+esc(raw.email)+'</dd></div><div><dt>Location</dt><dd>'+esc(raw.city)+', Alberta</dd></div><div><dt>Care team</dt><dd>'+esc(np.first+' '+np.last)+', NP<br>'+esc(hns.first+' '+hns.last)+', Herbalist</dd></div><div><dt>Next visit</dt><dd>'+esc(appt?('Today · '+appt.time+' '+appt.ap+' · '+appt.type):raw.clin.next)+'</dd></div><div><dt>Client since</dt><dd>'+esc(p.since)+'</dd></div></dl>';
  h += '<div class="ch-actions"><button class="cta cta-solid cta-sm" data-action="plan-new">New '+(med?'care':'wellness')+' plan</button>'+(med?'<a class="cta cta-ghost cta-sm" href="#/medical/forms">Form Library</a><a class="cta cta-ghost cta-sm" href="#/medical/results">Lab Results</a>':'')+'<button class="cta cta-ghost cta-sm" data-action="pt-new-task" data-id="'+pid+'">New task</button><button class="cta cta-ghost cta-sm" data-action="integration" data-what="Opening this client’s chart in Jane">Open in Jane</button></div></div>';
  h += '<p class="tiny ch-note">'+icon('info',12)+' Bloom summary chart. Jane remains the official clinical record, so the health profile, allergies and medications are edited in Jane. Opening this chart was recorded in the audit history.</p>';
  if(restricted) h += '<div class="notice" style="margin-bottom:24px">'+icon('lock')+'<div><b>Some sections are restricted at the client’s request.</b> '+esc(WISHES[raw.wish]||'')+'. Ask the client directly about current medications before recommending herbs.</div></div>';

  // column 1 · who they are
  let c1 = '';
  c1 += chPanel('Health profile', restricted ? chEmpty('Restricted at the client’s request.') : (c.profile.length ? chList(c.profile, r => '<span class="ch-dot'+(r[2]==='resolved'?' res':'')+'"></span>') : chEmpty('Held in Jane. Not stored in this portal.'))+(c.family?'<p class="tiny ch-foot"><b>Family history</b> · '+esc(c.family)+'</p>':''), restricted?'':chJane('Editing the health profile in Jane'));
  c1 += chPanel('Allergies & intolerances', c.allergies===undefined ? chEmpty('Held in Jane.') : c.allergies.length ? chList(c.allergies, () => '<span class="ch-dot alert"></span>') : chEmpty('Allergy information is held in Jane.'), chJane('Editing allergies in Jane'));
  c1 += chPanel('Medications & supplements', restricted ? chEmpty('Restricted at the client’s request.') : c.meds.length ? chList(c.meds, r => '<span class="ch-tag">'+(r[2]==='S'?'Supp':'Rx')+'</span>') : chEmpty('Medications are held in Jane.'), restricted?'':chJane('Editing medications in Jane'));
  c1 += chPanel('Herbal products', c.herbs.length ? chList(c.herbs, () => '<span class="ch-tag herb">Herb</span>')+'<p class="tiny ch-foot">Check interactions with current medications before adding or changing a herb.</p>' : chEmpty('No herbal products recorded.'), med?'':chTool('plan-new','New wellness plan','plus'));
  c1 += chPanel('Lifestyle', c.social.length ? chDl(c.social) : chEmpty('Nothing recorded yet.'));

  // column 2 · what's happening
  let c2 = '';
  const alerts = [];
  if(raw.wish) alerts.push(['lilac','Sharing preference', WISHES[raw.wish]+'.']);
  if(c.allergies && c.allergies.length) alerts.push(['burgundy','Allergy', c.allergies.map(a => a[0]+' ('+a[1].toLowerCase()+')').join(', ')+'.']);
  if(p.status==='New') alerts.push(['emerald','New client', 'Joined recently. Check intake forms are complete.']);
  if(!raw.jane) alerts.push(['gold','Jane', 'Not linked to a Jane chart yet. Admin will link it.']);
  c2 += chPanel('Notices & alerts', alerts.length ? '<ul class="ch-alerts">'+alerts.map(a => '<li class="al-'+a[0]+'"><b>'+esc(a[1])+'</b> '+esc(a[2])+'</li>').join('')+'</ul>' : chEmpty('No alerts.'));
  const notes = c.notes.filter(n => !(restricted && n[4]==='clinical'));
  c2 += chPanel('Visit notes & care plans', notes.length ? '<div class="ch-scroll"><table class="ch-table"><tbody>'+notes.map(n => { const x = n[5] && allPlans().find(y => y.id===n[5]); const open = x && canOpenPlan(u, x); const author = byId(n[2]); return '<tr><td class="tnum m nowrap">'+esc(n[0])+'</td><td>'+esc(n[1])+'<div class="tiny ch-by">'+esc(author?author.first+' '+author.last:'')+' '+pill(n[3])+'</div></td><td class="w-min">'+(open?'<button class="ch-tool" data-action="plan-open" data-id="'+n[5]+'" aria-label="Open plan" title="Open plan">'+icon('arrow',14)+'</button>':(n[5]==='CP-1'&&n[3]==='Published'?'<button class="ch-tool" data-action="preview-plan" aria-label="See the client’s view" title="See the client’s view">'+icon('eye',14)+'</button>':''))+'</td></tr>'; }).join('')+'</tbody></table></div>' : chEmpty('No visit notes in Bloom yet.'), chTool('plan-new','New plan','plus'));
  c2 += chPanel('Tasks for this client', '<div id="pt-tasks">'+patientTasksHTML(u,pid,'')+'</div>', chTool('pt-new-task','New task','plus',' data-id="'+pid+'"'));
  c2 += chPanel('Client portal activity', c.activity.length ? chList(c.activity, () => '<span class="ch-dot res"></span>') : chEmpty('No recent portal activity.'));

  // column 3 · results & paperwork
  let c3 = '';
  c3 += chPanel('Reminders', chList(c.reminders, () => '<span class="ch-dot gold"></span>'), chTool('pt-new-task','New reminder','plus',' data-id="'+pid+'"'));
  let labBody;
  if(restricted) labBody = chEmpty('Shared with Medical Practitioners only, at the client’s request.');
  else if(!med && c.labStatus && c.labStatus!=='Published') labBody = chEmpty('Results appear here once '+esc(np.first)+' publishes them.');
  else labBody = c.labs.length ? '<div class="ch-scroll"><table class="ch-table labs"><thead><tr><th>Marker</th><th>Result</th><th>Prev</th><th>Range</th></tr></thead><tbody>'+c.labs.map(l => '<tr'+(l[5]!=='In range'?' class="flag"':'')+'><td>'+esc(l[0])+'</td><td class="tnum nowrap"><b>'+esc(l[1])+'</b> <span class="tiny">'+esc(l[2])+'</span></td><td class="tnum m">'+esc(l[4]||'—')+'</td><td class="tiny tnum nowrap">'+esc(l[3])+'</td></tr>').join('')+'</tbody></table></div>'+(med&&c.labStatus&&c.labStatus!=='Published'?'<p class="tiny ch-foot">'+pill(c.labStatus)+' &nbsp;Not yet shared with the client.</p>':'') : chEmpty('Results are held in Jane and are not copied here.');
  c3 += chPanel('Labs'+(c.labDate&&!restricted&&c.labs.length&&(med||c.labStatus==='Published')?' <span class="ch-when">collected '+esc(c.labDate)+'</span>':''), labBody, med?'<a class="ch-tool" href="#/medical/results" aria-label="Open Lab Results" title="Open Lab Results">'+icon('arrow',15)+'</a>':'');
  if(med){
    const reqs = S.reqs.filter(r => r.pid===pid), discl = S.disclosures.filter(d => d.pid===pid);
    c3 += chPanel('Requisitions & referrals', (reqs.length||discl.length) ? '<ul class="ch-list">'+reqs.map(r => '<li><span class="ch-tag">Lab</span><div class="grow"><div>Requisition '+r.id+'</div><div class="tiny">'+esc(r.updated)+'</div></div>'+pill(r.status)+'</li>').join('')+discl.map(d => '<li><span class="ch-tag">Sent</span><div class="grow"><div>'+esc(d.what)+'</div><div class="tiny">To '+esc(d.to)+' · '+new Date(d.t).toLocaleDateString('en-CA',{day:'numeric',month:'short'})+'</div></div></li>').join('')+'</ul>' : chEmpty('None yet.'), '<a class="ch-tool" href="#/medical/forms" aria-label="Form Library" title="Form Library">'+icon('plus',15)+'</a>');
  }
  const deliv = DELIVERIES.filter(d => d.pid===pid && (med || d.info!=='Lab requisition'));
  c3 += chPanel('Documents', deliv.length ? '<ul class="ch-list">'+deliv.map(d => '<li><span class="ch-tag">Doc</span><div class="grow"><div>'+esc(d.doc)+'</div><div class="tiny">'+esc(d.method)+' · to '+esc(d.to)+'</div></div>'+pill(S.deliv[d.id]||d.status)+'</li>').join('')+'</ul>' : chEmpty('No documents yet.'));
  c3 += chPanel('Vitals', restricted ? chEmpty('Restricted at the client’s request.') : c.vitals.length ? chDl(c.vitals)+'<p class="tiny ch-foot">Virtual visits rely on patient-reported values.</p>' : chEmpty('Vitals are held in Jane.'));

  h += '<div class="ch-grid"><div class="ch-col">'+c1+'</div><div class="ch-col">'+c2+'</div><div class="ch-col">'+c3+'</div></div>';
  return h;
}
function openChart(u, pid){
  try { chartAccess(u, pid); } catch(e){ toast('You do not have access to that chart. The attempt was recorded.'); return; }
  S.openChart = pid; save();
  audit(u,'Opened client chart','Client chart',true,{ pid, info: projectPatient(patient(pid),u).clin ? 'Demographics, clinical summary, results' : 'Demographics, wellness notes' });
  closeLayer();
  const h = '#/'+u.role+'/chart';
  if(location.hash===h) render(); else location.hash = h;
}

/* denied */
function deniedPage(u, hash, reason){
  return '<div class="neo denied"><div class="seal">'+icon('lock',34)+'</div><div class="eyebrow">Access restricted</div><h1 style="margin-top:14px">This area is not part of your portal</h1><p class="small" style="margin-top:14px">'+esc(reason)+'</p><p class="tiny" style="margin-top:10px">Requested <code>'+esc(hash)+'</code> as '+esc(fullName(u))+' ('+ROLE_LABEL[u.role]+'). The attempt was recorded in the audit history.</p><a class="cta cta-solid" href="'+home(u)+'" style="margin-top:26px">Back to your overview</a></div>';
}

/* ---------- auth screens ---------- */
function enrollScreen(){
  return '<div class="auth"><div class="auth-art" role="img" aria-label="Lilac petals"><div class="cap"><div class="t">A second step, for privacy</div><div class="s">Required for staff</div></div></div><div class="neo auth-card"><a class="brand logo-link" href="#/signin"><img class="bloom-mark" src="/assets/logo/bloom-logo-animated-hover-dark.svg" alt="Bloom Integrative Health"></a><div class="eyebrow" style="margin-top:26px">Set up MFA</div><h1>Scan this <em>code.</em></h1><p class="small" style="margin-top:10px">Staff must use an authenticator app before the portal opens. Clients are not asked to do this here.</p>'+(auth.qr?'<img alt="Authenticator QR code" src="'+esc(auth.qr)+'" style="width:180px;height:180px;margin-top:12px">':'')+(auth.err?'<div class="err" role="alert">'+esc(auth.err)+'</div>':'')+'<form class="form" data-form="enroll"><div class="field"><label for="enroll-code">Six-digit code</label><input class="input" id="enroll-code" inputmode="numeric" autocomplete="one-time-code" required></div><button class="cta cta-solid" type="submit">Enable and continue</button></form></div></div>';
}
function loginScreen(){
    return '<div class="auth"><div class="auth-art" role="img" aria-label="Lilac petals"><div class="cap"><div class="t">Where health takes root</div><div class="s">Bloom · Staff portal</div></div></div><div class="neo auth-card"><a class="brand logo-link" href="#/signin"><img class="bloom-mark" src="/assets/logo/bloom-logo-animated-hover-dark.svg" alt="Bloom Integrative Health"></a><div class="eyebrow" style="margin-top:26px">Staff portal</div><h1>Welcome <em>back.</em></h1><p class="small" style="margin-top:10px">One sign-in for owners, admins and practitioners. You will be taken to the portal your role allows.</p>'+
    '<form class="form" data-form="login">'+(auth.err?'<div class="err" role="alert">'+esc(auth.err)+'</div>':'')+'<div class="field"><label for="li-email">Work email</label><input class="input" id="li-email" type="email" autocomplete="username" value="'+esc(auth.email)+'" placeholder="name@bloom.example" required></div><div class="field"><label for="li-pass">Password</label><input class="input" id="li-pass" type="password" autocomplete="current-password" placeholder="Your password" required></div><button class="cta cta-solid" type="submit" style="margin-top:6px">Continue '+icon('arrow',14)+'</button><p class="tiny">For authorized Bloom staff only. Every sign-in and record you open is recorded and audited under Alberta’s Health Information Act.</p></form>'+
    '<p class="tiny" style="margin-top:14px"><a class="link" href="/auth/reset.html">Forgot password?</a></p><div class="auth-foot"><a class="link" href="#/blueprint">Phase 1 blueprint</a><span class="tiny" style="align-self:center">Secure session · signs out after '+S.timeout+' minutes idle</span></div></div></div>';
}
function startSession(u){
    tasksUI = { view:'me', urg:'all', q:'', scope:'mine' }; taskBack = '';
    session = { uid:u.id, started:Date.now(), last:Date.now() }; warned = false;
    SESS[u.id] = { start:session.started, last:session.last, area:PORTAL_LABEL[u.role], device:'This browser', sim:false };
    u.seen = 'Just now'; audit(u,'Signed in',PORTAL_LABEL[u.role]+' · MFA verified',true); save();
    auth = { step:'login', email:'', err:'' }; startIdle();
    const want = location.hash.match(/^#\/(\w+)\/([\w-]+)$/);
    go(want && want[1]===u.role ? location.hash : home(u));
    const un = unreadFor(u), ur = un.filter(n => n.urg==='urgent').length;
    if(un.length) setTimeout(() => toast('You have '+un.length+' new task'+(un.length>1?'s or notes':' or note')+(ur?', '+ur+' urgent':'')+'. Open Tasks to see '+(un.length>1?'them':'it')+'.'), 600);
}
function pledgeScreen(){
  const u = byId(auth.pending);
  const pts = ['I will access patient information only when I need it for my job, and only the least amount needed.','I will not share, copy or discuss patient information outside approved Bloom systems and care team conversations.','I will report any loss, mistake or suspected breach right away using “Report a privacy concern”.','I understand that my sign-ins, the pages I use and the records I open are recorded, audited and visible to the clinic owner and Privacy Officer.','I understand that breaking this agreement can lead to discipline, loss of access and fines under the Health Information Act.'];
  return '<div class="auth"><div class="auth-art" role="img" aria-label="Lilac petals"><div class="cap"><div class="t">Privacy is part of care</div><div class="s">Annual confidentiality agreement</div></div></div><div class="neo auth-card"><a class="brand logo-link" href="#/signin"><img class="bloom-mark" src="/assets/logo/bloom-logo-animated-hover-dark.svg" alt="Bloom Integrative Health"></a><div class="eyebrow" style="margin-top:26px">Before you continue</div><h1>Confidentiality <em>agreement.</em></h1><p class="small" style="margin-top:10px">'+esc(u.first)+', your yearly agreement is due. Please read and confirm it to open the portal.</p><form class="form" data-form="pledge">'+(auth.err?'<div class="err" role="alert">'+esc(auth.err)+'</div>':'')+'<ol class="plan" style="font-size:0.9rem">'+pts.map(x => '<li>'+x+'</li>').join('')+'</ol><label class="row" style="gap:12px;cursor:pointer;font-size:0.9rem"><input type="checkbox" class="check" id="pl-ok"> I have read and agree to the Bloom confidentiality agreement.</label><button class="cta cta-solid" type="submit">Agree and continue</button></form><div class="auth-foot"><button class="link" data-action="back-login">Cancel and sign out</button></div></div></div>';
}
function mfaScreen(){
  const email = auth.email || '';
  return '<div class="auth"><div class="auth-art" role="img" aria-label="Lilac petals"><div class="cap"><div class="t">A second step, for privacy</div><div class="s">Multifactor verification</div></div></div><div class="neo auth-card"><a class="brand logo-link" href="#/signin"><img class="bloom-mark" src="/assets/logo/bloom-logo-animated-hover-dark.svg" alt="Bloom Integrative Health"></a><div class="eyebrow" style="margin-top:26px">Verify it’s you</div><h1>Enter your <em>code.</em></h1><p class="small" style="margin-top:10px">Open your authenticator and enter the six-digit code for '+esc(email)+'.</p><form class="form" data-form="mfa">'+(auth.err?'<div class="err" role="alert">'+esc(auth.err)+'</div>':'')+'<fieldset style="border:none"><legend class="lbl" style="margin-bottom:10px">Six-digit code</legend><div class="code-row">'+[0,1,2,3,4,5].map(i => '<input class="input" inputmode="numeric" maxlength="1" aria-label="Digit '+(i+1)+'" id="mfa-'+i+'" data-mfa="'+i+'"'+(i===0?' autocomplete="one-time-code"':'')+'>').join('')+'</div></fieldset><button class="cta cta-solid" type="submit">Verify and continue</button></form><div class="auth-foot"><button class="link" data-action="back-login">Use a different account</button></div></div></div>';
}

/* blueprint */
function blueprintScreen(){
  const roles = ['owner','admin','holistic','medical'];
  const mark = (r,p) => ROLE_SCOPE[r].includes(p) ? '<span class="yes">'+(PERMISSIONS[p].np?'NP only':PERMISSIONS[p].clinical?'Credentialed':'Default')+'</span>' : '<span class="no">—</span>';
  let h = '<div class="bp"><div class="bp-top"><a class="brand logo-link" href="#/signin"><img class="bloom-mark" src="/assets/logo/bloom-logo-animated-hover-dark.svg" alt="Bloom Integrative Health"></a><a class="cta cta-ghost" href="'+(session?home(me()):'#/signin')+'">'+(session?'Back to portal':'Go to staff sign-in')+'</a></div><div class="eyebrow">Staff portal · Phase 1 foundation</div><h1 style="margin-top:18px">Master <em>blueprint</em></h1><p class="lede">Architecture, roles, permissions and the items that need legal, privacy or clinical sign-off before production. The prototype runs on the same permission model described here.</p>';
  h += '<section><span class="num">i — Architecture</span><h2>How the pieces connect</h2><div class="arch">'+
    '<div class="arch-lane">Staff access</div><div class="box"><h4>Staff portal</h4><p>One app, four role shells. Navigation is built from the user’s effective permissions.</p></div><div class="box"><h4>Identity</h4><p>Single staff sign-in, mandatory MFA, yearly confidentiality agreement, idle expiry, live session view and remote sign-out.</p></div><div class="box"><h4>API + policy</h4><p>Every request checks role, per-user permission and care relationship. Hidden buttons are never the control.</p></div><div class="box"><h4>Audit service</h4><p>Append-only log of sign-ins, record views, changes and denials, plus the s. 41 disclosure log. Kept 10 years.</p></div>'+
    '<div class="arrow-row"><span>↓</span><span>↓</span></div>'+
    '<div class="arch-lane">Data</div><div class="box"><h4>Staff database</h4><p>Canadian region. Encrypted at rest and in transit. Row-level security by patient care team.</p></div><div class="box"><h4>Document store</h4><p>Templates and generated PDFs, versioned. Signed URLs, short expiry.</p></div><div class="box pub"><h4>Published layer</h4><p>Only Published results, care plans and resources. Drafts cannot be queried from here.</p></div><div class="box pub"><h4>Client portal</h4><p>Unchanged interface. Reads the published layer by shared patient ID, never by name.</p></div>'+
    '<div class="arch-lane">Outside Bloom</div><div class="box ext"><h4>Jane</h4><p>Primary clinical chart. Manual upload for now; API feasibility in Phase 6.</p></div><div class="box ext"><h4>Secure fax</h4><p>Not connected. Approved system used by hand.</p></div><div class="box ext"><h4>Secure email</h4><p>Not connected. Delivery recorded manually.</p></div><div class="box ext"><h4>Accounting</h4><p>Not connected. Financial reports stay empty until it is.</p></div></div></section>';
  h += '<section><span class="num">ii — Roles</span><h2>Navigation by portal</h2><div class="grid g4">'+roles.map(r => '<div class="neo panel"><div class="sub">'+PORTAL_LABEL[r]+'</div><ul class="list" style="margin-top:12px">'+ROUTES[r].filter(x => !x.hidden).map(x => '<li style="padding:10px 0;justify-content:flex-start"><span style="color:var(--burgundy)">'+icon(x.icon,16)+'</span><span class="small" style="color:var(--ink)">'+x.label+'</span><span class="tiny" style="margin-left:auto">'+(x.perm?x.perm:'always')+'</span></li>').join('')+'</ul></div>').join('')+'</div></section>';
  h += '<section><span class="num">iii — Permissions</span><h2>Permission matrix</h2><div class="neo panel"><div class="tbl-wrap"><table class="matrix" style="min-width:880px"><thead><tr><th>Permission</th><th>Key</th><th>Owner</th><th>Administration</th><th>Holistic</th><th>Medical</th></tr></thead><tbody>'+Object.keys(PERMISSIONS).map(p => '<tr><td>'+PERMISSIONS[p].label+'</td><td class="m">'+p+'</td>'+roles.map(r => '<td>'+mark(r,p)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div><p class="tiny" style="margin-top:16px">Owners can switch any of these off for an individual within their role. “Credentialed” needs verified clinical credentials; “NP only” needs a verified Nurse Practitioner registration, so only Medical Practitioners hold them.</p></div></section>';
  h += '<section><span class="num">iv — Security</span><h2>Controls in this prototype</h2><div class="grid g2"><div class="neo panel"><div class="sub">Working now</div><ul class="list" style="margin-top:12px">'+['Unique sign-in for every staff member, MFA required','Role routing after sign-in, guards on every route including typed addresses','Permission checks inside data functions, not just the menu','Care-relationship filter on practitioner patient lists','Health care numbers masked; reveal requires a reason and is logged','Idle sign-out with a one-minute warning','Owner view of who is signed in, with the ability to end a session','Any staff member can report a privacy concern; it names the custodian to notify','Audit history with the fields Alberta’s logging standard requires, plus a patient activity report','Disclosure log for requisitions, referrals and faxes (HIA s. 41)','Owner portal limited to the least information needed (HIA s. 58)','Patient disclosure wishes recorded and enforced (HIA s. 58(2))','Yearly confidentiality agreement before portal access','Privacy notice on the sign-in screen; failed sign-ins logged'].map(x => '<li style="padding:11px 0"><span class="small" style="color:var(--ink)">'+x+'</span>'+icon('check',16)+'</li>').join('')+'</ul></div><div class="neo panel deep"><div class="sub">Required for production</div><ul class="list" style="margin-top:12px">'+['Server-side enforcement and database row-level security','Real identity provider with authenticator apps or security keys','TLS for all traffic; encryption at rest; Canadian hosting','Firewall, malware protection and intrusion detection, monitored','Encrypted backups with tested recovery and a continuity-of-care plan','Append-only audit storage kept 10 years','Secure disposal of devices and storage','Independent penetration test before launch','Account lockout after repeated failed sign-ins','Security patches applied promptly; daily off-site backups','Prototype browser storage replaced entirely'].map(x => '<li style="padding:11px 0"><span class="small" style="color:var(--ink)">'+x+'</span></li>').join('')+'</ul></div></div></section>';
  h += '<section><span class="num">v — Compliance</span><h2>What applies to a private Calgary clinic</h2><p class="small" style="max-width:720px;margin:-8px 0 22px">Working outside AHS does not remove these duties. They follow the health information and the professionals who hold it. This is a summary for planning, not legal advice; have a privacy lawyer or consultant review the PIA.</p><ul class="flag-list">'+[
    ['Health Information Act (Alberta)','Applies. Nurse Practitioners are custodians as regulated CRNA members, in private practice too. Everyone else, including vendors, is an affiliate. Requires a PIA to the OIPC before go-live, reasonable safeguards, written agreements with information managers, and notice to the OIPC, Minister and patient after a breach with risk of harm. Offences carry fines up to $50,000.','Provincial law'],
    ['HIA amendments (Bill 11, 2025)','In force June 22 and July 2, 2026. Adds rules for shared custody and for using health information in automated systems, including AI. Information managers can now submit their own security policies to the OIPC.','Provincial law'],
    ['CRNA privacy standards','Binding on NPs. Unique user IDs, role-based access, passwords, secure transmission, malware and intrusion protection, secure backups, tested recovery, a continuity-of-care plan, secure disposal, audit logs, and records kept 10 years after last service.','Professional standard'],
    ['Alberta logging and auditing standard','Sets the audit fields this portal records and a 10-year retention period for access logs.','Provincial standard'],
    ['PIPA (Alberta)','Covers personal information outside the HIA: wellness-only clients, marketing lists, retreat bookings, payments and staff records. Patients must be told if a service provider outside Canada handles their information.','Provincial law'],
    ['Health Canada: medical devices','Health Canada excludes electronic patient records and administrative software from its software-as-a-medical-device rules. The portal stays outside them if it only displays lab values and ranges and never analyzes results or recommends care. Daisy must stay general wellness.','Federal'],
    ['Health Canada: natural health products','Not a portal rule, but herbal products Bloom recommends or sells should carry an NPN, and claims must match the product licence.','Federal'],
    ['CASL and PIPEDA','Marketing emails need consent under CASL. PIPEDA can apply when personal information crosses provincial or national borders, for example with a US-based vendor.','Federal'],
    ['Alberta Netcare','Not used. If Bloom later gets Netcare access, the Alberta EHR Regulation adds its own rules.','Optional'],
  ].map(f => '<li><b>'+f[0]+'</b>'+f[1]+'<div class="tiny" style="margin-top:8px;color:var(--burgundy);letter-spacing:0.14em;text-transform:uppercase">'+f[2]+'</div></li>').join('')+'</ul></section>';
  h += '<section><span class="num">vi — Decisions</span><h2>To confirm before production</h2><ul class="flag-list">'+[
    ['Owner access to clinical records','The owner portal shows no clinical records. Confirm whether any lawful, need-to-know exception exists.','Legal / privacy'],
    ['Standing orders for requisitions','Confirm whether the standard initial panel can run under a standing order or needs NP authorization each time.','Clinical'],
    ['Holistic Practitioner access to results','Confirm what clinical information Holistic Practitioners may view under consent and scope.','Clinical / privacy'],
    ['Jane integration','Confirm API capabilities, permitted data and Jane’s terms before any automated sync.','Technical / vendor'],
    ['Secure delivery methods','Approve which email, fax and portal methods may carry requisitions and results.','Privacy'],
    ['Generated PDFs and drafts','Set how long draft requisitions and generated PDFs stay in Bloom once they are in Jane.','Legal'],
    ['Daisy suggestion in the client portal','Daisy no longer offers to explain a laboratory result. Lab questions are directed to the care team, and results stay in Jane. Remove it or send it to the care team instead.','Clinical / regulatory'],
    ['Daisy wellness coach','Daisy uses AI. Confirm it never reads health information, tell patients how it works, offer an opt-out, and make sure the vendor does not train on patient data. Cover it in the PIA.','Clinical / privacy']
  ].map(f => '<li><b>'+f[0]+'</b>'+f[1]+'<div class="tiny" style="margin-top:8px;color:var(--burgundy);letter-spacing:0.14em;text-transform:uppercase">'+f[2]+'</div></li>').join('')+'</ul></section>';
  h += '<section><span class="num">vii — Roadmap</span><h2>Build phases</h2><div class="phases">'+[['Phase 1','Foundation, login, roles, shells, navigation',1],['Phase 2','Owner dashboard, staff and settings'],['Phase 3','Directory, demographics, requisitions, tasks'],['Phase 4','Form library, auto-fill, real PDF output'],['Phase 5','Results and care plan publishing'],['Phase 6','Jane, delivery, security testing, launch']].map(x => '<div class="'+(x[2]?'now':'')+'"><b>'+x[0]+'</b>'+x[1]+'</div>').join('')+'</div></section>';
  h += '<section><span class="num">viii — Code</span><h2>How the prototype is organized</h2><div class="neo panel"><p class="small" style="max-width:720px">One self-contained file, written as separate modules that map to production code: icons, permission model, fictional seed data, prototype store, API with permission checks, audit, session, router and guards, shared components, and one page module per portal. The permission model is the single source of truth for menus, route guards and data access.</p></div></section></div>';
  return h;
}

/* ---------- app shell ---------- */
function shell(u, hash, inner, activeId){
  const nav = navFor(u).map(r => { const c = r.count ? r.count() : 0; return '<a href="#/'+u.role+'/'+r.id+'" class="'+(r.id===activeId?'active':'')+'"'+(r.id===activeId?' aria-current="page"':'')+'>'+icon(r.icon)+'<span>'+r.label+'</span>'+(c?'<span class="count">'+c+'</span>':'')+'</a>'; }).join('');
  const sub = u.cred && u.cred.type==='NP' ? 'Nurse Practitioner' : u.title;
  return '<div class="ribbon"><span><b>Testing</b> &nbsp;Fictional data · '+esc(fullName(u))+' · '+ROLE_LABEL[u.role]+'<span id="live-pill"></span></span><span class="acts"><button data-action="test-access">Test access control</button><button data-action="switch-user">Switch user</button><button data-action="nav-blueprint">Blueprint</button></span></div>'+
  '<div class="shell"><aside class="side" id="side"><div><a class="brand logo-link" href="'+home(u)+'"><img class="bloom-mark" src="/assets/logo/bloom-logo-animated-hover-dark.svg" alt="Bloom Integrative Health"></a><div class="sub portal-tag">'+PORTAL_LABEL[u.role]+'</div></div><nav class="nav" aria-label="'+PORTAL_LABEL[u.role]+'">'+nav+'</nav><div class="side-foot"><div class="pressed who"><div class="avatar">'+initials(u)+'</div><div style="min-width:0"><div class="n">'+esc(fullName(u))+'</div><div class="r">'+esc(sub)+'</div></div></div><button class="link" data-action="report-privacy" style="align-self:center">Report a privacy concern</button><button class="cta cta-ghost cta-sm" data-action="signout">'+icon('logout',14)+' Sign out</button></div></aside>'+
  '<div class="main"><div class="topbar"><button class="icon-btn menu-btn" data-action="menu" aria-label="Open menu">'+icon('menu')+'</button><div class="search">'+icon('search',16)+'<label class="sr" for="g-search">Search patients</label><input class="input" id="g-search" autocomplete="off" placeholder="'+(isPrac(u)?'Search your patients':'Search patients by name, email or ID')+'"'+(can(u,'patients.directory')||can(u,'patients.assigned')?'':' disabled')+'><div id="g-results"></div></div><div class="right">'+topStatus()+'<a class="icon-btn tb-inbox" href="#/'+u.role+'/tasks" data-action="inbox" aria-label="Inbox'+(unreadFor(u).length?', '+unreadFor(u).length+' unread':'')+'" title="Inbox">'+icon('inbox',19)+(unreadFor(u).length?'<span class="tb-badge tnum">'+unreadFor(u).length+'</span>':'')+'</a><div class="avatar" aria-hidden="true">'+initials(u)+'</div></div></div><main class="content" id="content">'+inner+'</main></div></div>';
}

/* ---------- render ---------- */
function render(){
  const app = document.getElementById('app');
  const hash = location.hash || '';
  if(hash==='#/blueprint'){ app.innerHTML = blueprintScreen(); window.scrollTo(0,0); return; }
  if(!session){
    app.innerHTML = auth.step==='mfa' ? mfaScreen() : auth.step==='enroll' ? enrollScreen() : auth.step==='pledge' ? pledgeScreen() : loginScreen();
    const f = document.getElementById(auth.step==='mfa'?'mfa-0':(auth.email?'li-pass':'li-email')); if(f) f.focus({ preventScroll:true });
    return;
  }
  const u = me();
  if(!u || u.status!=='active'){ signOut('Your account is no longer active'); return; }
  const m = hash.match(/^#\/(\w+)\/([\w-]+)$/);
  if(!m){ location.replace(home(u)); return; }
  const g = guard(u, m[1], m[2]);
  if(SESS[u.id]) SESS[u.id].area = g.ok ? PORTAL_LABEL[u.role]+' · '+g.route.label : 'Access restricted page';
  if(SESS[u.id] && SESS[u.id].area !== LIVE.lastArea){ LIVE.lastArea = SESS[u.id].area; livePresence(true); }
  let inner, active = null;
  if(!g.ok){ audit(u,'Access denied',hash+' · '+g.reason,false); inner = deniedPage(u, hash, g.reason); }
  else {
    active = g.route.parent || g.route.id;
    try { inner = g.route.render(u); } catch(e){ if(e instanceof Denied) inner = deniedPage(u, hash, 'The server refused this request.'); else throw e; }
  }
  app.innerHTML = shell(u, hash, inner, active);
  liveBadge();
  window.scrollTo(0,0);
}

/* new care plan: type-to-search patient picker */
let pnUI = { i:-1, list:[] };
function pnMatches(q){
  const u = me(), words = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return PATIENTS.filter(p => careTeam(p).includes(u.id))
    .filter(p => { const hay = (p.first+' '+p.last+' '+(p.pref||'')+' '+p.id).toLowerCase(); return words.every(w => hay.includes(w)); })
    .sort((a,b) => (a.last+a.first).localeCompare(b.last+b.first));
}
function pnMark(text, q){
  let out = esc(text); const words = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  words.forEach(w => { const k = out.toLowerCase().indexOf(esc(w)); if(k>=0 && !out.slice(0,k).includes('<')) out = out.slice(0,k)+'<b>'+out.slice(k,k+esc(w).length)+'</b>'+out.slice(k+esc(w).length); });
  return out;
}
function pnShow(){
  const q = document.getElementById('pn-q'), box = document.getElementById('pn-list'); if(!q || !box) return;
  pnUI.list = pnMatches(q.value);
  if(pnUI.i >= pnUI.list.length) pnUI.i = pnUI.list.length-1;
  box.innerHTML = pnUI.list.length ? pnUI.list.map((p,k) => '<button type="button" class="sr-item'+(k===pnUI.i?' on':'')+'" data-pnpick="'+p.id+'" role="option" id="pn-o'+k+'" aria-selected="'+(k===pnUI.i)+'"><div class="avatar" style="width:36px;height:36px;font-size:0.9rem">'+p.first[0]+p.last[0]+'</div><div><div class="n">'+pnMark(p.first+' '+p.last, q.value)+(p.pref?' <span class="m">(prefers '+esc(p.pref)+')</span>':'')+'</div><div class="m">Born '+fmtDob(p.dob)+' · '+pnMark(p.id, q.value)+' · '+esc(p.city)+'</div></div></button>').join('') : '<div class="small" style="padding:12px 14px">No patients in your care match “'+esc(q.value.trim())+'”.</div>';
  box.hidden = false; q.setAttribute('aria-expanded','true');
  if(pnUI.i>=0){ q.setAttribute('aria-activedescendant','pn-o'+pnUI.i); const o = document.getElementById('pn-o'+pnUI.i); if(o) o.scrollIntoView({ block:'nearest' }); } else q.removeAttribute('aria-activedescendant');
}
function pnHide(){ const box = document.getElementById('pn-list'), q = document.getElementById('pn-q'); if(box) box.hidden = true; if(q) q.setAttribute('aria-expanded','false'); pnUI.i = -1; }
function pnPick(id){
  const p = patient(id), q = document.getElementById('pn-q'); if(!p || !q) return;
  q.value = p.first+' '+p.last; document.getElementById('pn-p').value = id; pnHide();
  document.getElementById('pn-sel').innerHTML = '<div class="pressed pn-card"><div class="avatar" style="width:40px;height:40px;font-size:1rem">'+p.first[0]+p.last[0]+'</div><div class="grow"><div class="n">'+esc(p.first+' '+p.last)+(p.pref?' <span class="tiny">(prefers '+esc(p.pref)+')</span>':'')+'</div><div class="tiny">Born '+fmtDob(p.dob)+' · '+p.id+' · '+esc(p.city)+'</div></div><span class="pill p-emerald">Selected</span></div>';
}
document.addEventListener('input', e => {
  if(e.target.id!=='pn-q') return;
  document.getElementById('pn-p').value = ''; document.getElementById('pn-sel').innerHTML = '<p class="tiny">Only patients in your care appear.</p>';
  pnUI.i = e.target.value.trim() ? 0 : -1; pnShow();
});
document.addEventListener('focusin', e => { if(e.target.id==='pn-q' && !document.getElementById('pn-p').value) pnShow(); });
document.addEventListener('keydown', e => {
  if(e.target.id!=='pn-q') return;
  const box = document.getElementById('pn-list'), open = box && !box.hidden;
  if(e.key==='ArrowDown'){ e.preventDefault(); if(!open){ pnShow(); } pnUI.i = Math.min(pnUI.i+1, pnUI.list.length-1); pnShow(); }
  else if(e.key==='ArrowUp'){ e.preventDefault(); pnUI.i = Math.max(pnUI.i-1, 0); pnShow(); }
  else if(e.key==='Enter'){ if(open && pnUI.list.length){ e.preventDefault(); pnPick(pnUI.list[Math.max(pnUI.i,0)].id); } else if(!document.getElementById('pn-p').value){ e.preventDefault(); } }
  else if(e.key==='Escape' && open){ e.preventDefault(); e.stopPropagation(); pnHide(); }
}, true);
document.addEventListener('click', e => {
  const o = e.target.closest('[data-pnpick]'); if(o){ pnPick(o.dataset.pnpick); return; }
  if(document.getElementById('pn-list') && !e.target.closest('.pn-search')) pnHide();
});

/* ---------- events ---------- */
const ACT = {
  'fill-form': el => { if(window.BloomForms) BloomForms.open(el.dataset.name, el.dataset.num); },
    'back-login': () => { auth = { step:'login', email:'', err:'' }; render(); },
  'signout': () => signOut('Manual sign-out'),
  'switch-user': () => signOut('Manual sign-out'),
  'nav-blueprint': () => { location.hash = '#/blueprint'; },
  'menu': () => document.getElementById('side').classList.toggle('open'),
  'close': () => closeLayer(),
  'close-outside': (el, e) => { if(e.target===el) closeLayer(); },
  'close-nav': () => closeLayer(),
  'confirm-yes': () => { const f = pendingConfirm; pendingConfirm = null; closeLayer(); if(f) f(); },
  'test-access': () => { const u = me(); const t = { owner:'#/medical/results', admin:'#/owner/settings', holistic:'#/medical/results', medical:'#/admin/patients' }[u.role]; toast('Trying '+t+' as '+ROLE_LABEL[u.role]+'…'); location.hash = t; },
  'open-patient': el => patientDrawer(me(), el.dataset.id),
  'drawer-expand': el => expandPatient(me(), el.dataset.id),
  'drawer-collapse': el => patientDrawer(me(), el.dataset.id),
  'chart-open': el => openChart(me(), el.dataset.id),
  'reveal-ahc': el => {
    const id = el.dataset.id;
    pendingConfirm = null;
    openDialog('<div class="sub">Sensitive identifier</div><h2>Reveal health care number?</h2><p class="small" style="margin-top:10px">The full number shows for 30 seconds. Your reason is recorded in the audit history.</p><div class="field" style="margin-top:20px"><label for="rv-reason">Reason</label><select class="select" id="rv-reason"><option>Preparing a lab requisition</option><option>Verifying identity with the patient</option><option>Correcting a demographic error</option></select></div><div class="acts"><button class="cta cta-ghost" data-action="close">Cancel</button><button class="cta cta-solid" data-action="do-reveal" data-id="'+id+'">Reveal</button></div>');
  },
  'do-reveal': el => {
    const id = el.dataset.id, reason = document.getElementById('rv-reason').value;
    if(!window.sb){ toast('Sign in again to reveal a health number.'); return; }
    window.sb.rpc('reveal_phn', { p_legacy_id: id, p_reason: reason }).then(res => {
      if(res.error || !res.data){ closeLayer(); toast('Not permitted. The attempt was recorded.'); return; }
      const v = res.data;
      patientDrawer(me(), id);
      const s = document.getElementById('ahc-val');
      if(s){ s.textContent = v; setTimeout(() => { const t = document.getElementById('ahc-val'); if(t) t.textContent = '••••• '+String(v).slice(-4); }, 30000); }
    });
  },
  'jane-done': el => {
    const id = el.dataset.id, p = patient(id);
    confirmDialog({ eyebrow:'Jane', title:'Confirm the Jane update', body:'Only confirm once you have made this change in '+esc(pName(p))+'’s Jane record yourself. Bloom does not update Jane automatically.', yes:'I updated Jane', onYes:() => { S.jane[id]='matched'; audit(me(),'Confirmed manual Jane update','Jane '+p.jane,true,{ pid:id, info:'Demographics' }); save(); toast('Recorded: Jane updated by '+esc(me().first)+'.'); render(); } });
  },
  'phase': el => toast(esc(el.dataset.what)+' is built in Phase '+el.dataset.n+'. This screen previews where it will live.'),
  'integration': el => needsIntegration(el.dataset.what),
  'perms': el => permDrawer(el.dataset.id),
  'toggle-perm': el => {
    const id = el.dataset.id, p = el.dataset.perm, on = el.getAttribute('aria-checked')!=='true';
    try { api.setPerm(me(), id, p, on); toast((on?'Switched on: ':'Switched off: ')+PERMISSIONS[p].label+' for '+esc(byId(id).first)+'.'); permDrawer(id); }
    catch(e){ toast(esc(e.message)); }
  },
  'deactivate': el => { const t = byId(el.dataset.id); confirmDialog({ title:'Deactivate '+fullName(t)+'?', body:'They are signed out everywhere and lose all access immediately. Their audit history is kept.', yes:'Deactivate', onYes:() => { t.status='deactivated'; t.mfa='Removed'; t.seen='Deactivated today'; delete SESS[t.id]; audit(me(),'Deactivated staff',fullName(t)+' · all sessions ended',true); save(); toast(esc(fullName(t))+' was deactivated.'); render(); } }); },
  'reactivate': el => { const t = byId(el.dataset.id); confirmDialog({ title:'Reactivate '+fullName(t)+'?', body:'They will need to accept a new invitation and enrol MFA before signing in.', yes:'Reactivate', onYes:() => { t.status='invited'; t.mfa='Not enrolled'; t.seen='Invitation queued today'; audit(me(),'Reactivated staff',fullName(t),true); save(); toast('Reactivated. Invitation email needs a production integration.'); render(); } }); },
  'invite': () => openDialog('<div class="sub">Team</div><h2>Invite a staff member</h2><form class="form" data-form="invite"><div class="field"><label for="iv-first">First name</label><input class="input" id="iv-first" required></div><div class="field"><label for="iv-last">Last name</label><input class="input" id="iv-last" required></div><div class="field"><label for="iv-email">Work email</label><input class="input" id="iv-email" type="email" required></div><div class="field"><label for="iv-role">Role</label><select class="select" id="iv-role"><option value="admin">Administration</option><option value="holistic">Holistic Practitioner</option><option value="medical">Medical Practitioner</option><option value="owner">Owner</option></select></div><div class="field"><label for="iv-title">Title</label><input class="input" id="iv-title" placeholder="e.g. Patient Coordinator"></div><p class="tiny">Practitioners get clinical permissions only after you verify their credentials. Medical Practitioners also need a verified NP registration.</p><div class="acts" style="margin-top:6px"><button type="button" class="cta cta-ghost" data-action="close">Cancel</button><button class="cta cta-solid" type="submit">Add invitation</button></div></form>'),
  'toggle-lib': el => { const l = S.library.find(x => x.id===el.dataset.id); l.on = !l.on; audit(me(), l.on?'Published library resource':'Hid library resource', l.title, true); save(); toast(esc(l.title)+(l.on?' is now visible in the client Library.':' is hidden from patients.')); render(); },
  'reset': () => confirmDialog({ title:'Reset demo data?', body:LIVE.ready ? 'Restores the fictional seed data and clears the prototype audit history for everyone using the shared portal.' : 'Restores the fictional seed data and clears this browser’s prototype audit history.', yes:'Reset', onYes:() => { toast('Testing records are reloaded by applying the seed migration again. The audit log is append-only and is not cleared.'); } }),
  'task-filter': el => { adminTasks.f = el.dataset.f; render(); },
  'task-done': () => { adminTasks.done = !adminTasks.done; render(); },
  'form-filter': el => { formsPage.f = el.dataset.f; render(); },
  'open-form': el => { const t = S.templates.find(x => x.id===el.dataset.id); openDialog('<div class="x-row"><div><div class="sub">'+t.cat+' · v'+t.ver+'</div><h2>'+esc(t.name)+'</h2></div><button class="icon-btn" data-action="close" aria-label="Close">'+icon('close')+'</button></div><p class="small" style="margin-top:10px">How this form will be generated in Phase 4:</p><ol class="steps"><li>Open the full PDF preview with a patient panel beside it.</li><li>Type a patient name and confirm the right person by date of birth and patient ID.</li><li>Fill mapped fields from verified patient details. Unmapped fields stay empty.</li><li>Choose “Include my practitioner information” to add your verified profile and clinic.</li><li>Review the filled PDF and complete any clinical fields. Missing items are flagged.</li><li>Download a real PDF, or save a draft, then upload it to the patient’s Jane chart.</li></ol><div class="acts"><button class="cta cta-solid" data-action="close">Close</button></div>'); },
  'new-req': () => openDialog('<div class="x-row"><div><span class="phase">Phase 3</span><h2 style="margin-top:12px">New patient lab requisition</h2></div><button class="icon-btn" data-action="close" aria-label="Close">'+icon('close')+'</button></div><p class="small" style="margin-top:10px">This guided workflow is built in Phase 3. The steps it will follow:</p><ol class="steps"><li>Search for the patient and confirm identity.</li><li>Load the owner-approved Standard Initial Lab Requisition.</li><li>Fill patient and clinic details automatically.</li><li>Choose the responsible Nurse Practitioner from the authorized directory.</li><li>Review, then save as a PDF.</li><li>Route to the NP for authorization unless a valid standing order covers it.</li><li>Send by an approved secure method and record the outcome.</li></ol><p class="tiny" style="margin-top:14px">Duplicate check: an open requisition for the same patient and template blocks a second one.</p><div class="acts"><button class="cta cta-solid" data-action="close">Close</button></div>'),
  'record-send': el => { const d = DELIVERIES.find(x => x.id===el.dataset.id); pendingConfirm = null; openDialog('<div class="sub">Documents</div><h2>Record a send</h2><p class="small" style="margin-top:10px">Confirm you sent <b>'+esc(d.doc)+'</b> to '+esc(d.to)+' by '+d.method.toLowerCase()+' through an approved system. Bloom records it; it does not send it for you yet.</p><div class="field" style="margin-top:18px"><label for="rs-purpose">Purpose</label><input class="input" id="rs-purpose" value="'+(d.info==='Referral'?'Specialist referral for continuing care':'Laboratory testing')+'"></div><label class="row" style="gap:12px;margin-top:18px;font-size:0.9rem;cursor:pointer"><input type="checkbox" class="check" id="rs-ok"> I checked the recipient and '+(d.method==='Fax'?'used a confidentiality cover sheet and confirmed receipt':'used encrypted delivery')+'.</label><div class="acts"><button class="cta cta-ghost" data-action="close">Cancel</button><button class="cta cta-solid" data-action="do-record-send" data-id="'+d.id+'">Record as sent</button></div>'); },
  'do-record-send': el => {
    const d = DELIVERIES.find(x => x.id===el.dataset.id);
    if(!document.getElementById('rs-ok').checked){ toast('Please confirm the safety checks first.'); return; }
    const purpose = document.getElementById('rs-purpose').value.trim() || 'Continuing care';
    S.deliv[d.id] = 'Sent';
    if(d.to!=='Patient') S.disclosures.unshift({ t:new Date().toISOString(), pid:d.pid, to:d.to+' ('+d.method.toLowerCase()+')', purpose, what:d.doc, by:me().id });
    audit(me(), d.to==='Patient'?'Recorded delivery to patient':'Recorded disclosure', d.doc+' · '+d.method, true, { pid:d.pid, info:d.info });
    save(); closeLayer(); toast(d.to==='Patient'?'Recorded as sent to the patient.':'Recorded as sent and added to the disclosure log.'); render();
  },
  'end-session': el => { const t = byId(el.dataset.id); confirmDialog({ eyebrow:'Staff activity', title:'End '+fullName(t)+'’s session?', body:'They are signed out on every device straight away and must sign in again with MFA. Unsaved work in an open form may be lost.', yes:'End session', onYes:() => { delete SESS[t.id]; liveEndSession(t.id); audit(me(),'Ended staff session',fullName(t),true); toast(esc(fullName(t))+' was signed out.'); render(); } }); },
  'report-privacy': () => openDialog('<div class="sub">Privacy</div><h2>Report a privacy concern</h2><p class="small" style="margin-top:10px">Use this for anything that may have exposed patient information: a message to the wrong person, a lost device, a record opened by mistake. Report it straight away, even if you are unsure.</p><form class="form" data-form="incident"><div class="field"><label for="in-kind">What happened</label><select class="select" id="in-kind"><option>Information sent to the wrong person</option><option>Lost or stolen device</option><option>Record opened without a care need</option><option>Suspicious sign-in or account activity</option><option>Something else</option></select></div><div class="field"><label for="in-when">When</label><input class="input" id="in-when" type="datetime-local"></div><div class="field"><label for="in-pid">Patient ID, if known</label><input class="input" id="in-pid" placeholder="e.g. BLM-100231"></div><div class="field"><label for="in-desc">Brief description</label><textarea class="input" id="in-desc" required placeholder="What happened and what you have done so far"></textarea></div><p class="tiny">Use patient IDs, not names, and include only what the Privacy Officer needs.</p><div class="acts" style="margin-top:6px"><button type="button" class="cta cta-ghost" data-action="close">Cancel</button><button class="cta cta-solid" type="submit">Submit report</button></div></form>'),
  'toggle-comp': el => { const k = el.dataset.id; S.compliance[k] = !S.compliance[k]; audit(me(), S.compliance[k]?'Marked compliance item complete':'Reopened compliance item', COMPLIANCE.find(c => c[0]===k)[1], true); save(); render(); },
  'plan-open': el => { S.openPlan = el.dataset.id; save(); planUI = { tab:'assessment', open:{ 0:true }, bioCat:'Glucose & Metabolic', bioQ:'' }; const x = allPlans().find(p => p.id===el.dataset.id); audit(me(),'Opened care plan',x.kind,true,{ pid:x.pid, info:x.type==='wellness'?'Wellness assessment':'Clinical assessment' }); location.hash = '#/'+me().role+'/careplan'; },
  'plan-tab': el => { planUI.tab = el.dataset.t; render(); },
  'plan-hide': el => { const x = allPlans().find(p => p.id===S.openPlan); if(planStatus(x).status==='Published') return; const d = planDraft(x); d.hide = d.hide||{}; d.hide[el.dataset.k] = !d.hide[el.dataset.k]; save(); refreshEditor(); },
  'seg': el => { const x = allPlans().find(p => p.id===S.openPlan); if(!x || planStatus(x).status==='Published') return; setPath(planDraft(x), el.dataset.k, el.dataset.v); save(); refreshEditor(); },
  'row-add': el => { const x = allPlans().find(p => p.id===S.openPlan); const d = planDraft(x); d[el.dataset.k] = d[el.dataset.k]||[]; d[el.dataset.k].push(new Array(+el.dataset.n).fill('')); save(); refreshEditor(); },
  'row-del': el => { const x = allPlans().find(p => p.id===S.openPlan); if(planStatus(x).status==='Published') return; const d = planDraft(x); (d[el.dataset.k]||[]).splice(+el.dataset.i,1); save(); refreshEditor(); },
  'bio-add': el => { const x = allPlans().find(p => p.id===S.openPlan); const d = planDraft(x); d.bio = d.bio||[]; d.bio.push({ name:el.dataset.name, cat:el.dataset.cat, result:'', unit:'', range:'', prev:'', date:'', status:'In range', notes:'', show:false, plain:'' }); save(); refreshEditor(); },
  'herb-add': () => { const x = allPlans().find(p => p.id===S.openPlan); const d = planDraft(x); d.herbs = d.herbs||[]; d.herbs.push({ show:true, part:'Leaf', prep:'Tea / infusion' }); save(); refreshEditor(); },
  'jane-import': () => { janeFile = null; janeDialog(); },
  'jane-stop': () => { if(janeCtl) janeCtl.abort(); },
  'src-keep': el => { const x = allPlans().find(p => p.id===S.openPlan); if(!x) return; const d = planDraft(x); if(d.src) delete d.src[el.dataset.sk]; save(); refreshEditor(); },
  'plan-save': () => { const x = allPlans().find(p => p.id===S.openPlan); save(); audit(me(),'Saved care plan draft',x.kind,true,{ pid:x.pid, info:'Care plan' }); toast('Draft saved. Nothing is visible to the patient until it is published.'); },
  'plan-preview': () => { const x = allPlans().find(p => p.id===S.openPlan); if(x) openClientDoc(x); },
  'cd-pdf': () => cdPdf(),
  'plan-submit': () => { const x = allPlans().find(p => p.id===S.openPlan); S.planMeta = S.planMeta||{}; const m = planStatus(x); if(x.type==='wellness' && !x.reviewer) x.reviewer = patient(x.pid).np; S.planMeta[x.id] = { status:'Ready for Review', ver:m.ver }; audit(me(), x.type==='wellness'?'Sent wellness plan for NP review':'Marked care plan ready for review', x.kind, true, { pid:x.pid, info:'Care plan' }); save(); toast(x.type==='wellness'?'Sent to '+esc(staffShort(x.reviewer||patient(x.pid).np))+' for review and publishing.':'Marked ready for review.'); render(); },
  'plan-publish': () => { const x = allPlans().find(p => p.id===S.openPlan), d = planDraft(x), g = planGaps(x,d); if(g.length){ toast('Resolve '+g.length+' item'+(g.length>1?'s':'')+' under “Before publishing” first.'); const b = document.querySelector('#editor-body > .panel:last-child'); if(b) b.scrollIntoView({ behavior:'smooth' }); return; } confirmDialog({ eyebrow:'Publish', title:'Publish to '+patient(x.pid).first+'’s portal?', body:'Only the '+(x.type==='wellness'?'client wellness plan':'patient care plan')+' is published. The assessment stays internal. Earlier versions are kept, and this action is recorded.', yes:'Publish', onYes:() => { S.planMeta = S.planMeta||{}; S.planMeta[x.id] = { status:'Published', ver:planStatus(x).ver }; audit(me(),'Published care plan',x.kind+' · v'+planStatus(x).ver,true,{ pid:x.pid, info:'Care plan' }); save(); toast('Published. '+esc(patient(x.pid).first)+' can now see it in Care plans.'); render(); } }); },
  'plan-revise': () => { const x = allPlans().find(p => p.id===S.openPlan); S.planMeta = S.planMeta||{}; const m = planStatus(x); S.planMeta[x.id] = { status:'Draft', ver:m.ver+1 }; audit(me(),'Started care plan revision',x.kind+' · v'+(m.ver+1),true,{ pid:x.pid, info:'Care plan' }); save(); toast('Revision v'+(m.ver+1)+' started. The published version stays visible until you publish again.'); render(); },
  'plan-new': () => {
    const u = me(), hol = u.role==='holistic';
    const visits = hol ? ['Wellness consult · 30 min'] : ['Initial consultation','Follow-up · 30 min'];
    janeFile = null;
    openDialog('<div class="x-row"><div><div class="sub">'+(hol?'Wellness assessment':'Clinical assessment')+'</div><h2>New '+(hol?'wellness':'care')+' <em>plan</em></h2></div><button class="icon-btn" data-action="close" aria-label="Close">'+icon('close')+'</button></div>'+
      '<form class="form" data-form="plan-new" style="margin-top:22px" autocomplete="off">'+
      '<div class="field"><label for="pn-q">Patient</label><div class="search pn-search"><span class="pn-ic">'+icon('search',16)+'</span><input class="input" id="pn-q" data-pnq="1" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="pn-list" placeholder="Start typing a name or patient ID"><input type="hidden" id="pn-p" value=""><div class="neo search-results pn-list" id="pn-list" role="listbox" hidden></div></div><div id="pn-sel"><p class="tiny">Only patients in your care appear.</p></div></div>'+
      '<div class="field"><span class="lbl">Visit</span><div class="seg" role="radiogroup" aria-label="Visit">'+visits.map((o,k) => '<label class="seg-b seg-r"><input type="radio" name="pn-k" value="'+esc(o)+'"'+(k===0?' checked':'')+'>'+esc(o)+'</label>').join('')+'</div></div>'+
      '<div class="field"><span class="lbl">Jane visit note · optional</span>'+janeZone('pn-file')+'</div>'+
      '<div class="notice pn-check">'+icon('info',16)+'<div>Check the date of birth and patient ID before you continue.</div></div>'+
      '<div class="acts"><button type="button" class="cta cta-ghost" data-action="close">Cancel</button><button class="cta cta-solid" type="submit">Create draft</button></div></form>');
    pnUI = { i:-1, list:[] };
    setTimeout(() => { const q = document.getElementById('pn-q'); if(q) q.focus(); }, 60);
  },
  'tasks-view': el => { tasksUI.view = el.dataset.v; render(); },
  'inbox': (el, e) => { if(e) e.preventDefault(); tasksUI.view = 'me'; tasksUI.q = ''; const h = '#/'+me().role+'/tasks'; if(location.hash===h) render(); else location.hash = h; },
  'tasks-urg': el => { tasksUI.urg = el.dataset.v; render(); },
  'note-ack': el => { ACT['td-complete'](el); },
  'note-withdraw': el => { const n = normNote(S.notes.find(x => x.id===el.dataset.id)); n.withdrawn = true; logTask(n,{ by:me().id, type:'withdrawn', text:'' },[n.to]); audit(me(), n.from===n.to?'Deleted reminder':'Withdrew task', n.title, true, { pid:n.pid }); toast(n.from===n.to?'Reminder deleted.':'Withdrawn. It stays in Previous for the record.'); closeLayer(); render(); },
  'note-reply': el => taskDrawer(el.dataset.id),
  'task-open': (el, e) => { if(e && e.target.closest('input,button,a,select,textarea') && e.target.closest('input,button,a,select,textarea')!==el) return; taskBack = el.dataset.pid || ''; taskDrawer(el.dataset.id); },
  'task-back': () => { const p = taskBack; taskBack = ''; if(/\/chart$/.test(location.hash) && S.openChart===p){ closeLayer(); return; } patientDrawer(me(), p); },
  'pt-new-task': el => { const pid = el.dataset.id; openDialog('<div class="x-row"><div><div class="sub">New task</div><h2>'+esc(pName(patient(pid)))+'</h2></div><button class="icon-btn" data-action="close" aria-label="Close">'+icon('close')+'</button></div>'+composerHTML('pt',{ pid })); },
  'tasks-scope': el => { tasksUI.scope = el.dataset.v; render(); },
  'td-send': el => { const u = me(), n = normNote(S.notes.find(x => x.id===el.dataset.id)), text = document.getElementById('td-msg').value.trim(), to = document.getElementById('td-to').value;
    if(to!==n.to){ const prev = n.to; n.to = to; logTask(n,{ by:u.id, type:'forwarded', to, text },[to]); audit(u,'Passed task on',n.title+' · '+fullName(byId(prev))+' → '+fullName(byId(to)),true,{ pid:n.pid }); toast('Passed to '+esc(fullName(byId(to)))+'. The hand-off is saved in the conversation.'); }
    else { if(!text){ toast('Write a message first, or choose someone to pass it to.'); return; } logTask(n,{ by:u.id, type:'message', text },[n.to, n.from]); audit(u,'Replied on task',n.title,true,{ pid:n.pid }); toast('Message saved with the task.'); }
    taskDrawer(n.id); },
  'td-complete': el => { const u = me(), n = normNote(S.notes.find(x => x.id===el.dataset.id)), m = document.getElementById('td-msg'); n.done = true; n.doneAt = new Date().toISOString(); n.doneBy = u.id; logTask(n,{ by:u.id, type: n.kind==='note'?'acknowledged':'completed', text: m ? m.value.trim() : '' },[n.from]); audit(u, n.kind==='note'?'Acknowledged note':'Completed task', n.title, true, { pid:n.pid }); toast('Done. It’s now in Previous'+(n.pid?' and in the patient’s record':'')+'.'); closeLayer(); render(); },
  'td-reopen': el => { const u = me(), n = normNote(S.notes.find(x => x.id===el.dataset.id)); n.done = false; n.doneAt = null; logTask(n,{ by:u.id, type:'reopened', text:'' },[n.to]); audit(u,'Reopened task',n.title,true,{ pid:n.pid }); toast('Reopened.'); taskDrawer(n.id); render(); },
  'activity': el => activityDrawer(el.dataset.id),
  'activity-audit': el => { auditPreset = el.dataset.id; closeLayer(); location.hash = '#/owner/audit'; },
  'timeoff-new': () => { const u = me(), v = vacFor(u.id); openDialog('<div class="sub">Time off · '+v.avail+' h available</div><h2>Request time off</h2><form class="form" data-form="timeoff"><div class="field"><label for="to-type">Type</label><select class="select" id="to-type">'+TIMEOFF_TYPES.map(t => '<option>'+t+'</option>').join('')+'</select></div><div class="egrid"><div class="field"><label for="to-start">First day</label><input class="input" type="date" id="to-start" min="'+isoDay(0)+'" required></div><div class="field"><label for="to-end">Last day</label><input class="input" type="date" id="to-end" min="'+isoDay(0)+'" required></div></div><div class="field"><label for="to-hours">Hours <span style="text-transform:none;letter-spacing:0;color:var(--muted)">(leave blank to count 8 h per weekday)</span></label><input class="input" type="number" min="1" max="400" id="to-hours"></div><div class="field"><label for="to-note">Note for the owner <span style="text-transform:none;letter-spacing:0;color:var(--muted)">(optional)</span></label><input class="input" id="to-note" maxlength="120"></div><p class="tiny">'+(u.role==='owner'?'Owner time off is recorded as approved.':'The owner gets a task to review it. You’ll get a note when it’s decided.')+'</p><div class="acts" style="margin-top:6px"><button type="button" class="cta cta-ghost" data-action="close">Cancel</button><button class="cta cta-solid" type="submit">Send request</button></div></form>'); },
  'timeoff-cancel': el => { const r = S.vac.requests.find(x => x.id===el.dataset.id); r.status = 'Cancelled'; audit(me(),'Cancelled time off request',fmtRange(r.start,r.end),true); save(); toast('Request cancelled.'); render(); },
  'timeoff-decide': el => { const r = S.vac.requests.find(x => x.id===el.dataset.id), v = el.dataset.v, u = me(); r.status = v; r.by = u.id; S.notes.push({ id:'N-'+Date.now(), from:u.id, to:r.uid, kind:'note', urg:v==='Approved'?'routine':'soon', title:'Time off '+v.toLowerCase()+': '+fmtRange(r.start,r.end), body:v==='Approved'?'Enjoy your time away.':'Let’s find another date that works. Message me in Tasks.', due:'', pid:'', t:new Date().toISOString(), done:false, read:false }); audit(u, v==='Approved'?'Approved time off':'Declined time off', fullName(byId(r.uid))+' · '+fmtRange(r.start,r.end)+' · '+r.hours+' h', true); save(); toast(esc(byId(r.uid).first)+'’s time off '+v.toLowerCase()+'. They’ve been notified in Tasks.'); render(); },
  'hub-read': el => { const id = el.dataset.id; S.hub.reads[id] = S.hub.reads[id]||[]; if(!S.hub.reads[id].includes(me().id)) S.hub.reads[id].push(me().id); audit(me(),'Read policy change',S.hub.posts.find(p => p.id===id).title,true); save(); toast('Thanks. Marked as read.'); render(); },
  'hub-del': el => { const p = S.hub.posts.find(x => x.id===el.dataset.id); confirmDialog({ title:'Remove “'+p.title+'”?', body:'It disappears from the Team Dashboard for everyone. The removal is recorded.', yes:'Remove', onYes:() => { S.hub.posts = S.hub.posts.filter(x => x.id!==p.id); audit(me(),'Removed team dashboard post',p.title,true); save(); toast('Removed.'); render(); } }); },
  'hub-open-policies': () => audit(me(),'Opened policies & procedures','Google Drive',true),
  'hub-link': () => openDialog('<div class="sub">Team dashboard</div><h2>Policies &amp; procedures link</h2><p class="small" style="margin-top:10px">Paste the share link to the Bloom policies folder in Google Drive. Set the folder’s sharing to Bloom staff only, so the link works for staff and no one else.</p><form class="form" data-form="hub-link"><div class="field"><label for="hl-url">Google Drive link</label><input class="input" id="hl-url" type="url" placeholder="https://drive.google.com/drive/folders/…" value="'+esc(S.hub.policyUrl)+'" required></div><div class="acts" style="margin-top:6px"><button type="button" class="cta cta-ghost" data-action="close">Cancel</button><button class="cta cta-solid" type="submit">Save link</button></div></form>'),
  'hub-new': () => openDialog('<div class="sub">Team dashboard</div><h2>New post</h2><form class="form" data-form="hub-post"><div class="field"><label for="hp-type">Type</label><select class="select" id="hp-type">'+Object.keys(HUB_TYPES).map(k => '<option value="'+k+'">'+HUB_TYPES[k][0]+'</option>').join('')+'</select></div><div class="field"><label for="hp-title">Title</label><input class="input" id="hp-title" required maxlength="100"></div><div class="egrid"><div class="field"><label for="hp-date">Date</label><input class="input" type="date" id="hp-date"></div><div class="field"><label for="hp-end">End date or time <span style="text-transform:none;letter-spacing:0;color:var(--muted)">(optional)</span></label><input class="input" id="hp-end" placeholder="e.g. 2027-01-02 or 12:30 pm"></div></div><div class="field"><label for="hp-body">Details</label><textarea class="input" id="hp-body"></textarea></div><div class="field"><label for="hp-link">Link to a document <span style="text-transform:none;letter-spacing:0;color:var(--muted)">(optional)</span></label><input class="input" id="hp-link" type="url" placeholder="https://drive.google.com/…"></div><p class="tiny">Holidays and events need a date. For a policy change, the date is when it takes effect. Every staff member sees posts in their Team Dashboard.</p><div class="acts" style="margin-top:6px"><button type="button" class="cta cta-ghost" data-action="close">Cancel</button><button class="cta cta-solid" type="submit">Post</button></div></form>'),
  'fl-cat': el => { formsUI.cat = el.dataset.c; render(); },
  'form-open': el => audit(me(),'Opened official form',el.dataset.name,true),
  'preview-results': () => previewResults(),
  'preview-plan': () => previewPlan()
};
document.addEventListener('click', e => {
  const sr = e.target.closest('[data-pick]');
  if(sr){ document.getElementById('g-results').innerHTML=''; document.getElementById('g-search').value=''; patientDrawer(me(), sr.dataset.pick); return; }
  const el = e.target.closest('[data-action]');
  if(el && ACT[el.dataset.action]){ if(el.tagName==='BUTTON' && el.type!=='submit') e.preventDefault(); ACT[el.dataset.action](el, e); }
  if(!e.target.closest('.search')){ const r = document.getElementById('g-results'); if(r) r.innerHTML=''; }
  if(e.target.closest('.nav a')) { const s = document.getElementById('side'); if(s) s.classList.remove('open'); }
});
document.addEventListener('keydown', e => {
  if(e.key==='Escape'){ closeLayer(); const s = document.getElementById('side'); if(s) s.classList.remove('open'); }
  if(e.key==='Enter' && e.target.matches('tr[data-action]')) ACT['open-patient'](e.target);
  if(e.key==='Enter' && e.target.matches('.tk-click, .pt-task')) ACT['task-open'](e.target, e);
});
document.addEventListener('change', e => {
  const el = e.target, a = el.dataset.actionChange;
  if(el.dataset.biocat){ planUI.bioCat = el.value; planUI.bioQ=''; refreshEditor(); return; }
  if(el.dataset.k && el.closest('#editor-body')){ if(el.type==='checkbox' || el.tagName==='SELECT') planInput(el); return; }
  if(a==='note-done'){ const n = normNote(S.notes.find(x => x.id===el.dataset.id)); if(el.checked){ n.done = true; n.doneAt = new Date().toISOString(); n.doneBy = me().id; logTask(n,{ by:me().id, type:'completed', text:'' },[n.from]); audit(me(),'Completed task',n.title,true,{ pid:n.pid }); toast('Done. It’s now in Previous'+(n.pid?' and in the patient’s record':'')+'.'); } render(); return; }
  if(a==='task' || a==='ctask'){ const list = a==='task'?S.tasks:S.ctasks; const t = list.find(x => x.id===el.dataset.id); t.done = el.checked; audit(me(), t.done?'Completed task':'Reopened task', t.id+' · '+t.title, true); save(); toast(t.done?'Task completed.':'Task reopened.'); render(); }
  else if(a==='assign'){ const t = S.tasks.find(x => x.id===el.dataset.id); t.who = el.value; audit(me(),'Reassigned task',t.id+' → '+staffName(el.value),true); save(); toast('Assigned to '+esc(staffName(el.value))+'.'); }
  else if(a==='newdays'){ S.newDays = Number(el.value); audit(me(),'Changed new-client period',el.value+' days',true); save(); toast('Clients now show as New for '+el.value+' days after joining.'); }
  else if(a==='timeout'){ S.timeout = Number(el.value); audit(me(),'Changed session timeout',el.value+' minutes',true); save(); toast('Staff sessions now sign out after '+el.value+' minutes idle.'); }
  else if(a==='upload-template'){ const f = el.files && el.files[0]; if(!f) return; if(f.type!=='application/pdf'){ toast('Please choose a PDF file.'); return; } const name = f.name.replace(/\.pdf$/i,'').replace(/[_-]+/g,' '); S.templates.unshift({ id:'TP-'+Date.now(), name, cat:'Other Clinical Documents', ver:'1.0', eff:'Not yet effective', status:'Draft', clinic:'All locations', fields:0 }); audit(me(),'Uploaded template',name,true); save(); toast('“'+esc(name)+'” added as a draft. Field mapping arrives in Phase 4.'); render(); }
  else if(el.dataset.filter==='patients') filterPatients();
  else if(el.dataset.filter==='audit') document.getElementById('au-table').innerHTML = auditTable();
});
document.addEventListener('toggle', e => { if(e.target.matches && e.target.matches('details[data-sec]')) planUI.open[e.target.dataset.sec] = e.target.open; }, true);
document.addEventListener('input', e => {
  const el = e.target;
  if(el.dataset && el.dataset.tkq!=null){ tasksUI.q = el.value; const nl = document.getElementById('note-list'); if(nl) nl.innerHTML = noteList(me()); return; }
  if(el.dataset && el.dataset.ptq){ const pl = document.getElementById('pt-tasks'); if(pl) pl.innerHTML = patientTasksHTML(me(), el.dataset.ptq, el.value); return; }
  if(el.dataset && el.dataset.bioq){ planUI.bioQ = el.value; refreshEditor(); const q = document.getElementById('bio-q'); if(q){ q.focus(); q.setSelectionRange(q.value.length,q.value.length); } return; }
  if(el.dataset && el.dataset.k && el.closest('#editor-body')){ if(el.type!=='checkbox' && el.tagName!=='SELECT') planInput(el); return; }
  if(el.dataset.filter==='patients') filterPatients();
  if(el.dataset.flq){ formsUI.q = el.value; document.getElementById('fl-results').innerHTML = formResults(); return; }
  if(el.dataset.filter==='forms'){ const q = el.value.toLowerCase(); document.querySelectorAll('#fm-grid .tcard').forEach(c => { c.hidden = q && !c.dataset.name.includes(q); }); }
  if(el.id==='g-search'){
    const q = el.value.toLowerCase().trim(), box = document.getElementById('g-results');
    if(q.length<2){ box.innerHTML=''; return; }
    const list = api.patients(me()).filter(p => (p.first+' '+p.last).toLowerCase().includes(q) || (p.email||'').toLowerCase().includes(q) || p.id.toLowerCase().includes(q)).slice(0,8);
    box.innerHTML = '<div class="neo search-results" role="listbox">'+(list.length?list.map(p => '<button class="sr-item" data-pick="'+p.id+'" role="option"><div class="avatar" style="width:36px;height:36px;font-size:0.9rem">'+p.first[0]+p.last[0]+'</div><div><div class="n">'+esc(p.first+' '+p.last)+'</div><div class="m">'+(p.dob?'Born '+fmtDob(p.dob)+' · ':'')+p.id+' · '+esc(p.city)+'</div></div></button>').join(''):'<div class="small" style="padding:12px 14px">No matching patients you can access.</div>')+'</div>';
  }
  if(el.dataset.mfa!=null){ el.value = el.value.replace(/\D/g,'').slice(0,1); if(el.value){ const n = document.getElementById('mfa-'+(+el.dataset.mfa+1)); if(n) n.focus(); } }
});
document.addEventListener('paste', e => {
  if(e.target.dataset && e.target.dataset.mfa!=null){ const d = (e.clipboardData.getData('text')||'').replace(/\D/g,'').slice(0,6); if(d.length){ e.preventDefault(); d.split('').forEach((c,i) => { const n = document.getElementById('mfa-'+i); if(n) n.value=c; }); } }
});
document.addEventListener('submit', e => {
  const f = e.target.dataset.form; if(!f) return; e.preventDefault();
  if(f==='login'){
    auth.email = document.getElementById('li-email').value.trim().toLowerCase();
    BloomAuth.password(auth.email, document.getElementById('li-pass').value);
    return;
  }
  if(f==='mfa'){
    const code = [0,1,2,3,4,5].map(i => document.getElementById('mfa-'+i).value).join('');
    if(!/^\d{6}$/.test(code)){ auth.err = 'Enter all six digits from your authenticator.'; render(); return; }
    BloomAuth.code(code);
    return;
  }
  if(f==='enroll'){
    const code = (document.getElementById('enroll-code').value || '').replace(/\D/g,'').slice(0,6);
    if(!/^\d{6}$/.test(code)){ auth.err = 'Enter the six-digit code from your authenticator.'; render(); return; }
    BloomAuth.code(code);
    return;
  }
  if(f==='pledge'){
    const u = byId(auth.pending);
    if(!document.getElementById('pl-ok').checked){ auth.err = 'Please confirm the agreement to continue.'; render(); return; }
    u.conf = 'Signed '+new Date().toLocaleDateString('en-CA',{day:'numeric',month:'short',year:'numeric'}); audit(u,'Signed confidentiality agreement','Annual renewal',true);
    startSession(u);
  }
  if(f==='incident'){
    const u = me();
    const pid = document.getElementById('in-pid').value.trim().toUpperCase(), pt = patient(pid);
    const cust = pt ? staffShort(pt.np) : 'All NP custodians';
    S.incidents.unshift({ id:'PI-'+String(S.incidents.length+1).padStart(3,'0'), t:new Date().toISOString(), uid:u.id, kind:document.getElementById('in-kind').value, when:document.getElementById('in-when').value, pid:pt?pid:'', cust, status:'Risk-of-harm assessment needed' });
    audit(u,'Reported privacy concern',S.incidents[0].id+' · '+S.incidents[0].kind,true,{ pid:pt?pid:'' }); save(); closeLayer();
    toast('Report '+S.incidents[0].id+' recorded for the Privacy Officer and '+esc(cust)+'. Email alerts need a production integration.'); render();
  }
  if(f==='timeoff'){
    const u = me(), type = document.getElementById('to-type').value, start = document.getElementById('to-start').value, end = document.getElementById('to-end').value || start;
    if(end < start){ toast('The last day can’t be before the first day.'); return; }
    const hours = +document.getElementById('to-hours').value || weekdayHours(start,end), note = document.getElementById('to-note').value.trim();
    if(!hours){ toast('Those dates fall on a weekend. Add the hours yourself if you need them.'); return; }
    const v = vacFor(u.id);
    if(type==='Vacation' && hours > v.avail){ toast('That’s '+hours+' h but you have '+v.avail+' h available. Choose fewer days or unpaid leave.'); return; }
    const r = { id:'V-'+Date.now(), uid:u.id, type, start, end, hours, note, status:u.role==='owner'?'Approved':'Pending', by:u.role==='owner'?u.id:undefined };
    S.vac.requests.push(r);
    if(u.role!=='owner') S.staff.filter(s => s.role==='owner' && s.status==='active').forEach(o => S.notes.push({ id:'N-'+Date.now()+o.id, from:u.id, to:o.id, kind:'task', urg:'soon', title:'Time off request: '+fmtRange(start,end), body:type+' · '+hours+' h'+(note?' · '+note:'')+'. Approve or decline it on the Team page.', due:'', pid:'', t:new Date().toISOString(), done:false, read:false }));
    audit(u,'Requested time off',type+' · '+fmtRange(start,end)+' · '+hours+' h',true); save(); closeLayer();
    toast(u.role==='owner'?'Time off recorded.':'Request sent. The owner has it in Tasks.'); render();
  }
  if(f==='hub-link'){
    const url = document.getElementById('hl-url').value.trim();
    if(!/^https:\/\/(drive|docs)\.google\.com\//.test(url)){ toast('Use a Google Drive link that starts with https://drive.google.com/ or https://docs.google.com/'); return; }
    S.hub.policyUrl = url; audit(me(),'Set policies & procedures link','Google Drive',true); save(); closeLayer(); toast('Link saved. Every staff member can open it from the Team Dashboard.'); render();
  }
  if(f==='hub-post'){
    const type = document.getElementById('hp-type').value, title = document.getElementById('hp-title').value.trim(), date = document.getElementById('hp-date').value, extra = document.getElementById('hp-end').value.trim(), link = document.getElementById('hp-link').value.trim();
    if((type==='holiday'||type==='event') && !date){ toast('Holidays and events need a date.'); return; }
    if(link && !/^https:\/\//.test(link)){ toast('Links must start with https://'); return; }
    const post = { id:'H-'+Date.now(), type, title, body:document.getElementById('hp-body').value.trim(), date, by:me().id, t:new Date().toISOString(), link };
    if(type==='holiday' && /^\d{4}-\d{2}-\d{2}$/.test(extra)) post.end = extra; else if(type==='event' && extra) post.time = extra;
    S.hub.posts.push(post); if(type==='policy') S.hub.reads[post.id] = [me().id];
    audit(me(),'Posted to team dashboard',HUB_TYPES[type][0]+' · '+title,true); save(); closeLayer(); toast('Posted. Everyone sees it in their Team Dashboard.'); render();
  }
  if(f==='task-new'){
    const u = me(), px = e.target.dataset.p, g = id => document.getElementById(px+'-'+id);
    const kind = (e.target.querySelector('input[name="'+px+'-kind"]:checked')||{}).value || 'task';
    const urg = (e.target.querySelector('input[name="'+px+'-urg"]:checked')||{}).value || 'routine';
    const to = g('to').value, title = g('title').value.trim();
    if(!title){ toast('Add a short title first.'); return; }
    const body = g('body').value.trim(), now = new Date().toISOString();
    const n = { id:'N-'+Date.now(), from:u.id, to, kind, urg, title, body, due:g('due').value, pid:g('pid').value, t:now, done:false, read:to===u.id, private:g('private').checked, unread: to===u.id ? [] : [to], log:[{ t:now, by:u.id, type:'created', to, text:body }] };
    S.notes.push(n);
    audit(u, to===u.id?'Set reminder':(kind==='note'?'Sent note':'Sent task'), (to===u.id?'Self':fullName(byId(to)))+' · '+URGENCY.find(x=>x[0]===urg)[1], true, { pid:n.pid });
    save(); closeLayer();
    tasksUI.view = to!==u.id ? 'sent' : 'me';
    toast(to===u.id ? 'Reminder added.' : (kind==='note'?'Note':'Task')+' sent to '+esc(fullName(byId(to)))+'. It’s in their Tasks now.');
    render();
  }
  if(f==='plan-new'){
    const u = me(), pid = document.getElementById('pn-p').value, kind = (document.querySelector('input[name=pn-k]:checked')||{}).value, pt = patient(pid);
    if(!pt || !careTeam(pt).includes(u.id)){ document.getElementById('pn-sel').innerHTML = '<p class="tiny" style="color:var(--burgundy)">Choose a patient from the list to continue.</p>'; const q = document.getElementById('pn-q'); q.focus(); pnShow(); return; }
    const x = { id:'CP-N'+Date.now(), pid, by:u.id, kind, date:new Date().toLocaleDateString('en-CA',{day:'numeric',month:'short'}), status:'Draft', ver:1, type:u.role==='holistic'?'wellness':'clinical', reviewer:u.role==='holistic'?pt.np:undefined };
    S.newPlans = S.newPlans||[]; S.newPlans.push(x); S.planMeta = S.planMeta||{}; S.planMeta[x.id] = { status:'Draft', ver:1 };
    S.drafts = S.drafts||{}; S.drafts[x.id] = blankDraft(x); S.drafts[x.id].visitType = /Initial/.test(kind)?'Initial consultation':'Follow-up';
    S.openPlan = x.id; planUI = { tab:'assessment', open:{ 0:true }, bioCat:'Glucose & Metabolic', bioQ:'' };
    audit(u,'Created care plan draft',kind,true,{ pid, info:'Care plan' }); save(); closeLayer(); location.hash = '#/'+u.role+'/careplan';
    if(janeFile){ const f = janeFile; janeFile = null; setTimeout(() => runJaneImport(x.id, f), 120); }
  }
  if(f==='jane-import'){
    if(!janeFile){ toast('Choose the note from Jane first.'); return; }
    const file = janeFile; janeFile = null; runJaneImport(S.openPlan, file);
  }
  if(f==='invite'){
    const first = document.getElementById('iv-first').value.trim(), last = document.getElementById('iv-last').value.trim(), email = document.getElementById('iv-email').value.trim().toLowerCase(), role = document.getElementById('iv-role').value, title = document.getElementById('iv-title').value.trim() || ROLE_LABEL[role];
    if(S.staff.some(s => s.email===email)){ toast('A staff account with that email already exists.'); return; }
    S.staff.push({ id:'u-'+Date.now(), first, last, email, role, title, cred:null, status:'invited', mfa:'Not enrolled', seen:'Invitation queued today', conf:'Required before first sign-in', revoked:[] });
    audit(me(),'Invited staff',first+' '+last+' · '+ROLE_LABEL[role],true); save(); closeLayer();
    toast(esc(first)+' was added as invited. Sending the email needs a production integration.'); render();
  }
  if(f==='clinic'){
    const fd = new FormData(e.target); ['name','legal','address','phone','fax','email','privacy'].forEach(k => S.clinic[k] = String(fd.get(k)||'').trim());
    audit(me(),'Updated clinic information','Clinic details',true); save(); toast('Clinic details saved.');
  }
});
/* chart tooltips */
document.addEventListener('pointerover', e => {
  const h = e.target.closest && e.target.closest('.hit'); if(!h) return;
  const tip = h.closest('.chart').querySelector('.tip'); tip.textContent = h.dataset.tip; tip.style.left = h.dataset.x+'%'; tip.style.top = h.dataset.y+'%'; tip.classList.add('on');
});
document.addEventListener('pointerout', e => { const h = e.target.closest && e.target.closest('.hit'); if(h){ const t = h.closest('.chart').querySelector('.tip'); t.classList.remove('on'); } });

window.addEventListener('hashchange', () => { closeLayer(); render(); });

window.BloomSetAuth = function(patch){ Object.assign(auth, patch); };
window.BloomApply = function(data){
  PATIENTS = data.patients || [];
  APPTS = data.appointments || [];
  PANELS = [];
  PLANS = data.plans || [];
  DELIVERIES = data.deliveries || [];
  CHART = {};
  DEMO_PLANS = data.drafts || {};
  S.staff = data.staff || [];
  S.reqs = data.reqs || [];
  S.tasks = data.tasks || [];
  S.ctasks = data.ctasks || [];
  S.templates = data.templates || [];
  S.library = data.library || [];
  S.disclosures = data.disclosures || [];
  S.notes = data.notes || [];
  S.hub = data.hub || seedHub();
  S.vac = data.vac || seedVac();
  if(S.vac && S.vac.requests && typeof S.vac.requests === 'string') S.vac.requests = [];
  S.incidents = data.incidents || [];
  S.compliance = data.compliance || {};
  S.clinic = Object.assign({}, CLINIC, data.clinic || {});
  S.timeout = data.timeout || 15;
  S.newDays = data.newDays || 30;
  S.audit = data.audit || [];
  S.jane = S.jane || {};
  S.deliv = S.deliv || {};
  S.drafts = data.drafts || {};
  S.newPlans = [];
  S.planMeta = {};
  PLANS.forEach(p => { S.planMeta[p.id] = { status:p.status, ver:p.ver }; });
};
window.BloomState = function(){ return S; };
window.BloomPlans = function(){ return allPlans(); };
window.BloomAPI = {
  openDialog, closeLayer, toast, esc, icon, me, audit, save, render, fullName, byId, startSession, signOut,
  patient: id => patient(id),
  patients: () => PATIENTS,
  clinic: () => S.clinic,
  apply: window.BloomApply
};
BloomAuth.boot();

})();

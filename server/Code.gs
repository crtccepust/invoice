/**
 * CRTC Invoice Server (Google Apps Script)
 * 1) Edit ADMIN and SITE_URL below.  2) Run setup() once.
 * 3) Deploy > New deployment > Web app  (Execute as: Me | Who has access: Anyone).
 * 4) Paste the Web app URL into crtc-invoice-tool.html (API_URL) or on its sign-in page.
 * All data is stored as JSON files in the Drive of the account that owns this script.
 */
const ADMIN = {name: 'CRTC Administrator', email: 'admin@example.com', password: 'ChangeMe#2026'}; // first admin (must change password at first sign-in)
const SITE_URL = '';          // e.g. https://crtc-invoice.netlify.app  (used in e-mails)
const SESSION_SEC = 21600;    // 6 hours (Apps Script cache maximum)
const P = PropertiesService.getScriptProperties(), C = CacheService.getScriptCache();
const NO = {ok: false, error: 'You do not have permission for this action.'};

function setup() {
  ['users', 'data', 'registry'].forEach(n => {
    if (!P.getProperty('f_' + n)) {
      const init = n === 'users' ? {users: {}, log: []} : {};
      P.setProperty('f_' + n, DriveApp.createFile('crtc_' + n + '.json', JSON.stringify(init), 'application/json').getId());
    }
  });
  const U = rd('users'), k = ADMIN.email.toLowerCase();
  if (!U.users[k]) { U.users[k] = mk(ADMIN.name, k, ADMIN.password, 'admin', 'approved', {must: true}); wr('users', U); }
  Logger.log('Setup complete. Now deploy as a Web app.');
}

/* ---------- helpers ---------- */
const rd = n => JSON.parse(DriveApp.getFileById(P.getProperty('f_' + n)).getBlob().getDataAsString() || '{}');
const wr = (n, o) => DriveApp.getFileById(P.getProperty('f_' + n)).setContent(JSON.stringify(o));
const out = o => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
const ver = () => +P.getProperty('ver') || 0;
const bump = () => { const v = ver() + 1; P.setProperty('ver', String(v)); return v; };
const now = () => new Date().toISOString();
function pwHash(pw, salt) { let h = salt + pw; for (let i = 0; i < 1000; i++) h = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + h)); return h; }
function mk(name, email, pw, role, status, x) { const salt = Utilities.getUuid(); return Object.assign({name: name, email: email, role: role, status: status, salt: salt, hash: pwHash(pw, salt), created: now()}, x || {}); }
function log(U, who, ev) { U.log.unshift({t: now(), u: who, e: ev}); U.log = U.log.slice(0, 300); }
function pwOk(p) { return typeof p === 'string' && p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p); }
function mail(to, sub, body) { try { MailApp.sendEmail(to, sub, body + '\n\n- CRTC Invoice System'); } catch (e) {} }
function pub(u) { return {name: u.name, email: u.email, role: u.role, designation: u.designation || '', org: u.org || '', must: !!u.must}; }

/* ---------- web endpoints ---------- */
function doGet(e) {
  const a = e.parameter || {};
  if (a.action === 'verify') { const r = rd('registry'); return out({ok: true, co: r.co, u: r.u, rec: (r.inv || {})[a.no] || null}); }
  return out({ok: true, service: 'CRTC Invoice Server'});
}
function doPost(e) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try { return out(route(JSON.parse(e.postData.contents))); }
  catch (err) { return out({ok: false, error: String(err.message || err)}); }
  finally { lock.releaseLock(); }
}

function route(q) {
  const a = q.action;
  if (a === 'register') return register(q);
  if (a === 'login') return login(q);
  const who = C.get('s_' + q.token); if (!who) return {ok: false, error: 'auth'};
  const U = rd('users'), me = U.users[who]; if (!me || me.status !== 'approved') return {ok: false, error: 'auth'};
  const W = me.role === 'admin' || me.role === 'staff', A = me.role === 'admin';
  switch (a) {
    case 'logout': C.remove('s_' + q.token); return {ok: true};
    case 'data.get': return {ok: true, data: rd('data'), ver: ver()};
    case 'data.put': if (!W) return NO; if (q.ver !== ver()) return {ok: false, error: 'conflict'}; wr('data', q.data); return {ok: true, ver: bump()};
    case 'registry.put': if (!W) return NO; wr('registry', q.reg); return {ok: true};
    case 'pw.change':
      if (me.hash !== pwHash(String(q.old || ''), me.salt)) return {ok: false, error: 'Current password is incorrect.'};
      if (!pwOk(q.pw)) return {ok: false, error: 'New password needs 8+ characters with letters and numbers.'};
      me.salt = Utilities.getUuid(); me.hash = pwHash(q.pw, me.salt); delete me.must; log(U, me.email, 'password changed'); wr('users', U); return {ok: true};
    case 'users.list':
      if (!A) return NO;
      return {ok: true, log: U.log.slice(0, 60), users: Object.keys(U.users).map(k => { const u = U.users[k]; return {name: u.name, email: u.email, role: u.role, status: u.status, org: u.org, designation: u.designation, phone: u.phone, req: u.req, created: u.created, last: u.last}; })};
    case 'users.act': if (!A) return NO; return act(U, me, q);
  }
  return {ok: false, error: 'Unknown action'};
}

function register(q) {
  const k = String(q.email || '').trim().toLowerCase();
  if (!String(q.name || '').trim() || !/^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/.test(k)) return {ok: false, error: 'Enter your name and a valid email address.'};
  if (!pwOk(q.password)) return {ok: false, error: 'Password must be 8+ characters with letters and numbers.'};
  const U = rd('users'); if (U.users[k]) return {ok: false, error: 'An account with this email already exists.'};
  U.users[k] = mk(String(q.name).trim().slice(0, 80), k, q.password, 'viewer', 'pending', {org: String(q.org || '').slice(0, 100), designation: String(q.designation || '').slice(0, 80), phone: String(q.phone || '').slice(0, 30), req: ['staff', 'viewer'].indexOf(q.req) > -1 ? q.req : 'viewer'});
  log(U, k, 'registered (pending approval)'); wr('users', U);
  Object.keys(U.users).filter(e => U.users[e].role === 'admin' && U.users[e].status === 'approved')
    .forEach(e => mail(e, 'New CRTC registration awaiting approval', 'Name: ' + U.users[k].name + '\nEmail: ' + k + '\nOrganisation: ' + U.users[k].org + '\nDesignation: ' + U.users[k].designation + '\n\nOpen the invoice system > Users to approve or reject.' + (SITE_URL ? '\n' + SITE_URL : '')));
  return {ok: true};
}

function login(q) {
  const k = String(q.email || '').trim().toLowerCase(), ck = 'f_' + k, fails = +C.get(ck) || 0;
  if (fails >= 5) return {ok: false, error: 'Too many failed attempts. Try again in 15 minutes.'};
  const U = rd('users'), u = U.users[k];
  if (!u || u.hash !== pwHash(String(q.password || ''), u.salt)) { C.put(ck, String(fails + 1), 900); return {ok: false, error: 'Invalid email or password.'}; }
  if (u.status !== 'approved') return {ok: false, error: u.status};   // pending | rejected | suspended
  C.remove(ck);
  const token = Utilities.getUuid() + Utilities.getUuid(); C.put('s_' + token, k, SESSION_SEC);
  u.last = now(); log(U, k, 'signed in'); wr('users', U);
  return {ok: true, token: token, user: pub(u)};
}

function act(U, me, q) {
  const k = String(q.email || '').toLowerCase(), u = U.users[k];
  if (!u) return {ok: false, error: 'User not found.'};
  if (k === me.email && ['suspend', 'delete', 'role', 'reject'].indexOf(q.op) > -1) return {ok: false, error: 'You cannot do this to your own account.'};
  const site = SITE_URL ? '\n' + SITE_URL : '';
  switch (q.op) {
    case 'approve':
      u.status = 'approved'; u.role = ['admin', 'staff', 'viewer'].indexOf(q.role) > -1 ? q.role : (u.req || 'viewer');
      mail(u.email, 'Your CRTC account is approved', 'Dear ' + u.name + ',\n\nYour registration has been approved (access: ' + u.role + '). You can now sign in.' + site); break;
    case 'reject': u.status = 'rejected'; mail(u.email, 'CRTC registration update', 'Dear ' + u.name + ',\n\nYour registration could not be approved. Please contact CRTC for details.'); break;
    case 'suspend': u.status = 'suspended'; break;
    case 'reactivate': u.status = 'approved'; break;
    case 'role': if (['admin', 'staff', 'viewer'].indexOf(q.role) < 0) return {ok: false, error: 'Invalid role.'}; u.role = q.role; break;
    case 'reset': {
      const t = Utilities.getUuid().replace(/-/g, '').slice(0, 10) + 'Aa1'; u.salt = Utilities.getUuid(); u.hash = pwHash(t, u.salt); u.must = true;
      mail(u.email, 'CRTC password reset', 'Dear ' + u.name + ',\n\nYour temporary password is: ' + t + '\nYou must change it when you sign in.' + site);
      log(U, me.email, 'reset password ' + k); wr('users', U); return {ok: true, temp: t};
    }
    case 'delete': delete U.users[k]; break;
    default: return {ok: false, error: 'Unknown operation.'};
  }
  log(U, me.email, q.op + ' ' + k); wr('users', U); return {ok: true};
}

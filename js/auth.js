/* Sign-in, registration, session handling, idle timeout and password modal. */
function authView(mode='in',msg='',ok=false){document.body.classList.remove('in');
  const f=(id,l,t='text',ph='')=>`<div><label>${l}</label><input id="${id}" type="${t}" placeholder="${ph}" autocomplete="${t=='password'?(id=='rp1'||id=='rp2'?'new-password':'current-password'):id=='lem'?'username':'off'}"></div>`;
  $('#auth').innerHTML=`<div class="acard"><img class="alogo-img" src="assets/logo.svg" alt="CRTC"><h2>CRTC Invoice System</h2><p class="mu" style="margin:0">Authorised users only</p>
  <div class="atabs"><button class="${mode=='in'?'on':''}" onclick="authView('in')">Sign in</button><button class="${mode=='reg'?'on':''}" onclick="authView('reg')">Register</button></div>
  <div id="am" class="amsg ${ok?'ok':'bad'}" style="${msg?'':'display:none'}">${esc(msg)}</div>
  ${mode=='in'?`<form onsubmit="doLogin();return false" novalidate><div class="agrid">${f('lem','Email','email')}${f('lpw','Password','password')}</div><button type="submit" class="afull">Sign in</button></form>`
  :`<form onsubmit="doRegister();return false" novalidate><div class="agrid">${f('rn','Full name *')}${f('ro','Organisation / department')}${f('rd','Designation')}${f('re','Email *','email')}${f('rph','Mobile','tel')}<div><label>Access requested</label><select id="rq2"><option value="faculty">Faculty – edit & delete invoices</option><option value="staff">Staff – edit; delete needs Admin approval</option><option value="viewer">Others – view only</option></select></div>${f('rp1','Password *','password','8+ characters, letters & numbers')}${f('rp2','Confirm password *','password')}</div><p class="mu" style="font-size:12px">Your registration is reviewed by CRTC. You can sign in after it is approved.</p><button type="submit" class="afull">Submit registration</button></form>`}
  ${API_URL?'':`<details style="margin-top:14px"><summary class="mu">Server settings</summary><input id="apiu" value="${esc(localStorage.crtcApi||'')}" placeholder="Apps Script Web app URL"><button class="g" style="margin-top:6px" onclick="localStorage.crtcApi=$('#apiu').value.trim();am('Server URL saved.',true)">Save URL</button></details>`}</div>`;
  const fe=$('#lem')||$('#rn');if(fe&&fe.focus)fe.focus()}
function am(m,ok){const e=$('#am');e.textContent=m;e.className='amsg '+(ok?'ok':'bad');e.style.display='block'}
async function doLogin(){const email=$('#lem').value.trim(),password=$('#lpw').value;if(!email||!password)return am('Enter your email and password.');
  loader('Signing in…');
  try{const j=await rpc('login',{email,password});SES={token:j.token,user:j.user};sessionStorage.crtcSes=JSON.stringify(SES);await enter()}
  catch(e){const m={pending:'Your registration is awaiting approval by CRTC. You will be notified by email.',rejected:'Your registration was not approved. Please contact CRTC.',suspended:'Your account is suspended. Please contact CRTC.'}[e.message];if(e.message!=='auth')am(m||e.message||'Sign-in failed.')}finally{unloader()}}
async function doRegister(){const v=id=>$('#'+id).value.trim(),pw=$('#rp1').value;
  if(!v('rn')||!v('re'))return am('Name and email are required.');
  if(pw.length<8||!/[A-Za-z]/.test(pw)||!/\d/.test(pw))return am('Password must be at least 8 characters with letters and numbers.');
  if(pw!==$('#rp2').value)return am('Passwords do not match.');
  try{await rpc('register',{name:v('rn'),org:v('ro'),designation:v('rd'),email:v('re'),phone:v('rph'),req:$('#rq2').value,password:pw},'Submitting your registration…');authView('in','Registration submitted. CRTC will review it and you will be notified by email once it is approved.',true)}
  catch(e){am(e.message)}}
async function enter(){document.body.classList.add('in');$('#who').textContent=SES.user.name+' · '+(ROLE_LABEL[SES.user.role]||SES.user.role);document.body.classList.toggle('ro',!can('write'));view='dashboard';ldMsg('Loading your data…');stat('Loading…');
  try{await loadData();stat('Signed in');if(can('admin')){const u=await rpc('users.list');PEND=u.users.filter(x=>x.status==='pending').length;nav()}}
  catch(e){if(e.message!=='auth')stat('Could not load data: '+e.message)}
  if(SES&&SES.user.must)chpwModal(true);resetIdle()}
function endSession(msg){SES=null;sessionStorage.removeItem('crtcSes');DB=structuredClone(DEFAULT);cur=null;clearTimeout(timer);clearTimeout(idleT);authView('in',msg)}
async function logout(){try{await rpc('logout',{},'Signing out…')}catch(e){}if(SES)endSession('')}
function resetIdle(){clearTimeout(idleT);if(SES)idleT=setTimeout(()=>{if(SES){rpc('logout').catch(()=>{});endSession('You were signed out after 30 minutes of inactivity.')}},30*60*1000)}
['click','keydown','touchstart'].forEach(ev=>document.addEventListener(ev,()=>{if(SES)resetIdle()},{passive:true}));
async function boot(){const x=sessionStorage.crtcSes;if(x){SES=JSON.parse(x);loader('Restoring your session…');try{await enter()}finally{unloader()}return}authView('in')}
function modal(h){let m=$('#modal');if(!m){m=document.createElement('div');m.id='modal';document.body.appendChild(m)}m.className='mback';m.innerHTML=`<div class="mcard">${h}</div>`}
function closeModal(){const m=$('#modal');if(m)m.remove()}
function chpwModal(force){modal(`<h3 style="margin-top:0">${force?'Set a new password':'Change password'}</h3>${force?'<p class="mu">You must change your temporary password before continuing.</p>':''}<label>Current password</label><input id="cp0" type="password" autocomplete="current-password"><label style="margin-top:8px">New password</label><input id="cp1" type="password" autocomplete="new-password" placeholder="8+ characters, letters & numbers"><label style="margin-top:8px">Confirm new password</label><input id="cp2" type="password" autocomplete="new-password"><div id="cpm" class="amsg bad" style="display:none;margin-top:8px"></div><div class="row" style="margin-top:12px"><button onclick="doChpw()">Update password</button>${force?'':'<button class="g" onclick="closeModal()">Cancel</button>'}</div>`)}
async function doChpw(){const p=$('#cp1').value,m=$('#cpm'),bad=t=>{m.textContent=t;m.style.display='block'};
  if(p.length<8||!/[A-Za-z]/.test(p)||!/\d/.test(p))return bad('New password needs 8+ characters with letters and numbers.');if(p!==$('#cp2').value)return bad('Passwords do not match.');
  try{await rpc('pw.change',{old:$('#cp0').value,pw:p},'Updating password…');SES.user.must=false;sessionStorage.crtcSes=JSON.stringify(SES);closeModal();stat('Password updated ✔')}catch(e){if(e.message!=='auth')bad(e.message)}}

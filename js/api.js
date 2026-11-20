/* Server layer (Google Apps Script): RPC calls, role check, debounced save/load. */
const API=()=>API_URL||localStorage.crtcApi||'';
/** Permissions: 'admin' = Admin only; 'del' = delete invoices (Admin, Faculty); 'write' = edit (Admin, Faculty, Staff). Others = view only. */
const can=a=>{if(!SES)return false;const r=SES.user.role;return a==='admin'?r==='admin':a==='del'?['admin','faculty'].includes(r):['admin','faculty','staff'].includes(r)};
let PEND=0,idleT=null,UL=[];
/** Full-screen loading indicator (counter-based so nested calls keep it visible). */
let ldN=0,ldT=null;
function ldMsg(m){$('#ldmsg').textContent=m||'Connecting to server…'}
function loader(msg){ldN++;ldMsg(msg);$('#loader').classList.add('on');clearTimeout(ldT);ldT=setTimeout(()=>ldMsg('Still connecting… the server can take a few seconds to wake up.'),8000)}
function unloader(){ldN=Math.max(0,ldN-1);if(!ldN){clearTimeout(ldT);$('#loader').classList.remove('on')}}
/** Calls the Apps Script server. Pass a message as 3rd argument to show the loading indicator. */
async function rpc(action,data={},ld){const u=API();if(!u)throw new Error('Server URL not set. Open "Server settings" on the sign-in page.');
  if(ld)loader(ld);
  try{let r,j;
    try{r=await fetch(u,{method:'POST',body:JSON.stringify({action,token:SES&&SES.token,...data})})}catch(e){throw new Error('Cannot reach the server. Check your internet connection and the Server URL.')}
    try{j=await r.json()}catch(e){throw new Error('Unexpected reply from the server. Check that the Web app is deployed as "Execute as: Me" with access "Anyone", using the latest version.')}
    if(j.error==='auth'){endSession('Your session has expired. Please sign in again.');throw new Error('auth')}
    if(!j.ok)throw new Error(j.error||'Server error');return j}
  finally{if(ld)unloader()}}
function persist(){clearTimeout(timer);if(can('write'))timer=setTimeout(save,1200)}
async function save(){if(!can('write'))return;
  try{stat('Saving…');const j=await rpc('data.put',{data:DB,ver:VER});VER=j.ver;stat('Saved ✔ '+new Date().toLocaleTimeString())}
  catch(e){if(/conflict/.test(e.message)){alert('Another user saved changes first. The latest data will be reloaded – please repeat your last edit.');await loadData()}else if(/cannot delete/.test(e.message)){alert(e.message);await loadData()}else if(e.message!=='auth')stat('Save failed – check connection')}}
async function loadData(){const j=await rpc('data.get');VER=j.ver;DB={...structuredClone(DEFAULT),...j.data};mig();if(!j.data.invoices&&can('write'))persist();draw()}

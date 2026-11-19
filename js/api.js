/* Server layer (Google Apps Script): RPC calls, role check, debounced save/load. */
const API=()=>API_URL||localStorage.crtcApi||'';
const can=a=>!!SES&&(a==='admin'?SES.user.role==='admin':['admin','staff'].includes(SES.user.role));
let PEND=0,idleT=null,UL=[];
async function rpc(action,data={}){const u=API();if(!u)throw new Error('Server URL not set. Open "Server settings" on the sign-in page.');
  const r=await fetch(u,{method:'POST',body:JSON.stringify({action,token:SES&&SES.token,...data})});const j=await r.json();
  if(j.error==='auth'){endSession('Your session has expired. Please sign in again.');throw new Error('auth')}
  if(!j.ok)throw new Error(j.error||'Server error');return j}
function persist(){clearTimeout(timer);if(can('write'))timer=setTimeout(save,1200)}
async function save(){if(!can('write'))return;
  try{stat('Saving…');const j=await rpc('data.put',{data:DB,ver:VER});VER=j.ver;stat('Saved ✔ '+new Date().toLocaleTimeString())}
  catch(e){if(/conflict/.test(e.message)){alert('Another user saved changes first. The latest data will be reloaded – please repeat your last edit.');await loadData()}else if(e.message!=='auth')stat('Save failed – check connection')}}
async function loadData(){const j=await rpc('data.get');VER=j.ver;DB={...structuredClone(DEFAULT),...j.data};mig();if(!j.data.invoices&&can('write'))persist();draw()}

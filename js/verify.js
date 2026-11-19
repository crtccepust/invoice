/* QR verification: link, QR drawing, public registry sync and the public verify page. */
async function verifyLink(i){const t=calc(i),s=DB.settings,base=s.verifyUrl||location.href.split(/[?#]/)[0];
  return base+'?verify='+encodeURIComponent(i.no)+'&h='+await hash(i)+'&t='+t.total.toFixed(2)+'&d='+i.date+'&s='+encodeURIComponent(API())}
async function drawQR(){const e=$('#qr');if(!e||cur.status==='Draft')return;
  try{const q=qrcode(0,'M');q.addData(await verifyLink(cur));q.make();e.innerHTML=q.createSvgTag({cellSize:4,margin:0,scalable:true});$('#vid').textContent=(await hash(cur)).slice(0,8).toUpperCase()}
  catch(x){e.textContent='QR unavailable (needs internet once to load the QR library)'}
}
async function syncRegistry(){if(!can('write'))return;
  try{const inv={};for(const i of DB.invoices){if(i.status==='Draft')continue;const t=calc(i);inv[i.no]={h:await hash(i),x:i.crtc||'',rd:i.deliv||'',d:i.date,c:i.client,t:+t.total.toFixed(2),b:+t.due.toFixed(2),s:status(i),due:i.due}}
    (DB.void||[]).forEach(n=>inv[n]={...(inv[n]||{}),s:'Cancelled'});
    await rpc('registry.put',{reg:{co:DB.settings.company,u:new Date().toISOString(),inv}})}catch(e){if(e.message!=='auth')stat('Verification registry sync failed')}}
async function verifyMode(){document.body.classList.add('in');document.querySelector('header').style.display='none';$('#nav').style.display='none';
  const q=new URLSearchParams(location.search),no=q.get('verify'),h=q.get('h'),r=q.get('r'),k=q.get('k'),box=m=>$('#app').innerHTML=`<div style="max-width:480px;margin:auto;text-align:center">${m}</div>`;
  box('<h2>Verifying invoice…</h2>');let rec=null,live=false,co='CRTC',upd='';
  const S=q.get('s')||API();if(S){try{const d=await(await fetch(S+'?action=verify&no='+encodeURIComponent(no))).json();if(d.ok){rec=d.rec;live=true;co=d.co||co;upd=d.u||''}}catch(e){}}
  const row=(a,b)=>`<tr><td style="color:var(--mu)">${a}</td><td style="text-align:right"><b>${esc(b)}</b></td></tr>`,tag=(c,t,m)=>`<div class="vbox" style="background:${c}"><h1>${t}</h1><div>${m}</div></div>`;
  if(live&&!rec)return box(tag('#c0392b','✕ NOT FOUND','No issued invoice '+esc(no)+' exists in the CRTC register.'));
  if(live&&rec.s==='Cancelled')return box(tag('#c0392b','✕ CANCELLED','Invoice '+esc(no)+' has been cancelled by '+esc(co)+'.'));
  if(live&&rec.h!==h)return box(tag('#c0392b','✕ INVALID','The details on this invoice do not match the CRTC register. It may be altered or forged.'));
  if(live){let st=rec.s;if((st==='Sent'||st==='Partial')&&rec.due<today())st='Overdue';
    return box(tag('#1a8f4c','✔ AUTHENTIC','Issued by '+esc(co))+`<table class="vt">${row('Invoice no.',no)}${row('Date',rec.d)}${row('Billed to',rec.c)}${row('Total',money(rec.t))}${row('Balance due',money(rec.b))}${row('Status',st)}${rec.x?row('CRTC No.',rec.x):''}${rec.rd?row('Report delivery',rec.rd):''}</table><small style="color:var(--mu)">Live record updated ${upd?new Date(upd).toLocaleString():''}</small>`)}
  box(tag('#c27a00','⚠ UNCONFIRMED','Live register could not be reached. Details printed in the QR (not verified):')+`<table class="vt">${row('Invoice no.',no)}${row('Date',q.get('d')||'—')}${row('Total',money(q.get('t')||0))}${row('Code',(h||'').slice(0,8).toUpperCase())}</table>`)}

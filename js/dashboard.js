/* Dashboard: KPI cards and charts (inline SVG / CSS, no external libraries). */
const DASH={p:'year'};
const PAL=['#0b5cab','#1a8f4c','#c27a00','#c0392b','#8e44ad','#16a2b8','#e67e22','#5d6d7e'];
const STC={Paid:'#1a8f4c',Partial:'#8e44ad',Sent:'#c27a00',Overdue:'#c0392b',Draft:'#8a94a3',Cancelled:'#555'};
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PLAB={month:'This month',quarter:'This quarter',year:'This year',all:'All time'};
const fmtK=n=>{n=+n||0;const a=Math.abs(n);return a>=1e7?(n/1e7).toFixed(2)+' Cr':a>=1e5?(n/1e5).toFixed(2)+' L':a>=1e3?(n/1e3).toFixed(1)+'k':Math.round(n)};
function inPeriod(d,p){if(p==='all'||!d)return true;const t=new Date(),x=new Date(d),y=x.getFullYear()===t.getFullYear();
  return p==='year'?y:p==='month'?y&&x.getMonth()===t.getMonth():p==='quarter'?y&&Math.floor(x.getMonth()/3)===Math.floor(t.getMonth()/3):true}
function donut(items,center,sub){const tot=items.reduce((a,x)=>a+x.v,0)||1,R=54,C=2*Math.PI*R;let off=0;
  const segs=items.filter(x=>x.v>0).map(x=>{const len=x.v/tot*C,s=`<circle r="${R}" cx="70" cy="70" fill="none" stroke="${x.c}" stroke-width="18" stroke-dasharray="${len} ${C-len}" stroke-dashoffset="${-off}"><title>${esc(x.l)}: ${esc(x.t||x.v)}</title></circle>`;off+=len;return s}).join('');
  return`<svg viewBox="0 0 140 140" width="150" height="150"><g transform="rotate(-90 70 70)"><circle class="trk" r="${R}" cx="70" cy="70" fill="none" stroke-width="18"/>${segs}</g><text class="cv" x="70" y="68" text-anchor="middle" font-size="19" font-weight="700">${center}</text><text class="ax" x="70" y="84" text-anchor="middle" font-size="9">${sub||''}</text></svg>`}
const legend=it=>`<div class="lg">${it.map(x=>`<div><i style="background:${x.c}"></i>${esc(x.l)} <b>${esc(x.t||x.v)}</b></div>`).join('')}</div>`;
function hbars(items,fmt){if(!items.length)return'<p class="mu">No data yet.</p>';const mx=Math.max(1,...items.map(x=>x.v));
  return items.map((x,k)=>`<div class="hb"><span class="hl" title="${esc(x.l)}">${esc(x.l)}</span><div class="hbt"><i style="width:${Math.max(2,x.v/mx*100)}%;background:${x.c||PAL[k%8]}"></i></div><b>${fmt(x.v)}</b></div>`).join('')}
function monthly(m){const W=720,H=250,L=46,B=28,T=14,n=m.length,gw=(W-L-8)/n,mx=Math.max(1,...m.flatMap(x=>[x.a,x.b])),ch=H-B-T,y=v=>T+ch-(v/mx)*ch;let g='';
  for(let k=0;k<=4;k++){const v=mx*k/4,yy=y(v);g+=`<line class="gl" x1="${L}" x2="${W-8}" y1="${yy}" y2="${yy}"/><text class="ax" x="${L-6}" y="${yy+3}" text-anchor="end" font-size="10">${fmtK(v)}</text>`}
  const bars=m.map((x,k)=>{const cx=L+gw*k+gw/2,bw=Math.min(18,gw/3);
    return`<g><rect class="bar" x="${cx-bw-1}" y="${y(x.a)}" width="${bw}" height="${T+ch-y(x.a)}" rx="3" fill="url(#gA)"><title>${x.l} invoiced: ${money(x.a)}</title></rect><rect class="bar" x="${cx+1}" y="${y(x.b)}" width="${bw}" height="${T+ch-y(x.b)}" rx="3" fill="url(#gB)"><title>${x.l} collected: ${money(x.b)}</title></rect><text class="ax" x="${cx}" y="${H-10}" text-anchor="middle" font-size="10">${x.s}</text></g>`}).join('');
  return`<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Monthly invoiced and collected"><defs><linearGradient id="gA" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2e8be6"/><stop offset="1" stop-color="#0b5cab"/></linearGradient><linearGradient id="gB" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#3fcf7f"/><stop offset="1" stop-color="#1a8f4c"/></linearGradient></defs>${g}${bars}</svg>`}
function dashData(){const p=DASH.p,all=DB.invoices,live=all.filter(i=>!['Draft','Cancelled'].includes(status(i))),sum=(a,f)=>a.reduce((s,x)=>s+f(x),0),
  per=live.filter(i=>inPeriod(i.date,p)).map(i=>({i,t:calc(i),s:status(i)}));
  const K={inv:sum(per,x=>x.t.total),col:sum(per,x=>x.t.paid),out:sum(per,x=>Math.max(0,x.t.due)),ov:sum(per.filter(x=>x.s==='Overdue'),x=>Math.max(0,x.t.due)),n:per.length};
  const now=new Date(),M=[];for(let k=11;k>=0;k--){const d=new Date(now.getFullYear(),now.getMonth()-k,1);M.push({key:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'),s:MON[d.getMonth()],l:MON[d.getMonth()]+' '+d.getFullYear(),a:0,b:0})}
  live.forEach(i=>{const m=M.find(x=>x.key===(i.date||'').slice(0,7));if(m)m.a+=calc(i).total;(i.pay||[]).forEach(q=>{const mm=M.find(x=>x.key===(q.date||'').slice(0,7));if(mm)mm.b+=+q.amt||0})});
  const st={};all.filter(i=>inPeriod(i.date,p)).forEach(i=>{const s=status(i);st[s]=(st[s]||0)+1});
  const cat={},cli={},tst={};per.forEach(({i,t})=>{cli[i.client||'—']=(cli[i.client||'—']||0)+t.total;i.items.forEach(x=>{const r=DB.rates.find(r=>r.code&&r.code===x.code),v=(+x.qty||0)*(+x.rate||0),c=r?(r.cat||'Other'):'Custom items',k=r?r.code+' · '+r.test:(x.desc||'Custom item');cat[c]=(cat[c]||0)+v;const o=tst[k]=tst[k]||{n:0,v:0};o.n+=+x.qty||0;o.v+=v})});
  const top=(o,n)=>Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,n).map(([l,v])=>({l,v}));
  const mth={};live.forEach(i=>(i.pay||[]).forEach(q=>{if(inPeriod(q.date,p)){const k=q.method||'Other';mth[k]=(mth[k]||0)+(+q.amt||0)}}));
  const ag=[['Not yet due',0,'#1a8f4c'],['1–30 days',0,'#c27a00'],['31–60 days',0,'#e67e22'],['61–90 days',0,'#c0392b'],['90+ days',0,'#7b1d14']];
  live.forEach(i=>{const d=calc(i).due;if(d<=0.005)return;const od=i.due?Math.floor((Date.now()-new Date(i.due))/864e5):0;ag[od<=0?0:od<=30?1:od<=60?2:od<=90?3:4][1]+=d});
  return{K,M,st,cat:top(cat,8),cli:top(cli,8),tst:Object.entries(tst).sort((a,b)=>b[1].v-a[1].v).slice(0,7),mth:top(mth,6),ag,drafts:all.filter(i=>i.status==='Draft').length}}
function vDash(){const D=dashData(),K=D.K,rate=K.col+K.out?K.col/(K.col+K.out):0,hr=new Date().getHours(),greet=hr<12?'Good morning':hr<17?'Good afternoon':'Good evening',dr=(DB.delReq||[]).length;
  const sti=Object.keys(STC).map(l=>({l,v:D.st[l]||0,c:STC[l]})),nInv=sti.reduce((a,x)=>a+x.v,0),mi=D.mth.map((x,k)=>({l:x.l,v:x.v,c:PAL[k%8],t:money(x.v)})),mtot=D.mth.reduce((a,x)=>a+x.v,0),tmax=Math.max(1,...D.tst.map(x=>x[1].v));
  $('#app').innerHTML=`<div class="dash-h"><div><h2>${greet}, ${esc((SES.user.name||'').split(' ')[0])}</h2><span class="mu">${PLAB[DASH.p]} · ${new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</span></div><span class="sp"></span>
  <select style="max-width:160px" onchange="DASH.p=this.value;vDash()">${Object.entries(PLAB).map(([k,l])=>`<option value="${k}" ${DASH.p==k?'selected':''}>${l}</option>`).join('')}</select>${can('write')?`<button onclick="cur=newInv();go('edit')">+ New invoice</button>`:''}</div>
  ${can('admin')&&(PEND||dr)?`<div class="alertbar">${PEND?`<span>⏳ <b>${PEND}</b> registration${PEND>1?'s':''} awaiting approval <button class="g" onclick="go('users')">Review</button></span>`:''}${dr?`<span>🗑 <b>${dr}</b> delete request${dr>1?'s':''} <button class="g" onclick="go('invoices')">Review</button></span>`:''}</div>`:''}
  <div class="kpis"><div class="kpi k1"><span class="ic">💰</span><small>Total invoiced</small><b>${money(K.inv)}</b><small>${K.n} invoice${K.n==1?'':'s'}</small></div>
  <div class="kpi k2"><span class="ic">✅</span><small>Collected</small><b>${money(K.col)}</b><small>${(rate*100).toFixed(0)}% collection rate</small></div>
  <div class="kpi k3"><span class="ic">⏳</span><small>Outstanding</small><b>${money(K.out)}</b><small>awaiting payment</small></div>
  <div class="kpi k4"><span class="ic">⚠️</span><small>Overdue</small><b>${money(K.ov)}</b><small>past due date</small></div>
  <div class="kpi k5"><span class="ic">🧾</span><small>Average invoice</small><b>${money(K.n?K.inv/K.n:0)}</b><small>${D.drafts} draft${D.drafts==1?'':'s'}</small></div></div>
  <div class="dgrid">
  <div class="dc c8"><h3>Revenue – last 12 months</h3>${monthly(D.M)}<div class="lg" style="justify-content:center"><div><i style="background:#0b5cab"></i>Invoiced</div><div><i style="background:#1a8f4c"></i>Collected</div></div></div>
  <div class="dc c4"><h3>Invoice status</h3><div class="donutw">${donut(sti,nInv,'invoices')}${legend(sti.map(x=>({...x,t:x.v})))}</div></div>
  <div class="dc c4"><h3>Collection rate</h3><div class="donutw">${donut([{l:'Collected',v:K.col,c:'#1a8f4c',t:money(K.col)},{l:'Outstanding',v:K.out,c:'#c27a00',t:money(K.out)}],(rate*100).toFixed(0)+'%','collected')}${legend([{l:'Collected',c:'#1a8f4c',t:money(K.col)},{l:'Outstanding',c:'#c27a00',t:money(K.out)}])}</div></div>
  <div class="dc c4"><h3>Outstanding ageing</h3>${hbars(D.ag.map(x=>({l:x[0],v:x[1],c:x[2]})),fmtK)}</div>
  <div class="dc c4"><h3>Payment methods</h3><div class="donutw">${donut(mi,fmtK(mtot),'received')}${legend(mi)}</div></div>
  <div class="dc c6"><h3>Billed value by test category</h3>${hbars(D.cat,fmtK)}</div>
  <div class="dc c6"><h3>Top clients</h3>${hbars(D.cli,fmtK)}</div>
  <div class="dc c6"><h3>Most requested tests</h3>${D.tst.length?`<div class="tw"><table><tr><th>Test</th><th class="r">Qty</th><th class="r">Value</th></tr>${D.tst.map(([l,o])=>`<tr><td><div style="font-size:12px">${esc(l)}</div><div class="hbt" style="margin-top:3px;height:6px"><i style="width:${Math.max(2,o.v/tmax*100)}%;background:var(--pr)"></i></div></td><td class="r">${o.n}</td><td class="r">${fmtK(o.v)}</td></tr>`).join('')}</table></div>`:'<p class="mu">No data yet.</p>'}</div>
  <div class="dc c6"><h3>Recent invoices</h3>${DB.invoices.length?`<div class="tw"><table><tr><th>No.</th><th>Client</th><th class="r">Total</th><th>Status</th></tr>${DB.invoices.slice(0,8).map(i=>`<tr style="cursor:pointer" onclick="openInv('${esc(i.id)}','preview')"><td>${esc(i.no)}</td><td>${esc(i.client)}</td><td class="r">${money(calc(i).total)}</td><td><span class="tag ${status(i)}">${status(i)}</span></td></tr>`).join('')}</table></div>`:'<p class="mu">No invoices yet. Create your first one with “+ New invoice”.</p>'}</div>
  </div>`}

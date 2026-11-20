/* Reports: customisable A4 reports with live preview, Print / Save as PDF (browser) and direct PDF download. */
const HTML2PDF='https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
const RSEC=[['summary','Executive summary (KPIs)'],['monthly','Monthly revenue & collection (chart + table)'],['status','Status breakdown'],['register','Invoice register'],['payments','Payments received'],['ageing','Outstanding & ageing'],['tests','Test-wise analysis'],['category','Category-wise analysis'],['clients','Client-wise summary']];
const RPRE={'Management summary':['summary','monthly','status','category','clients'],'Invoice register':['summary','register'],'Collection report':['summary','payments'],'Receivables / ageing':['summary','ageing'],'Test-wise analysis':['summary','tests','category'],'Client statement':['summary','register','payments','ageing']};
const RPER={month:'This month',lastmonth:'Last month',quarter:'This quarter',year:'This year',lastyear:'Last year',all:'All time',custom:'Custom range'};
let RPT={title:'Management Report',sub:'',period:'year',from:'',to:'',status:'issued',client:'',sec:{summary:1,monthly:1,status:1,register:1},land:false,pad:false,sign:false,by:'',remarks:''};
const fd=d=>d?new Date(d+'T00:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—';
const rtag=s=>`<span class="rtag" style="background:${STC[s]||'#555'}">${s}</span>`;
function rtbl(head,al,rows,tot){return`<table class="rt"><thead><tr>${head.map((h,k)=>`<th class="${al[k]||''}">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,k)=>`<td class="${al[k]||''}">${c}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${head.length}" class="c" style="padding:14px;color:#889">No records for the selected filters.</td></tr>`}${tot?`<tr class="tot">${tot.map((c,k)=>`<td class="${al[k]||''}">${c}</td>`).join('')}</tr>`:''}</tbody></table>`}
function rptRange(){const t=new Date(),y=t.getFullYear(),m=t.getMonth(),iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),D=(a,b,c)=>new Date(a,b,c),p=RPT.period;
  if(p==='month')return[iso(D(y,m,1)),iso(D(y,m+1,0))];if(p==='lastmonth')return[iso(D(y,m-1,1)),iso(D(y,m,0))];
  if(p==='quarter'){const q=Math.floor(m/3)*3;return[iso(D(y,q,1)),iso(D(y,q+3,0))]}
  if(p==='year')return[y+'-01-01',y+'-12-31'];if(p==='lastyear')return[(y-1)+'-01-01',(y-1)+'-12-31'];
  if(p==='custom')return[RPT.from||'0000-01-01',RPT.to||'9999-12-31'];return['0000-01-01','9999-12-31']}
function rptData(){const[a,b]=rptRange(),st=RPT.status,cl=RPT.client,ok=i=>{const s=status(i);return(st==='issued'?!['Draft','Cancelled'].includes(s):st==='all'?true:s===st)&&(!cl||i.client===cl)};
  const inv=DB.invoices.filter(i=>ok(i)&&(i.date||'')>=a&&(i.date||'')<=b).map(i=>({i,t:calc(i),s:status(i)})),pays=[];
  DB.invoices.filter(i=>(!cl||i.client===cl)&&!['Draft','Cancelled'].includes(status(i))).forEach(i=>(i.pay||[]).forEach(p=>{if((p.date||'')>=a&&(p.date||'')<=b)pays.push({i,p})}));
  pays.sort((x,y)=>x.p.date.localeCompare(y.p.date));return{a,b,inv,pays}}
const SECF={
summary:D=>{const T=D.inv,sm=f=>T.reduce((a,x)=>a+f(x),0),tot=sm(x=>x.t.total),col=sm(x=>x.t.paid),out=sm(x=>Math.max(0,x.t.due)),k=(l,v,c)=>`<div class="rk ${c||''}"><small>${l}</small><b>${v}</b></div>`;
  return['Executive summary',`<div class="rkpis">${k('Invoices',T.length)}${k('Total invoiced (incl. VAT)',money(tot),'b')}${k('Net amount (excl. VAT)',money(sm(x=>x.t.base)))}${k('VAT',money(sm(x=>x.t.tx)))}${k('Discount',money(sm(x=>x.t.disc)))}${k('Collected',money(col),'g')}${k('AIT / TDS deducted',money(sm(x=>x.t.ait)))}${k('Outstanding',money(out),'o')}${k('Overdue',money(sm(x=>x.s==='Overdue'?Math.max(0,x.t.due):0)),'r')}${k('Collection rate',(col+out?col/(col+out)*100:0).toFixed(1)+'%')}</div>`]},
monthly:D=>{const M={};D.inv.forEach(({i,t})=>{const k=i.date.slice(0,7),o=M[k]=M[k]||{a:0,b:0,n:0};o.a+=t.total;o.n++});D.pays.forEach(({p})=>{const k=p.date.slice(0,7),o=M[k]=M[k]||{a:0,b:0,n:0};o.b+=+p.amt||0});
  const arr=Object.keys(M).sort().map(k=>({s:MON[+k.slice(5)-1],l:MON[+k.slice(5)-1]+' '+k.slice(0,4),a:M[k].a,b:M[k].b,n:M[k].n})),sm=f=>arr.reduce((a,x)=>a+f(x),0);
  return['Monthly revenue & collection',(arr.length?monthly(arr)+'<div class="rleg"><i style="background:#0b5cab"></i>Invoiced <i style="background:#1a8f4c"></i>Collected</div>':'')+rtbl(['Month','Invoices','Invoiced','Collected'],['','r','r','r'],arr.map(x=>[x.l,x.n,money(x.a),money(x.b)]),arr.length?['Total',sm(x=>x.n),money(sm(x=>x.a)),money(sm(x=>x.b))]:null)]},
status:D=>{const O=['Paid','Partial','Sent','Overdue','Draft','Cancelled'],g={};D.inv.forEach(x=>{const o=g[x.s]=g[x.s]||{n:0,t:0,b:0};o.n++;o.t+=x.t.total;o.b+=Math.max(0,x.t.due)});
  const ks=O.filter(s=>g[s]),it=ks.map(s=>({l:s,v:g[s].n,c:STC[s],t:g[s].n}));
  return['Status breakdown',`<div class="rflex">${it.length?`<div>${donut(it,D.inv.length,'invoices')}</div>`:''}<div style="flex:1">${rtbl(['Status','Invoices','Amount','Balance due'],['','r','r','r'],ks.map(s=>[rtag(s),g[s].n,money(g[s].t),money(g[s].b)]),['Total',D.inv.length,money(D.inv.reduce((a,x)=>a+x.t.total,0)),money(D.inv.reduce((a,x)=>a+Math.max(0,x.t.due),0))])}</div></div>`]},
register:D=>{const L=RPT.land,rows=D.inv.slice().sort((a,b)=>a.i.date.localeCompare(b.i.date)||a.i.no.localeCompare(b.i.no)).map(({i,t,s})=>[esc(i.no),fd(i.date),esc(i.client),...(L?[esc(i.project||'')]:[]),esc(i.crtc||'—'),money(t.total),money(t.paid),money(Math.max(0,t.due)),rtag(s)]),
  head=['Invoice no.','Date','Client',...(L?['Project']:[]),'CRTC No.','Total','Paid','Balance','Status'],al=['','','',...(L?['']:[]),'','r','r','r','c'],sm=f=>money(D.inv.reduce((a,x)=>a+f(x),0));
  return['Invoice register',rtbl(head,al,rows,['Total ('+D.inv.length+')','','',...(L?['']:[]),'',sm(x=>x.t.total),sm(x=>x.t.paid),sm(x=>Math.max(0,x.t.due)),''])]},
payments:D=>{const sum=D.pays.reduce((a,x)=>a+(+x.p.amt||0),0),bm={};D.pays.forEach(({p})=>{const k=p.method||'Other';bm[k]=(bm[k]||0)+(+p.amt||0)});
  return['Payments received',rtbl(['Date','Invoice','Client','Method','Reference','Checked by','Amount'],['','','','','','','r'],D.pays.map(({i,p})=>[fd(p.date),esc(i.no),esc(i.client),esc(p.method||''),esc(p.ref||'—'),esc(p.by||'—'),money(p.amt)]),['Total ('+D.pays.length+')','','','','','',money(sum)])+(Object.keys(bm).length?`<p class="rnote"><b>By method:</b> ${Object.entries(bm).map(([k,v])=>esc(k)+' '+money(v)).join(' · ')}</p>`:'')]},
ageing:D=>{const B=[['Not yet due',0,0],['1–30 days',0,0],['31–60 days',0,0],['61–90 days',0,0],['90+ days',0,0]],rows=[];
  D.inv.filter(x=>x.t.due>0.005&&!['Draft','Cancelled'].includes(x.s)).forEach(({i,t})=>{const od=i.due?Math.floor((Date.now()-new Date(i.due+'T00:00:00'))/864e5):0,k=od<=0?0:od<=30?1:od<=60?2:od<=90?3:4;B[k][1]++;B[k][2]+=t.due;rows.push({i,od,d:t.due})});rows.sort((a,b)=>b.od-a.od);
  return['Outstanding & ageing',rtbl(['Ageing bucket','Invoices','Balance due'],['','r','r'],B.map(b=>[b[0],b[1],money(b[2])]),['Total',B.reduce((a,b)=>a+b[1],0),money(B.reduce((a,b)=>a+b[2],0))])+'<div style="height:10px"></div>'+rtbl(['Invoice','Client','Due date','Days overdue','Balance due'],['','','','r','r'],rows.map(r=>[esc(r.i.no),esc(r.i.client),fd(r.i.due),r.od>0?r.od:'—',money(r.d)]),null)]},
tests:D=>{const g={};D.inv.forEach(({i})=>i.items.forEach(x=>{const r=DB.rates.find(r=>r.code&&r.code===x.code),k=r?r.code:'~'+(x.desc||'Custom'),o=g[k]=g[k]||{c:r?r.code:'—',t:r?r.test:(x.desc||'Custom item'),n:0,v:0};o.n+=+x.qty||0;o.v+=(+x.qty||0)*(+x.rate||0)}));
  const L=Object.values(g).sort((a,b)=>b.v-a.v),sv=L.reduce((a,x)=>a+x.v,0);
  return['Test-wise analysis',rtbl(['Code','Test','Qty','Billed value','Share'],['','','r','r','r'],L.map(x=>[esc(x.c),esc(x.t),x.n,money(x.v),(sv?x.v/sv*100:0).toFixed(1)+'%']),['','Total',L.reduce((a,x)=>a+x.n,0),money(sv),'100%'])]},
category:D=>{const g={};D.inv.forEach(({i})=>i.items.forEach(x=>{const r=DB.rates.find(r=>r.code&&r.code===x.code),c=r?(r.cat||'Other'):'Custom items',o=g[c]=g[c]||{n:0,v:0};o.n+=+x.qty||0;o.v+=(+x.qty||0)*(+x.rate||0)}));
  const L=Object.entries(g).sort((a,b)=>b[1].v-a[1].v),sv=L.reduce((a,x)=>a+x[1].v,0),mx=Math.max(1,...L.map(x=>x[1].v));
  return['Category-wise analysis',rtbl(['Category','Qty','Billed value','Share',''],['','r','r','r',''],L.map(([c,o])=>[esc(c),o.n,money(o.v),(sv?o.v/sv*100:0).toFixed(1)+'%',`<span class="mb"><i style="width:${o.v/mx*100}%"></i></span>`]),['Total',L.reduce((a,x)=>a+x[1].n,0),money(sv),'100%',''])]},
clients:D=>{const g={};D.inv.forEach(({i,t})=>{const k=i.client||'—',o=g[k]=g[k]||{n:0,a:0,p:0,d:0};o.n++;o.a+=t.total;o.p+=t.paid;o.d+=Math.max(0,t.due)});
  const L=Object.entries(g).sort((a,b)=>b[1].a-a[1].a),sm=f=>money(L.reduce((a,x)=>a+f(x[1]),0));
  return['Client-wise summary',rtbl(['Client','Invoices','Billed','Collected','Outstanding'],['','r','r','r','r'],L.map(([c,o])=>[esc(c),o.n,money(o.a),money(o.p),money(o.d)]),['Total',L.reduce((a,x)=>a+x[1].n,0),sm(o=>o.a),sm(o=>o.p),sm(o=>o.d)])]}};
function rptDraw(){const e=$('#rdoc');if(!e)return;const D=rptData(),s=DB.settings,me=(SES&&SES.user.name)||'—',now=new Date(),ref='R-'+now.toISOString().slice(2,10).replace(/-/g,'')+'-'+String(now.getHours()).padStart(2,'0')+String(now.getMinutes()).padStart(2,'0'),
  per=RPT.period==='all'?'All dates':fd(D.a)+' – '+fd(D.b),stl={issued:'Issued (excl. Draft & Cancelled)',all:'All statuses'}[RPT.status]||RPT.status;let n=0;
  const body=RSEC.filter(([k])=>RPT.sec[k]).map(([k])=>{const r=SECF[k](D);return`<div class="rsec"><h3><span>${++n}</span>${r[0]}</h3>${r[1]}</div>`}).join('')||'<p class="rnote">Select at least one section.</p>';
  e.className='rdoc'+(RPT.land?' land':'');
  e.innerHTML=`${RPT.pad?`<div style="height:${+s.padTop||45}mm"></div>`:`<div class="rlh">${s.logo?`<img src="${s.logo}" style="max-height:48px" alt="">`:`<img src="assets/logo.svg" style="height:40px" alt="">`}<div><b style="font-size:14px">${esc(s.company)}</b><br>${esc(s.address)}${s.phone?' · '+esc(s.phone):''}${s.email?' · '+esc(s.email):''}${s.bin||s.tin?`<br>${s.bin?'BIN: '+esc(s.bin):''} ${s.tin?'TIN: '+esc(s.tin):''}`:''}</div></div>`}
  <div class="rtitle"><h1>${esc(RPT.title||'Report')}</h1>${RPT.sub?`<div class="rsub">${esc(RPT.sub)}</div>`:''}<div class="rmeta">Period: <b>${per}</b> · Status: <b>${esc(stl)}</b> · Client: <b>${esc(RPT.client||'All clients')}</b><br>Report ref: ${ref} · Generated by <b>${esc(me)}</b> on ${now.toLocaleString('en-GB')}</div></div>
  ${body}${RPT.remarks?`<div class="rsec"><h3>Remarks</h3><p class="rnote" style="white-space:pre-wrap">${esc(RPT.remarks)}</p></div>`:''}
  ${RPT.sign?`<div class="rsign"><div><span>${esc(me)}</span>Prepared by</div><div><span>${esc(RPT.by||' ')}</span>Checked by</div><div><span>&nbsp;</span>Approved by</div></div>`:''}
  <div class="rfoot">${esc(s.company)} · CRTC Invoice System · ${ref}</div>`;rptFit()}
function rptFit(){const e=$('#rdoc'),w=$('#rwrap');if(!e||!w||!w.clientWidth)return;e.style.zoom=Math.min(1,(w.clientWidth-30)/(RPT.land?1123:794))}
window.addEventListener&&window.addEventListener('resize',rptFit);
function vReports(){const cl=[...new Set(DB.invoices.map(i=>i.client).filter(Boolean))].sort(),P=DB.rptPresets||[],o=(v,l,cur)=>`<option value="${esc(v)}" ${cur==v?'selected':''}>${esc(l)}</option>`;
  $('#app').innerHTML=`<div class="rlay"><div class="rpanel noprint"><h3>Report builder</h3>
  <label>Quick templates</label><div class="rq">${Object.keys(RPRE).map((k,j)=>`<button class="g" onclick="rptPre(${j})">${k}</button>`).join('')}</div>
  <label>Report title</label><input value="${esc(RPT.title)}" oninput="RPT.title=this.value;rptDraw()">
  <label>Subtitle / reference</label><input value="${esc(RPT.sub)}" oninput="RPT.sub=this.value;rptDraw()">
  <label>Period</label><select onchange="RPT.period=this.value;vReports()">${Object.entries(RPER).map(([k,l])=>o(k,l,RPT.period)).join('')}</select>
  ${RPT.period==='custom'?`<div class="row" style="margin:6px 0 0"><input type="date" value="${RPT.from}" oninput="RPT.from=this.value;rptDraw()"><input type="date" value="${RPT.to}" oninput="RPT.to=this.value;rptDraw()"></div>`:''}
  <label>Invoice status</label><select onchange="RPT.status=this.value;rptDraw()">${[['issued','Issued (excl. Draft & Cancelled)'],['all','All statuses'],['Paid','Paid'],['Partial','Partially paid'],['Sent','Sent (unpaid)'],['Overdue','Overdue'],['Draft','Draft'],['Cancelled','Cancelled']].map(([v,l])=>o(v,l,RPT.status)).join('')}</select>
  <label>Client</label><select onchange="RPT.client=this.value;rptDraw()">${o('','All clients',RPT.client)}${cl.map(c=>o(c,c,RPT.client)).join('')}</select>
  <label>Sections</label>${RSEC.map(([k,l])=>`<label class="chk"><input type="checkbox" ${RPT.sec[k]?'checked':''} onchange="RPT.sec['${k}']=this.checked?1:0;rptDraw()"> ${l}</label>`).join('')}
  <label>Page layout</label><select onchange="RPT.land=this.value==='1';rptDraw()">${o('0','A4 portrait',RPT.land?'1':'0')}${o('1','A4 landscape (wider tables)',RPT.land?'1':'0')}</select>
  <label class="chk"><input type="checkbox" ${RPT.pad?'checked':''} onchange="RPT.pad=this.checked;rptDraw()"> Official pad (leave letterhead space)</label>
  <label class="chk"><input type="checkbox" ${RPT.sign?'checked':''} onchange="RPT.sign=this.checked;rptDraw()"> Include signature block</label>
  <label>Checked by (signature block)</label><select onchange="RPT.by=this.value;rptDraw()">${o('','— select —',RPT.by)}${checkers(RPT.by).map(n=>o(n,n,RPT.by)).join('')}</select>
  <label>Remarks</label><textarea rows="3" oninput="RPT.remarks=this.value;rptDraw()">${esc(RPT.remarks)}</textarea>
  <label>Saved templates</label><div class="row" style="margin:0"><select id="rps" style="flex:1"><option value="">Select…</option>${P.map((x,j)=>`<option value="${j}">${esc(x.name)}</option>`).join('')}</select><button class="g" onclick="rptLoad()">Load</button><button class="g" onclick="rptDelPre()">✕</button></div>
  <div class="row" style="margin:8px 0 0"><button class="g" onclick="rptSave()">Save current settings as template</button></div>
  <div class="row" style="margin:14px 0 0"><button onclick="window.print()">🖨 Print / Save PDF</button><button onclick="rptPDF()">⬇ Download PDF</button></div>
  <p class="mu" style="font-size:12px">Tip: for long reports use <b>Print / Save PDF</b> (choose A4, margins default, headers and footers off). Chrome or Edge recommended.</p></div>
  <div class="rwrap" id="rwrap"><div id="rdoc" class="rdoc"></div></div></div>`;rptDraw()}
function rptPre(j){const k=Object.keys(RPRE)[j];RPT.sec=Object.fromEntries(RPRE[k].map(x=>[x,1]));RPT.title=k==='Client statement'?'Client Statement':k==='Management summary'?'Management Report':k;vReports()}
function rptSave(){if(!can('write'))return alert('Only users who can edit data can save templates.');const n=(prompt('Template name:')||'').trim();if(!n)return;
  DB.rptPresets=(DB.rptPresets||[]).filter(x=>x.name!==n).concat({name:n,cfg:structuredClone(RPT)});persist();vReports()}
function rptLoad(){const j=$('#rps').value;if(j==='')return;RPT={...RPT,...structuredClone(DB.rptPresets[+j].cfg)};vReports()}
function rptDelPre(){const j=$('#rps').value;if(j===''||!can('write')||!confirm('Delete this template?'))return;DB.rptPresets.splice(+j,1);persist();vReports()}
function loadLib(src){return new Promise((ok,no)=>{if(window.html2pdf)return ok();const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>no(new Error('Could not load the PDF library (internet needed). Use "Print / Save PDF" instead.'));document.head.appendChild(s)})}
async function rptPDF(){const e=$('#rdoc');if(!e)return;loader('Generating PDF…');const z=e.style.zoom;
  try{await loadLib(HTML2PDF);e.style.zoom=1;e.classList.add('pdfing');await new Promise(r=>setTimeout(r,60));
    const pages=Math.max(1,e.scrollHeight/((RPT.land?210:297)*3.78)),sc=pages>12?1:pages>8?1.3:pages>5?1.6:2;
    await html2pdf().set({margin:[12,0,14,0],filename:'CRTC_Report_'+new Date().toISOString().slice(0,10)+'.pdf',image:{type:'jpeg',quality:.95},html2canvas:{scale:sc,useCORS:true,backgroundColor:'#ffffff',scrollY:0},jsPDF:{unit:'mm',format:'a4',orientation:RPT.land?'landscape':'portrait'},pagebreak:{mode:['css','legacy'],avoid:['tr','.rk','.rsec h3','.rsign']}})
      .from(e).toPdf().get('pdf').then(pdf=>{const n=pdf.internal.getNumberOfPages(),w=pdf.internal.pageSize.getWidth(),h=pdf.internal.pageSize.getHeight();for(let p=1;p<=n;p++){pdf.setPage(p);pdf.setFontSize(8);pdf.setTextColor(120);pdf.text('Page '+p+' of '+n,w/2,h-6,{align:'center'})}}).save();
  }catch(x){alert((x&&x.message)||'PDF generation failed. Use "Print / Save PDF" instead.')}finally{e.classList.remove('pdfing');e.style.zoom=z;unloader()}}

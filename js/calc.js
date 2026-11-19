/* Business logic: totals (VAT-inclusive/exclusive, AIT), status, amount in words, record hash, data migration. */
const calc=i=>{const sub=i.items.reduce((s,x)=>s+(+x.qty||0)*(+x.rate||0),0),disc=sub*(+i.disc||0)/100,g=sub-disc,r=(+i.tax||0)/100,base=i.incl?g/(1+r):g,tx=i.incl?g-base:g*r,total=base+tx,ait=base*(+i.ait||0)/100,paid=(i.pay||[]).reduce((a,p)=>a+(+p.amt||0),0);return{sub,disc,base,tx,total,ait,paid,due:total-ait-paid}};
const status=i=>{if(i.status==='Draft'||i.status==='Cancelled')return i.status;const t=calc(i);if(t.total>0&&t.due<=0.005)return'Paid';return i.due&&i.due<today()?'Overdue':t.paid>0?'Partial':'Sent'};
const today=()=>new Date().toISOString().slice(0,10);
function mig(){const s=DB.settings;if(DB.rates.some(r=>r.code==='C-01'&&r.rate===15)&&DB.rates.length<=21)DB.rates=RT(CRTC_RATES);if(s.currency==='$'||!s.currency){s.currency='৳';if(!+s.tax)s.tax=15}
  DB.invoices.forEach(i=>{if(!i.pay)i.pay=[];if(i.status==='Paid'&&!i.pay.length){const t=calc(i);i.pay.push({date:i.date,method:'Bank transfer',ref:'',amt:t.total-t.ait});i.status='Sent'}})}
function words(n){let t=Math.floor(Math.round(n*100)/100),p=Math.round(n*100)%100;const a=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'],b=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const h=x=>x<20?a[x]:b[Math.floor(x/10)]+(x%10?' '+a[x%10]:''),th=x=>(x>99?a[Math.floor(x/100)]+' Hundred'+(x%100?' ':''):'')+(x%100?h(x%100):'');
  if(!t&&!p)return'Zero Taka Only';const o=[];[[1e7,'Crore'],[1e5,'Lakh'],[1e3,'Thousand']].forEach(([d,l])=>{const q=Math.floor(t/d);if(q){o.push(th(q)+' '+l);t%=d}});if(t)o.push(th(t));
  return 'Taka '+(o.join(' ')||'Zero')+(p?' and '+h(p)+' Paisa':'')+' Only'}
async function hash(i){const t=calc(i),str=[i.no,i.date,i.client,t.total.toFixed(2),i.items.map(x=>x.desc+x.qty+x.rate).join('|')].join('~');
  try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(str));return[...new Uint8Array(b)].slice(0,8).map(x=>x.toString(16).padStart(2,'0')).join('')}
  catch(e){let a=0xdeadbeef,b=0x41c6ce57;for(let k=0;k<str.length;k++){const c=str.charCodeAt(k);a=Math.imul(a^c,2654435761);b=Math.imul(b^c,1597334677)}a=Math.imul(a^a>>>16,2246822507)^Math.imul(b^b>>>13,3266489909);b=Math.imul(b^b>>>16,2246822507)^Math.imul(a^a>>>13,3266489909);return((b>>>0).toString(16).padStart(8,'0')+(a>>>0).toString(16).padStart(8,'0'))}}

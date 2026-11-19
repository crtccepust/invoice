/* Global helpers, default data model and application state. */
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const R=(code,test,std,unit,rate)=>({code,test,std,unit,rate});
const DEFAULT={settings:{company:'CRTC',address:'Address line, City',phone:'',email:'',currency:'৳',tax:15,taxName:'VAT',ait:0,bin:'',tin:'',logo:'',pad:false,padTop:45,padBottom:25,apiKey:'',verifyUrl:'',incl:true,prefix:'CRTC-',terms:'Payment due within 30 days. Results relate only to samples tested.',bank:'',bankName:'',accName:'CRTC',accNo:'',iban:'',swift:'',branch:''},
rates:RT(CRTC_RATES),
clients:[],invoices:[],next:1};
let DB=structuredClone(DEFAULT),view='invoices',cur=null,prev=null,SES=null,VER=0,timer=null,filter={q:'',st:''};
localStorage.removeItem('crtcDB');
const money=n=>(DB.settings.currency||'')+Number(n||0).toLocaleString('en-BD',{minimumFractionDigits:2,maximumFractionDigits:2});
const stat=m=>$('#sync').textContent=m;

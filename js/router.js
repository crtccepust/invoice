/* Navigation and view routing. */
function nav(){const T=[['dashboard','Dashboard'],['invoices','Invoices'+(can('admin')&&(DB.delReq||[]).length?' ('+DB.delReq.length+')':'')]];if(can('write'))T.push(['edit','New / Edit Invoice']);T.push(['rates','Test & Rate List']);if(can('write'))T.push(['clients','Clients']);if(can('admin'))T.push(['settings','Settings'],['users','Users'+(PEND?' ('+PEND+')':'')]);
  $('#nav').innerHTML=T.map(([k,l])=>`<button class="${view==k?'on':''}" onclick="go('${k}')">${l}</button>`).join('')}
function go(v){if(v==='edit'&&!can('write'))return;if((v==='settings'||v==='users')&&!can('admin'))return;if(v==='edit'&&!cur)cur=newInv();view=v;draw()}
function draw(){nav();({dashboard:vDash,invoices:vList,edit:vEdit,rates:vRates,clients:vClients,settings:vSet,users:vUsers,preview:vPrev})[view]()}

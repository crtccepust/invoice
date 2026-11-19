/* Clients view. */
function vClients(){
  $('#app').innerHTML=`<div class="row"><button onclick="DB.clients.push({name:'',addr:'',email:'',phone:''});persist();vClients()">+ Add client</button></div>
  <div class="tw"><table><tr><th>Name</th><th>Address</th><th>Email</th><th>Phone</th><th></th></tr>
  ${DB.clients.map((c,k)=>`<tr>${['name','addr','email','phone'].map(f=>`<td><input value="${esc(c[f])}" oninput="DB.clients[${k}].${f}=this.value;persist()"></td>`).join('')}<td><button class="g" onclick="DB.clients.splice(${k},1);persist();vClients()">✕</button></td></tr>`).join('')||'<tr><td colspan=5>No clients yet.</td></tr>'}</table></div>`}

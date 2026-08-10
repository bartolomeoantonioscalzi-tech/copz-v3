const LS={get:k=>localStorage.getItem(k),set:(k,v)=>localStorage.setItem(k,v),obj:k=>{const s=LS.get(k);return s?JSON.parse(s):null},setObj:(k,v)=>LS.set(k,JSON.stringify(v))};
let contacts=[],onomastici=[],settings={};
const $=q=>document.querySelector(q),$$=q=>document.querySelectorAll(q);

function loadSettings(){
  settings=LS.obj('copz_settings')||{ufName:'',ufRole:'Amico',csvEnc:'utf-8',showComm:false};
  $('#uf-name').value=settings.ufName||'';
  $('#uf-role').value=settings.ufRole||'Amico';
  $('#csv-enc').value=settings.csvEnc||'utf-8';
  $('#chk-comm').checked=!!settings.showComm;
}
function saveSettings(){
  settings={ufName:$('#uf-name').value.trim(),ufRole:$('#uf-role').value.trim(),csvEnc:$('#csv-enc').value,showComm:$('#chk-comm').checked};
  LS.setObj('copz_settings',settings);
}
function renderVars(){
  const v=MSG.load();
  const mk=(arr,container,type)=>{
    container.innerHTML='';
    arr.forEach((txt,i)=>{
      const row=document.createElement('div');row.className='var-row';
      row.innerHTML='<span class="num">'+(i+1)+'</span><input data-type="'+type+'" data-idx="'+i+'" value="'+txt.replace(/"/g,'&quot;')+'">';
      container.appendChild(row);
    });
  };
  mk(v.bday,$('#vars-bday'),'bday');
  mk(v.onom,$('#vars-onom'),'onom');
  mk(v.comm,$('#vars-comm'),'comm');
}
function saveVars(){
  const v=MSG.load();
  $$('#vars-bday input').forEach((inp,i)=>v.bday[i]=inp.value);
  $$('#vars-onom input').forEach((inp,i)=>v.onom[i]=inp.value);
  $$('#vars-comm input').forEach((inp,i)=>v.comm[i]=inp.value);
  MSG.save(v);
}

function getSentKey(){const t=M.getToday();return'copz_sent_'+t.g+'_'+t.m+'_'+t.y;}
function getSent(){return LS.obj(getSentKey())||[];}
function markSent(id){const s=getSent();if(!s.includes(id)){s.push(id);LS.setObj(getSentKey(),s);}renderTab();}
function isSent(id){return getSent().includes(id);}

function buildCard(item,type){
  const sent=isSent(item.id);
  const msg=MSG.build(type,item.contact,settings.ufName||'Tu',settings.ufRole||'Amico');
  const tel=item.contact.tel||'';
  const el=document.createElement('div');el.className='card';
  const icon=type==='bday'?'🎂':type==='comm'?'🕯️':'📅';
  const tag=type==='bday'?'Compleanno':type==='comm'?'Commemorativo':'Onomastico';
  const meta=type==='bday'?(item.contact.bday||''):type==='onom'?(item.onomastico.day+'/'+item.onomastico.month):'';
  let html='<div class="icon">'+icon+'</div><div class="info"><div class="name">'+item.contact.name+'</div>';
  html+='<div class="meta"><span class="tag">'+tag+'</span>'+(meta?meta:'')+'</div>';
  html+='<div class="msg-preview">'+msg+'</div>';
  if(tel){
    html+='<div class="actions">';
    if(!sent){
      html+='<a class="btn-tg" href="'+MSG.link('tg',tel,msg)+'" target="_blank" onclick="markSent(''+item.id+'')">TG</a>';
      html+='<a class="btn-wa" href="'+MSG.link('wa',tel,msg)+'" target="_blank" onclick="markSent(''+item.id+'')">WA</a>';
      html+='<a class="btn-sms" href="'+MSG.link('sms',tel,msg)+'" onclick="markSent(''+item.id+'')">SMS</a>';
    }else{
      html+='<button class="btn-sent">✓ Inviato</button>';
    }
    html+='</div>';
  }else{html+='<div class="actions"><span style="color:#888;font-size:.8rem">Nessun numero</span></div>';}
  html+='</div>';
  el.innerHTML=html;
  return el;
}

function getItems(dayOffset){
  const d=M.getDateOffset(dayOffset);
  const items=[];
  // Compleanni
  for(const c of contacts){
    if(!c.bday)continue;
    const bd=c.bday.replace(/-/g,'');
    let g,m;
    if(bd.length===8){g=parseInt(bd.slice(4,6));m=parseInt(bd.slice(6,8));}
    else if(bd.includes('-')){const p=bd.split('-');g=parseInt(p[2]||p[0]);m=parseInt(p[1]);}
    else continue;
    if(g===d.g&&m===d.m){
      const comm=M.isCommemorative(c);
      if(comm&&dayOffset!==0)continue;
      if(comm&&!settings.showComm)continue;
      items.push({id:'bd_'+c.name+'_'+c.bday,contact:c,type:comm?'comm':'bday',onomastico:null});
    }
  }
  // Onomastici (solo oggi e domani, non ieri)
  if(dayOffset!==-1){
    const matches=M.matchOnomastici(contacts,onomastici.filter(o=>o.day===d.g&&o.month===d.m));
    for(const m of matches){
      items.push({id:'on_'+m.contact.name,contact:m.contact,type:'onom',onomastico:m.onomastico});
    }
  }
  // Ordine: compleanni prima, poi onomastici
  items.sort((a,b)=>{if(a.type==='bday'&&b.type!=='bday')return-1;if(b.type==='bday'&&a.type!=='bday')return 1;return a.contact.name.localeCompare(b.contact.name);});
  return items;
}

function renderTab(){
  const tab=$('#tabs .active').dataset.tab;
  const off=tab==='today'?0:tab==='yesterday'?-1:1;
  const items=getItems(off);
  const main=$('#main');main.innerHTML='';
  $('#badge').style.display=items.length?'inline':'none';
  $('#badge').textContent=items.length;
  if(!items.length){main.innerHTML='<div class="empty"><div class="empty-icon">🎉</div><div>Nessun evento per questa giornata</div></div>';return;}
  const c=document.createElement('div');c.id='counter';c.textContent=items.filter(x=>!isSent(x.id)).length+' da inviare / '+items.length+' totali';
  main.appendChild(c);
  for(const it of items)main.appendChild(buildCard(it,it.type));
}

async function handleFiles(){
  const vcf=$('#file-vcf').files[0];
  const csv=$('#file-csv').files[0];
  if(vcf){contacts=await P.parseVCF(vcf);LS.setObj('copz_contacts',contacts);}
  else{contacts=LS.obj('copz_contacts')||[];}
  if(csv){onomastici=await P.parseCSV(csv,settings.csvEnc);LS.setObj('copz_onomastici',onomastici);}
  else{onomastici=LS.obj('copz_onomastici')||[];}
  renderTab();
}

// Events
$('#btn-settings').onclick=()=>{$('#modal').classList.remove('hidden');renderVars();};
$('#btn-close').onclick=()=>$('#modal').classList.add('hidden');
$('#btn-save').onclick=()=>{saveSettings();saveVars();handleFiles();$('#modal').classList.add('hidden');};
$('#file-vcf').onchange=handleFiles;
$('#file-csv').onchange=handleFiles;
$$('#tabs button').forEach(b=>b.onclick=function(){$$('#tabs button').forEach(x=>x.classList.remove('active'));this.classList.add('active');renderTab();});

// Init
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
loadSettings();
contacts=LS.obj('copz_contacts')||[];
onomastici=LS.obj('copz_onomastici')||[];
renderTab();

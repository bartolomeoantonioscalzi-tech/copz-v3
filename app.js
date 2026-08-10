const LS={get:k=>localStorage.getItem(k),set:(k,v)=>localStorage.setItem(k,v),obj:k=>{const s=LS.get(k);try{return s?JSON.parse(s):null}catch(e){return null}},setObj:(k,v)=>LS.set(k,JSON.stringify(v))};
let contacts=[],onomastici=[],settings={};
let lastSendTime=0;
const $=q=>document.querySelector(q),$$=q=>document.querySelectorAll(q);

function esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function loadSettings(){
  settings=LS.obj('copz_settings')||{ufName:'',ufRole:'Amico',csvEnc:'utf-8',showComm:false};
  if(typeof settings!=='object'||settings===null) settings={ufName:'',ufRole:'Amico',csvEnc:'utf-8',showComm:false};
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
    if(!container)return;
    container.innerHTML='';
    if(!Array.isArray(arr))return;
    arr.forEach((txt,i)=>{
      const row=document.createElement('div');row.className='var-row';
      const num=document.createElement('span');num.className='num';num.textContent=String(i+1);
      const inp=document.createElement('input');
      inp.type='text';
      inp.dataset.type=type;
      inp.dataset.idx=String(i);
      inp.value=txt||'';
      row.appendChild(num);
      row.appendChild(inp);
      container.appendChild(row);
    });
  };
  mk(v.bday,$('#vars-bday'),'bday');
  mk(v.onom,$('#vars-onom'),'onom');
  mk(v.comm,$('#vars-comm'),'comm');
}
function saveVars(){
  const v=MSG.load();
  $$('#vars-bday input').forEach((inp,i)=>{if(v.bday[i]!==undefined)v.bday[i]=inp.value;});
  $$('#vars-onom input').forEach((inp,i)=>{if(v.onom[i]!==undefined)v.onom[i]=inp.value;});
  $$('#vars-comm input').forEach((inp,i)=>{if(v.comm[i]!==undefined)v.comm[i]=inp.value;});
  MSG.save(v);
}

function getSentKey(){const t=M.getToday();return'copz_sent_'+t.g+'_'+t.m+'_'+t.y;}
function getSent(){const s=LS.obj(getSentKey());return Array.isArray(s)?s:[];}
function markSent(id){const s=getSent();if(!s.includes(id)){s.push(id);LS.setObj(getSentKey(),s);}renderTab();}
function isSent(id){return getSent().includes(id);}

function canSend(){return Date.now()-lastSendTime>2000;}
function waitSend(){lastSendTime=Date.now();renderTab();setTimeout(renderTab,2100);}

function buildCard(item,type){
  const sent=isSent(item.id);
  const msg=MSG.build(type,item.contact,settings.ufName||'Tu',settings.ufRole||'Amico');
  const tel=item.contact.tel||'';
  const el=document.createElement('div');el.className='card';
  const icon=type==='bday'?'🎂':type==='comm'?'🕯️':'📅';
  const tag=type==='bday'?'Compleanno':type==='comm'?'Commemorativo':'Onomastico';
  const meta=type==='bday'?(item.contact.bday||''):type==='onom'?(item.onomastico.day+'/'+item.onomastico.month):'';

  const iconDiv=document.createElement('div');iconDiv.className='icon';iconDiv.textContent=icon;
  const infoDiv=document.createElement('div');infoDiv.className='info';

  const nameDiv=document.createElement('div');nameDiv.className='name';nameDiv.textContent=item.contact.name;
  infoDiv.appendChild(nameDiv);

  const metaDiv=document.createElement('div');metaDiv.className='meta';
  const tagSpan=document.createElement('span');tagSpan.className='tag';tagSpan.textContent=tag;
  metaDiv.appendChild(tagSpan);
  if(meta){metaDiv.appendChild(document.createTextNode(meta));}
  infoDiv.appendChild(metaDiv);

  const previewDiv=document.createElement('div');previewDiv.className='msg-preview';previewDiv.textContent=msg;
  infoDiv.appendChild(previewDiv);

  const actionsDiv=document.createElement('div');actionsDiv.className='actions';
  if(tel){
    if(!sent){
      const waiting=!canSend();
      const cls=waiting?'btn-waiting':'';
      const mkBtn=(label,href,clsName)=>{
        const a=document.createElement('a');a.className=clsName+' '+cls;a.textContent=label;
        a.href=href;a.target='_blank';
        if(waiting){a.style.pointerEvents='none';}
        a.addEventListener('click',()=>{markSent(item.id);waitSend();});
        return a;
      };
      actionsDiv.appendChild(mkBtn('TG',MSG.link('tg',tel,msg),'btn-tg'));
      actionsDiv.appendChild(mkBtn('WA',MSG.link('wa',tel,msg),'btn-wa'));
      const smsA=document.createElement('a');smsA.className='btn-sms '+cls;smsA.textContent='SMS';
      smsA.href=MSG.link('sms',tel,msg);
      if(waiting){smsA.style.pointerEvents='none';}
      smsA.addEventListener('click',()=>{markSent(item.id);waitSend();});
      actionsDiv.appendChild(smsA);
    }else{
      const btn=document.createElement('button');btn.className='btn-sent';btn.textContent='✓ Inviato';
      actionsDiv.appendChild(btn);
    }
  }else{
    const span=document.createElement('span');span.style.color='#888';span.style.fontSize='.8rem';span.textContent='Nessun numero';
    actionsDiv.appendChild(span);
  }
  infoDiv.appendChild(actionsDiv);

  el.appendChild(iconDiv);
  el.appendChild(infoDiv);
  return el;
}

function getItems(dayOffset){
  const d=M.getDateOffset(dayOffset);
  const items=[];
  if(!Array.isArray(contacts))contacts=[];
  if(!Array.isArray(onomastici))onomastici=[];
  // Compleanni
  for(const c of contacts){
    if(!c||!c.bday)continue;
    const bd=String(c.bday).replace(/-/g,'');
    let g,m;
    if(bd.length===8){
      g=parseInt(bd.slice(6,8));
      m=parseInt(bd.slice(4,6));
    }else if(String(c.bday).includes('-')){
      const p=String(c.bday).split('-');
      if(p[0]&&p[0].length===4){
        g=parseInt(p[2]);m=parseInt(p[1]);
      }else{
        g=parseInt(p[0]);m=parseInt(p[1]);
      }
    }else continue;
    if(g===d.g&&m===d.m){
      const comm=M.isCommemorative(c);
      if(comm&&dayOffset!==0)continue;
      if(comm&&!settings.showComm)continue;
      items.push({id:'bd_'+c.name+'_'+c.bday,contact:c,type:comm?'comm':'bday',onomastico:null});
    }
  }
  // Onomastici (solo oggi e domani, non ieri/anticipati)
  if(dayOffset!==-1){
    const oggiOnom=onomastici.filter(o=>o&&o.day===d.g&&o.month===d.m);
    const matches=M.matchOnomastici(contacts,oggiOnom);
    for(const m of matches){
      items.push({id:'on_'+m.contact.name,contact:m.contact,type:'onom',onomastico:m.onomastico});
    }
  }
  // Ordine: compleanni prima, poi onomastici
  items.sort((a,b)=>{if(a.type==='bday'&&b.type!=='bday')return-1;if(b.type==='bday'&&a.type!=='bday')return 1;return String(a.contact.name).localeCompare(String(b.contact.name));});
  return items;
}

function renderTab(){
  const activeBtn=$('#tabs .active');
  if(!activeBtn)return;
  const tab=activeBtn.dataset.tab;
  const off=tab==='today'?0:tab==='yesterday'?-1:1;
  const items=getItems(off);
  const main=$('#main');main.innerHTML='';
  const badge=$('#badge');
  if(badge){badge.style.display=items.length?'inline':'none';badge.textContent=items.length;}
  if(!items.length){main.innerHTML='<div class="empty"><div class="empty-icon">🎉</div><div>Nessun evento per questa giornata</div></div>';return;}
  const c=document.createElement('div');c.id='counter';c.textContent=items.filter(x=>!isSent(x.id)).length+' da inviare / '+items.length+' totali';
  main.appendChild(c);
  for(const it of items)main.appendChild(buildCard(it,it.type));
}

async function handleFiles(){
  const vcf=$('#file-vcf').files[0];
  const csv=$('#file-csv').files[0];
  if(vcf){contacts=await P.parseVCF(vcf);LS.setObj('copz_contacts',contacts);}
  else{contacts=LS.obj('copz_contacts');if(!Array.isArray(contacts))contacts=[];}
  if(csv){onomastici=await P.parseCSV(csv,settings.csvEnc);LS.setObj('copz_onomastici',onomastici);}
  else{onomastici=LS.obj('copz_onomastici');if(!Array.isArray(onomastici))onomastici=[];}
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
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
loadSettings();
contacts=LS.obj('copz_contacts');if(!Array.isArray(contacts))contacts=[];
onomastici=LS.obj('copz_onomastici');if(!Array.isArray(onomastici))onomastici=[];
renderTab();
const MSG={};
MSG.defaults={
  bday:['Tanti auguri','Buon compleanno','Auguri di buon compleanno'],
  onom:['Buon onomastico','Tanti auguri di buon onomastico','Felice onomastico','Auguri per il tuo onomastico','Tanti cari auguri di buon onomastico'],
  comm:['In ricordo di','A memoria di','Nel ricordo di']
};
MSG.load=function(){
  const s=localStorage.getItem('copz_msg_v4');
  if(!s) return JSON.parse(JSON.stringify(MSG.defaults));
  try{
    const o=JSON.parse(s);
    if(!o || typeof o!=='object') return JSON.parse(JSON.stringify(MSG.defaults));
    if(!Array.isArray(o.bday) || o.bday.length===0) o.bday = JSON.parse(JSON.stringify(MSG.defaults.bday));
    if(!Array.isArray(o.onom) || o.onom.length===0) o.onom = JSON.parse(JSON.stringify(MSG.defaults.onom));
    if(!Array.isArray(o.comm) || o.comm.length===0) o.comm = JSON.parse(JSON.stringify(MSG.defaults.comm));
    return o;
  }catch(e){
    return JSON.parse(JSON.stringify(MSG.defaults));
  }
};
MSG.save=function(o){localStorage.setItem('copz_msg_v4',JSON.stringify(o))};
MSG.build=function(type,contact,ufName,ufRole,vars){
  const v=vars||MSG.load();
  const name=contact.name;
  const fn=M.firstName(name);
  if(type==='comm'){
    const pool=v.comm.length?v.comm:MSG.defaults.comm;
    const base=pool[0]||MSG.defaults.comm[0];
    return base+', '+name+'. Da '+ufName+' ('+ufRole+')';
  }
  if(type==='bday'){
    const pool=v.bday.length?v.bday:MSG.defaults.bday;
    const base=pool[Math.floor(Math.random()*pool.length)];
    return base+', '+fn+'! Da '+ufName+', '+ufRole;
  }
  const pool=v.onom.length?v.onom:MSG.defaults.onom;
  const base=pool[Math.floor(Math.random()*pool.length)];
  return base+', '+fn+'! Da '+ufName+', '+ufRole;
};
MSG.link=function(type,tel,msg){
  const text=encodeURIComponent(msg);
  if(type==='wa')return'https://wa.me/'+(tel.startsWith('+')?tel.slice(1):tel)+'?text='+text;
  if(type==='tg')return'https://t.me/share/url?url=&text='+text;
  return'sms:'+tel+'?body='+text;
};
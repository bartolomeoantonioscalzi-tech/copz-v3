const MSG={};
MSG.defaults={
  bday:['Tanti auguri','Buon compleanno','Auguri di buon compleanno'],
  onom:['Buon onomastico','Tanti auguri di buon onomastico','Felice onomastico','Auguri per il tuo onomastico','Tanti cari auguri di buon onomastico'],
  comm:['In ricordo di','A memoria di','Nel ricordo di']
};
MSG.load=function(){
  const s=localStorage.getItem('copz_msg');
  return s?JSON.parse(s):JSON.parse(JSON.stringify(MSG.defaults));
};
MSG.save=function(o){localStorage.setItem('copz_msg',JSON.stringify(o))};
MSG.build=function(type,contact,ufName,ufRole,vars){
  const v=vars||MSG.load();
  const name=contact.name;
  const fn=M.firstName(name);
  if(type==='comm'){
    const base=v.comm[0]||MSG.defaults.comm[0];
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
  if(type==='tg')return'tg://msg?to='+tel+'&text='+text;
  return'sms:'+tel+'?body='+text;
};

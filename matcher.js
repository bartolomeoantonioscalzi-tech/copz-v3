const M={};
M.cleanName=function(n){
  return n.replace(/\b(Dr\.|Dott\.|Dott\.ssa|Ing\.|Avv\.|Prof\.|Sig\.|Sig\.ra|Mr\.|Mrs\.|Ms\.|Miss)\b/gi,'').replace(/\s+/g,' ').trim();
};
M.firstName=function(n){
  const c=M.cleanName(n);
  const parts=c.split(/[\s\-]+/).filter(x=>x.length>1);
  return parts[0]||c;
};
M.isCommemorative=function(contact){
  const note=(contact.note||'').toUpperCase();
  return note.includes('MORTO')||note.includes('MORTA')||note.includes('DEFUNTO')||note.includes('DEFUNTA');
};
M.matchOnomastici=function(contacts,onomastici){
  const map=new Map();
  for(const o of onomastici)map.set(o.name.toUpperCase(),o);
  const res=[];
  for(const c of contacts){
    const fn=M.firstName(c.name).toUpperCase();
    if(map.has(fn))res.push({contact:c,onomastico:map.get(fn)});
  }
  return res;
};
M.getToday=function(){
  const d=new Date();return{g:d.getDate(),m:d.getMonth()+1,y:d.getFullYear()};
};
M.getDateOffset=function(off){
  const d=new Date();d.setDate(d.getDate()+off);return{g:d.getDate(),m:d.getMonth()+1,y:d.getFullYear()};
};
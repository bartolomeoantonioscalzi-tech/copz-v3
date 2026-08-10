const P={};
P.parseVCF=async function(file){
  const text=await file.text();
  const lines=text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n');
  const contacts=[];let cur=null;
  for(let raw of lines){
    let line=raw.trim();if(!line)continue;
    if(line.toUpperCase()==='BEGIN:VCARD'){cur={n:'',fn:'',tel:'',bday:'',note:''};continue}
    if(line.toUpperCase()==='END:VCARD'){if(cur){contacts.push(cur);cur=null}continue}
    if(line.startsWith(' '))line=line.slice(1);
    const idx=line.indexOf(':');if(idx<0)continue;
    let key=line.slice(0,idx).split(';')[0].toUpperCase();
    let val=line.slice(idx+1);
    if(key==='N'){const p=val.split(';');cur.n=(p[1]?p[1]+' ':'')+(p[0]||'')}
    if(key==='FN')cur.fn=val;
    if(key==='TEL'){if(!cur.tel)cur.tel=val.replace(/[^0-9+]/g,'')}
    if(key==='BDAY')cur.bday=val;
    if(key==='NOTE')cur.note=(cur.note?cur.note+' ':'')+val;
  }
  return contacts.map(c=>{c.name=c.fn||c.n||'Sconosciuto';c.tel=c.tel||'';c.bday=c.bday||'';c.note=c.note||'';return c});
};
P.parseCSV=async function(file,enc){
  const buf=await file.arrayBuffer();const dec=new TextDecoder(enc||'utf-8');const text=dec.decode(buf);
  const lines=text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n');
  const out=[];
  for(const line of lines){
    if(!line.trim()||line.toUpperCase().startsWith('NOME'))continue;
    const parts=line.split(',').map(s=>s.trim());
    if(parts.length>=3){
      const g=parseInt(parts[1]),m=parseInt(parts[2]);
      if(!isNaN(g)&&!isNaN(m))out.push({name:parts[0],day:g,month:m,desc:parts.slice(3).join(',')||''});
    }
  }
  return out;
};

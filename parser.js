const P={};

// Unfold VCF lines (RFC 6350): lines starting with space/tab continue previous line
P.unfoldVCF=function(text){
  const raw=text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n');
  const lines=[];
  for(const r of raw){
    if(r.startsWith(' ')||r.startsWith('\t')){
      if(lines.length)lines[lines.length-1]+=r.slice(1);
    }else{lines.push(r);}
  }
  return lines;
};

P.parseVCF=async function(file){
  const text=await file.text();
  const lines=P.unfoldVCF(text);
  const contacts=[];let cur=null;
  for(let line of lines){
    line=line.trim();if(!line)continue;
    if(line.toUpperCase()==='BEGIN:VCARD'){cur={n:'',fn:'',tel:'',bday:'',note:''};continue}
    if(line.toUpperCase()==='END:VCARD'){if(cur){contacts.push(cur);cur=null}continue}
    const idx=line.indexOf(':');if(idx<0)continue;
    let keyPart=line.slice(0,idx);
    let val=line.slice(idx+1);
    let key=keyPart.split(';')[0].toUpperCase();
    if(keyPart.toUpperCase().includes('QUOTED-PRINTABLE')){
      val=val.replace(/=([0-9A-Fa-f]{2})/g,(m,h)=>String.fromCharCode(parseInt(h,16)));
      val=val.replace(/=$/,'');
    }
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
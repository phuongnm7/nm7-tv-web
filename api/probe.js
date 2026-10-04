function streamLike(url){
 const u=String(url||'');
 return /\.(m3u8|m3u|mpd|ts|flv|mp4)(?:$|[?#])/i.test(u)||/manifest|playlist|index/i.test(u);
}
function typeFrom(contentType,url,prefix){
 const ct=String(contentType||'').toLowerCase(),u=String(url||'').toLowerCase(),b=String(prefix||'').replace(/^\uFEFF/,'').trim().toLowerCase();
 if(ct.includes('dash+xml')||/\.mpd(?:$|[?#])/i.test(u)||/<mpd[\s>]/i.test(b))return 'dash';
 if(ct.includes('mpegurl')||ct.includes('vnd.apple.mpegurl')||/\.(m3u8|m3u)(?:$|[?#])/i.test(u)||b.startsWith('#extm3u')||b.includes('#extinf:'))return 'hls';
 if(ct.includes('video/x-flv')||ct.includes('video/flv')||/\.flv(?:$|[?#])/i.test(u))return 'flv';
 if(ct.includes('mp2t')||ct.includes('mpegts')||/\.ts(?:$|[?#])/i.test(u))return 'mpegts';
 if(ct.includes('video/mp4')||/\.mp4(?:$|[?#])/i.test(u))return 'mp4';
 if(/^rtsp:/i.test(u))return 'rtsp';
 if(/^rtmp:/i.test(u))return 'rtmp';
 if(/^udp:/i.test(u))return 'udp';
 return 'http';
}
function addCandidate(out,value,base){
 if(typeof value!=='string')return;
 const v=value.trim().replace(/[\\'")>,;]+$/g,'');
 if(!/^https?:/i.test(v))return;
 try{
  const abs=new URL(v,base).toString();
  if(out.indexOf(abs)<0)out.push(abs);
 }catch{}
}
function extractJsonUrls(value,out,base,depth){
 if(depth>5||value==null)return;
 if(typeof value==='string'){addCandidate(out,value,base);return}
 if(Array.isArray(value)){for(const x of value)extractJsonUrls(x,out,base,depth+1);return}
 if(typeof value==='object'){
  const preferred=['url','link','src','source','file','location','redirect','stream','stream_url','streamUrl','hls','dash','m3u8','mpd','manifest','playlist','playbackUrl'];
  for(const k of preferred){if(value[k]!=null)extractJsonUrls(value[k],out,base,depth+1)}
  for(const k of Object.keys(value)){if(!preferred.includes(k))extractJsonUrls(value[k],out,base,depth+1)}
 }
}
function extractBodyUrls(body,base){
 const out=[];
 const text=String(body||'');
 if(/^\s*[\[{]/.test(text)){
  try{extractJsonUrls(JSON.parse(text),out,base,0)}catch{}
 }
 const htmlPatterns=[
  /<iframe[^>]+src=["']([^"']+)["']/gi,
  /<video[^>]+src=["']([^"']+)["']/gi,
  /<source[^>]+src=["']([^"']+)["']/gi,
  /<a[^>]+href=["']([^"']+\.(?:m3u8|m3u|mpd|ts|flv|mp4)(?:[?#][^"']*)?)["']/gi,
  /(?:file|src|stream|manifest|playlist|playbackUrl)\s*[:=]\s*["'](https?:\/\/[^"']+)["']/gi
 ];
 for(const re of htmlPatterns){
  let m;while((m=re.exec(text)))addCandidate(out,m[1],base);
 }
 const direct=/https?:\/\/[^\s<>"'\\]+/g;let m;
 while((m=direct.exec(text)))addCandidate(out,m[0],base);
 return out;
}
async function fetchSmall(target,headers,range){
 try{
  const r=await fetch(target,{method:'GET',redirect:'follow',cache:'no-store',headers:{...headers,Range:range||'bytes=0-65535'}});
  const ab=await r.arrayBuffer();
  const bytes=new Uint8Array(ab);
  let text='';
  try{text=new TextDecoder('utf-8',{fatal:false}).decode(bytes)}catch{text=Buffer.from(bytes).toString('utf8')}
  return {r,text};
 }catch{return null}
}
async function inspect(target,headers,depth){
 if(depth>2)return {type:'http',finalUrl:target,resolvedUrl:target,contentType:'',serverType:''};
 let head=null;
 try{head=await fetch(target,{method:'HEAD',redirect:'follow',cache:'no-store',headers})}catch{}
 const headUrl=head&&head.url||target, headCt=head&&(head.headers.get('content-type')||'')||'';
 const obvious=typeFrom(headCt,headUrl,'');
 if(head&&head.ok&&obvious!=='http')return {type:obvious,finalUrl:headUrl,resolvedUrl:headUrl,contentType:headCt,serverType:head.headers.get('server')||''};
 const small=await fetchSmall(headUrl,headers);
 if(!small)return {type:obvious,finalUrl:headUrl,resolvedUrl:headUrl,contentType:headCt,serverType:head&&head.headers.get('server')||''};
 const r=small.r,text=small.text||'',finalUrl=r.url||headUrl,ct=(r.headers.get('content-type')||headCt||'').toLowerCase();
 const directType=typeFrom(ct,finalUrl,text.slice(0,4096));
 if(directType!=='http'){
  return {type:directType,finalUrl,resolvedUrl:finalUrl,contentType:ct,serverType:r.headers.get('server')||''};
 }
 const urls=extractBodyUrls(text,finalUrl);
 const stream=urls.find(streamLike);
 if(stream){
  const nestedType=typeFrom('',stream,'');
  if(nestedType!=='http')return {type:nestedType,finalUrl,resolvedUrl:stream,contentType:ct,serverType:r.headers.get('server')||''};
 }
 const nonStream=urls.find(u=>!streamLike(u));
 if(nonStream&&nonStream!==finalUrl){
  const nested=await inspect(nonStream,headers,depth+1);
  if(nested&&nested.resolvedUrl&&nested.resolvedUrl!==nonStream)return {...nested,finalUrl:finalUrl};
  if(nested&&nested.type!=='http')return {...nested,finalUrl:finalUrl};
 }
 return {type:'http',finalUrl,resolvedUrl:finalUrl,contentType:ct,serverType:r.headers.get('server')||''};
}
export default async function handler(req,res){
 const q=new URL(req.url,'https://nm7-tv-web.vercel.app').searchParams;
 const u=q.get('u'),ref=q.get('r')||'',ua=q.get('ua')||'Mozilla/5.0',extra=q.get('h')||'';
 if(!u||!/^https?:/i.test(u))return res.status(400).json({type:'http',error:'bad url'});
 const headers={'User-Agent':ua};if(ref)headers.Referer=ref;
 try{
  const eh=JSON.parse(extra||'{}');
  for(const [k,v] of Object.entries(eh||{})){
   const lk=k.toLowerCase();
   if(['host','connection','content-length','cookie'].includes(lk))continue;
   if(typeof v==='string'&&v.length<4000)headers[k]=v;
  }
 }catch{}
 try{
  const d=await inspect(u,headers,0);
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','no-store');
  return res.status(200).json(d);
 }catch(e){
  res.setHeader('Access-Control-Allow-Origin','*');
  return res.status(200).json({type:typeFrom('',u,''),finalUrl:u,resolvedUrl:u,error:'probe failed'});
 }
}

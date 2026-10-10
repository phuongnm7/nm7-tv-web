import { connect } from "cloudflare:sockets";
const SOURCES = {
  tv: [
    'https://nm7-tv-web.vercel.app/api/vietmitv-merge',
    'https://phuongnm7-playlist.phuongnm7-iptv.workers.dev/',
    'https://raw.githubusercontent.com/phuongnm7/Iptv-phuongnm7/main/IPTV_Gop_VMTTV_vAppTV.m3u',
    'https://iptv-live-merge.phuongnm7-iptv.workers.dev/playlist.m3u'
  ],
  sport: [
    'https://thethaonm7.phuongnm7-iptv.workers.dev/playlist.m3u',
    'https://raw.githubusercontent.com/phuongnm7/Iptv-phuongnm7/main/sports-auto.m3u?utm_source=chatgpt.com'
  ]
};
const BUILTIN = {
  vtvcab3hd: [
    {url:'https://856175157.r.vtvcdn.com/ondrm/THETHAO_HD/m30_index.m3u8',ref:'',ua:'KhoaTivi',hls:true,forceProxy:true},
    {url:'https://e3.endpoint.cdn.sctvonline.vn/hls/vtvcab3/index.m3u8',ref:'http://sctvonline.vn/',ua:'ReactNativeVideo/3.4.4 (Linux;Android 9) ExoPlayerLib/2.13.3',hls:true,forceProxy:true}
  ],
  vtvcab16hd: [
    {url:'https://livevliatmcdw.seenow.vn/live/data8/BONGDA_HD/Live_DASHDRM/BONGDA_HD.mpd',ref:'',ua:'Dalvik/2.1.0',headers:{},type:'dash',dash:true,hls:false,drm:{type:'clearkey',key:'f3d73b3a9b89462ebf7911004ea3b3b9:2e547a81ff90aa02648cb9e3f79e7339'},forceProxy:true},
    {url:'https://livevlisctcdnw.seenow.vn/mean/BONGDA_HD/manifest.mpd',ref:'',ua:'Dalvik/2.1.0',headers:{},type:'dash',dash:true,hls:false,drm:{type:'clearkey',key:'f69bf028397e4ecfafce84abb7c5fe2b:25028aad0e2003b2785cf5196a4e2fa1'},forceProxy:true}
  ],

};
const playlistCache=new Map(),CACHE_TTL=30000;
function isHttp(u){return /^https?:\/\//i.test(String(u||''))}
function safeUrl(u,b){try{return new URL(u,b).toString()}catch{return String(u||'')}}
function score(u){let s=0;if(/\.m3u8(?:$|[?#])/i.test(u))s+=100;if(/\.m3u(?:$|[?#])/i.test(u))s+=80;if(/\/hls\//i.test(u))s+=30;if(/playlist|index\.m3u|manifest/i.test(u))s+=20;if(/\.(mp4|ts)(?:$|[?#])/i.test(u))s+=10;if(/tth\.vn\//i.test(u))s-=50;return s}
function addBuiltin(c){
  const key=String(c.id||'').toLowerCase().trim(),name=String(c.name||'').toLowerCase().replace(/[^a-z0-9]+/g,'');let extra=BUILTIN[key]||[];
  if(!extra.length&&(name.startsWith('onsport')||name.includes('vtvcab3')))extra=BUILTIN.vtvcab3hd;
  if(!extra.length&&(name.startsWith('onfootball')||name.includes('vtvcab16')))extra=BUILTIN.vtvcab16hd;
  const seen=new Set((c.candidates||[]).map(x=>x.url));for(const x of extra)if(!seen.has(x.url)){c.candidates.push({...x,headers:x.headers||{}});seen.add(x.url)}
}
function enrichChannels(channels){
  const out=Array.isArray(channels)?channels:[];
  for(const c of out){
    if(!c||typeof c!=='object')continue;
    if(!Array.isArray(c.candidates))c.candidates=[];
    addBuiltin(c);
    // This provider returns valid HLS manifests but its direct TS segment URLs
    // consistently return HTTP 400. Route this known SCTV4K source proxy-first.
    const flatName=(String(c.id||'')+' '+String(c.name||'')).toLowerCase().replace(/[^a-z0-9]+/g,'');
    if(flatName.includes('sctv4k')){
      for(const candidate of c.candidates){
        try{
          const host=new URL(String(candidate.url||'')).hostname.toLowerCase();
          if(host==='vietanhtv.id.vn')candidate.forceProxy=true;
        }catch{}
      }
    }
    c.candidates.sort((a,b)=>score(String(b.url||''))-score(String(a.url||'')));
  }
  return out
}
function parseM3U(t,base=''){
  const lines=String(t||'').replace(/^\uFEFF/,'').split(/\r?\n/),out=[];let m=null,ua='',ref='',origin='',extraHeaders={},manifestType='',licenseType='',licenseKey='';
  const finish=()=>{if(m&&m.candidates.length)out.push(m);m=null};
  for(const raw of lines){
    const l=raw.trim();if(!l)continue;
    if(l.startsWith('#EXTINF:')){finish();const p=l.indexOf(','),h=p<0?l:l.slice(0,p);m={name:p<0?'Kênh':l.slice(p+1).trim(),group:(/group-title="([^"]*)"/i.exec(h)||[])[1]||'Khác',logo:(/tvg-logo="([^"]*)"/i.exec(h)||[])[1]||'',id:(/tvg-id="([^"]*)"/i.exec(h)||[])[1]||'',candidates:[]};ua='';ref='';origin='';extraHeaders={};manifestType='';licenseType='';licenseKey=''}
    else if(m&&l.startsWith('#EXTVLCOPT:')){const um=/http-user-agent=(?:"([^"]+)"|(.*))/i.exec(l),rm=/(?:http-referrer|http-referer)=(?:"([^"]+)"|([^\s]+))/i.exec(l),om=/http-origin=(?:"([^"]+)"|([^\s]+))/i.exec(l);if(um)ua=(um[1]||um[2]||'').trim();if(rm)ref=rm[1]||rm[2];if(om)origin=om[1]||om[2]}
    else if(m&&l.startsWith('#EXTHTTP:')){try{const parsed=JSON.parse(l.slice(l.indexOf(':')+1).trim());if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed)){for(const [k,v] of Object.entries(parsed)){if(typeof v!=='string'||!v.trim())continue;const lk=String(k).toLowerCase();if(lk==='user-agent')ua=v;else if(lk==='referer'||lk==='referrer')ref=v;else if(lk==='origin')origin=v;else extraHeaders[k]=v}}}catch{}}
    else if(m&&l.startsWith('#KODIPROP:')){const mt=/inputstream\.adaptive\.manifest_type=(.+)/i.exec(l),lt=/inputstream\.adaptive\.license_type=(.+)/i.exec(l),lk=/inputstream\.adaptive\.license_key=(.+)/i.exec(l);if(mt)manifestType=mt[1].trim();if(lt)licenseType=lt[1].trim();if(lk)licenseKey=lk[1].trim()}
    else if(m&&!l.startsWith('#')&&/^(https?|rtsp|rtmp|udp|srt|rtp):/i.test(l)){const ps=l.split('|');let r=ref,u=ua,o=origin;for(let i=1;i<ps.length;i++){const z=ps[i],eq=z.indexOf('=');if(eq<0)continue;const k=z.slice(0,eq),v=z.slice(eq+1);if(/^referer(?:er)?$/i.test(k))r=v;if(/^http-user-agent$/i.test(k))u=v;if(/^origin$/i.test(k))o=v}const lm=manifestType.toLowerCase();m.candidates.push({url:safeUrl(ps[0],base),ref:r,ua:u,headers:{...extraHeaders,...(o?{Origin:o}:{})},type:lm==='mpd'?'dash':lm==='hls'?'hls':'',dash:lm==='mpd',hls:lm==='hls'||/\.(m3u8|m3u)(?:$|[?#])/i.test(ps[0])||/playlist|index\.m3u|manifest/i.test(ps[0]),forceProxy:/vietanhtv\.id\.vn/i.test(ps[0]),drm:licenseType&&licenseKey?{type:licenseType,key:licenseKey}:null})}
  }
  finish();
  const merged=[],byKey=new Map();
  for(const c of out){c.id=c.id||c.name;const gid=String(c.id||'').toLowerCase().trim(),nameKey=String(c.name||'').toLowerCase().replace(/\b(server|source|nguon)\s*\d+\b/g,'').replace(/[^a-z0-9]+/g,' ').trim(),key=(c.group||'')+'|'+(gid||nameKey);if(!byKey.has(key)){byKey.set(key,{...c,candidates:c.candidates.slice()});merged.push(byKey.get(key))}else{const x=byKey.get(key),seen=new Set(x.candidates.map(v=>v.url));for(const v of c.candidates)if(v.url&&!seen.has(v.url)){x.candidates.push(v);seen.add(v.url)}if(!x.logo&&c.logo)x.logo=c.logo}}
  for(const c of merged){addBuiltin(c);c.candidates.sort((a,b)=>score(b.url)-score(a.url))}
  return merged;
}
function isStalkerPlaybackUrl(value){
  try{
    const u=new URL(String(value||''));
    const q=u.searchParams;
    return u.pathname.toLowerCase().endsWith('/play/live.php')&&q.has('mac')&&q.has('stream')&&q.has('extension')&&(q.has('play_token')||q.has('token'));
  }catch{return false}
}
function headersFromQuery(req,q){
  const h=new Headers();
  const target=q.get('u')||'';
  // Native NM7 TV uses this User-Agent by default for Media3/ExoPlayer requests.
  // Match it only for Stalker live.php playback URLs; explicit per-channel UA always wins.
  const fallbackUA=isStalkerPlaybackUrl(target)
    ?'NM7-TV/1.0.36 Android-TV'
    :(req.headers.get('user-agent')||'NM7-TV-Web/1.0.69');
  h.set('User-Agent',q.get('ua')||fallbackUA);
  if(q.get('r'))h.set('Referer',q.get('r'));
  for(const k of ['range','accept','accept-language','origin','if-none-match','if-modified-since']){
    const v=req.headers.get(k);if(v)h.set(k,v);
  }
  try{
    const extra=JSON.parse(q.get('h')||'{}');
    for(const [k,v] of Object.entries(extra||{})){
      const lk=k.toLowerCase();
      if(['host','connection','content-length','user-agent','referer'].includes(lk))continue;
      if(typeof v==='string'&&v.length<4000)h.set(k,v)
    }
  }catch{}
  return h
}
function apiUrl(path,u,q){let x=path+'?u='+encodeURIComponent(u);for(const k of ['r','ua','h']){const v=q.get(k)||'';if(v)x+='&'+k+'='+encodeURIComponent(v)}return x}
function rewriteHls(text,finalUrl,q){const px=u=>{try{const abs=safeUrl(u,finalUrl);if(/^data:|^blob:/i.test(abs))return u;return apiUrl('/api/stream',abs,q)}catch{return u}};text=String(text||'').replace(/URI\s*=\s*"([^"]+)"/gi,(m,u)=>'URI="'+px(u)+'"');const lines=text.split(/\r?\n/);for(let i=0;i<lines.length;i++){const z=lines[i].trim();if(z&&!z.startsWith('#')&&!/^data:|^blob:/i.test(z))lines[i]=px(z)}return lines.join('\n')}
function encodeDashContext(value){
  const bytes=new TextEncoder().encode(JSON.stringify(value));
  let binary='';
  for(let i=0;i<bytes.length;i++)binary+=String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function decodeDashContext(token){
  const s=String(token||'').replace(/-/g,'+').replace(/_/g,'/');
  const binary=atob(s+'='.repeat((4-s.length%4)%4));
  const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(bytes));
}
function dashProxyBase(base,q,origin){
  const payload={
    base:String(base||''),
    r:q.get('r')||'',
    ua:q.get('ua')||'',
    h:q.get('h')||''
  };
  return origin+'/api/dash-resource/'+encodeDashContext(payload)+'/';
}
function proxyAbsoluteDashUri(value,base,q,origin){
  // Protect DASH template tokens (for example $Number%05d$) while resolving URLs.
  const tokens=[];
  const protectedValue=String(value||'').replace(/\$[^$]+\$/g,function(token){
    const marker='NM7DASHTEMPLATE'+tokens.length+'X';
    tokens.push(token);return marker;
  });
  let resolved;
  try{resolved=new URL(protectedValue,base)}catch{return value}
  const path=resolved.pathname||'/';
  const slash=path.lastIndexOf('/');
  const directory=resolved.origin+path.slice(0,slash+1);
  let leaf=path.slice(slash+1)+(resolved.search||'')+(resolved.hash||'');
  leaf=leaf.replace(/NM7DASHTEMPLATE(\d+)X/g,function(_,n){return tokens[Number(n)]||''});
  return dashProxyBase(directory,q,origin)+leaf;
}
function rewriteDash(text,finalUrl,q,origin){
  text=String(text||'');
  q=q||new URLSearchParams();
  origin=origin||'https://nm7-tv-web.phuongnm7-iptv.workers.dev';
  let sourceBase=safeUrl('./',finalUrl);
  const baseMatch=/<BaseURL\b[^>]*>([\s\S]*?)<\/BaseURL>/i.exec(text);
  if(baseMatch&&baseMatch[1].trim()){
    sourceBase=safeUrl(baseMatch[1].trim(),finalUrl);
    if(!sourceBase.endsWith('/'))sourceBase+='/';
  }
  const proxyBase=dashProxyBase(sourceBase,q,origin);
  // Absolute or root-relative SegmentTemplate/SegmentURL resources need their own
  // upstream base context; relative resources inherit the proxied BaseURL above.
  text=text.replace(/\b(media|initialization|sourceURL|href)\s*=\s*"([^"]+)"/gi,function(m,attr,value){
    const v=String(value||'').trim();
    if(/^https?:\/\//i.test(v)||v.startsWith('/')){
      return attr+'="'+proxyAbsoluteDashUri(v,sourceBase,q,origin)+'"';
    }
    return m;
  });
  if(/<BaseURL\b[^>]*\/\s*>/i.test(text)){
    return text.replace(/<BaseURL\b[^>]*\/\s*>/i,'<BaseURL>'+proxyBase+'</BaseURL>');
  }
  if(/<BaseURL\b[^>]*>[\s\S]*?<\/BaseURL>/i.test(text)){
    return text.replace(/<BaseURL\b[^>]*>[\s\S]*?<\/BaseURL>/i,'<BaseURL>'+proxyBase+'</BaseURL>');
  }
  return text.replace(/(<MPD\b[^>]*>)/i,'$1<BaseURL>'+proxyBase+'</BaseURL>');
}
async function dashResourceResponse(request,url){
  const prefix='/api/dash-resource/';
  if(!url.pathname.startsWith(prefix))return new Response('bad url',{status:400});
  const rest=url.pathname.slice(prefix.length);
  const slash=rest.indexOf('/');
  if(slash<1)return new Response('bad dash resource path',{status:400});
  const token=rest.slice(0,slash),resourcePath=rest.slice(slash+1);
  let context;
  try{context=decodeDashContext(token)}catch{return new Response('bad dash context',{status:400})}
  if(!context||!isHttp(context.base))return new Response('bad dash base',{status:400});
  let target;
  try{target=new URL(resourcePath,context.base)}
  catch{return new Response('bad dash resource',{status:400})}
  url.searchParams.forEach((value,key)=>target.searchParams.append(key,value));
  const q=new URLSearchParams({u:target.toString()});
  if(context.r)q.set('r',context.r);
  if(context.ua)q.set('ua',context.ua);
  if(context.h)q.set('h',context.h);
  return streamResponse(request,q);
}
function cors(h){h.set('Access-Control-Allow-Origin','*');h.set('Access-Control-Allow-Methods','GET,HEAD,POST,OPTIONS');h.set('Access-Control-Allow-Headers','Range,Accept,Content-Type,Origin,Referer,User-Agent,X-Requested-With');h.set('Access-Control-Expose-Headers','Content-Length,Content-Range,Accept-Ranges,Content-Type,ETag');return h}
async function fetchWithTimeout(url,init={},ms=9000){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{return await fetch(url,{...init,signal:c.signal,redirect:init.redirect||'follow',cache:'no-store'})}finally{clearTimeout(t)}}
async function fetchPlaylistTarget(target,init={},env=null,ms=10000){
  let host='';
  try{host=new URL(target).hostname.toLowerCase()}catch{}
  // Use a Service Binding for this same-account Worker. Public workers.dev
  // fetches from another Worker can return 404 even when the URL is valid.
  if(host==='thethaonm7.phuongnm7-iptv.workers.dev'&&env?.THETHAO_SOURCE){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),ms);
    try{
      return await env.THETHAO_SOURCE.fetch(new Request(target,{...init,signal:controller.signal,redirect:'follow'}));
    }finally{clearTimeout(timer)}
  }
  return fetchWithTimeout(target,init,ms);
}
async function playlistResponse(source,defaultChoice='',env=null,forceRefresh=false){
  if(!SOURCES[source])return new Response(JSON.stringify({channels:[],source}),{status:400,headers:{'Content-Type':'application/json'}});
  const choice=String(defaultChoice||'');
  const isDefault=source==='tv'&&['1','2','android1069'].includes(choice);
  const preset=choice==='2'?2:1;
  const cacheKey=isDefault?'tv:default:'+preset:source;
  const now=Date.now(),hit=playlistCache.get(cacheKey);
  // Manual/explicit sport refresh bypasses the isolate-local cache, while all
  // other sources continue to use the existing 30-second cache.
  if(!forceRefresh&&hit&&now-hit.time<CACHE_TTL)return new Response(JSON.stringify({channels:hit.channels,source,cached:true,preset,upstream:hit.upstream}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  const errors=[];
  const targets=isDefault?(preset===2?[SOURCES.tv[1]]:[SOURCES.tv[0],SOURCES.tv[1]]):SOURCES[source];
  for(const target of targets){try{
    const init={headers:{'User-Agent':'NM7-TV-Web/1.0.69','Accept':'application/vnd.apple.mpegurl,application/json,text/plain,*/*'}};
    const useBinding=source==='tv'&&target==='https://phuongnm7-playlist.phuongnm7-iptv.workers.dev/'&&env?.PLAYLIST_SOURCE;
    const r=useBinding
      ?await env.PLAYLIST_SOURCE.fetch(new Request(target,init))
      :await fetchPlaylistTarget(target,init,env,10000);if(!r.ok)throw new Error('HTTP '+r.status);const body=await r.text();let channels=parseM3U(body,target);if(!channels.length){try{const j=JSON.parse(body),arr=Array.isArray(j)?j:(Array.isArray(j.channels)?j.channels:Array.isArray(j.data)?j.data:[]);channels=arr.map(x=>({name:String(x.name||x.title||x.channel||'Kênh'),group:String(x.group||x.groupTitle||x.category||'Khác'),logo:String(x.logo||x.tvgLogo||''),id:String(x.id||x.tvgId||x.name||x.title||''),candidates:Array.isArray(x.candidates)?x.candidates:(x.url||x.stream||x.src?[{url:x.url||x.stream||x.src,ref:x.ref||x.referer||'',ua:x.ua||x.userAgent||'',headers:x.headers||{},type:x.type||'',dash:x.type==='dash',hls:x.type==='hls'}]:[])}))}catch{}}if(!channels.length)throw new Error('playlist rỗng');
    enrichChannels(channels);
    playlistCache.set(cacheKey,{time:now,channels,upstream:target});
    return new Response(JSON.stringify({channels,source,cached:false,preset:isDefault?preset:undefined,upstream:target,refreshed:forceRefresh}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}})}catch(e){errors.push(target+': '+e.message)}}
  if(hit&&hit.channels?.length)return new Response(JSON.stringify({channels:hit.channels,source,cached:true,stale:true,error:errors.join(' | ')}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  return new Response(JSON.stringify({channels:[],source,error:errors.join(' | ')}),{status:504,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
}
function sniffPayloadKind(bytes){
  if(!bytes||!bytes.length)return 'unknown';
  // MPEG-TS packet sync can identify a segment even when the provider lies about its MIME.
  if(bytes.length>376&&bytes[0]===0x47&&bytes[188]===0x47&&bytes[376]===0x47)return 'ts';
  if(bytes.length>=8){
    const brand=String.fromCharCode(bytes[4],bytes[5],bytes[6],bytes[7]);
    if(brand==='ftyp'||brand==='styp'||brand==='moof')return 'mp4';
  }
  let sample='';
  try{sample=new TextDecoder().decode(bytes)}catch{}
  const text=sample.replace(/^\uFEFF/,'').trimStart();
  if(text.startsWith('#EXTM3U'))return 'hls';
  if(/^(?:<\?xml[^>]*>\s*)?<MPD\b/i.test(text))return 'dash';
  if(/^<!doctype\s+html\b|^<html\b|^<head\b/i.test(text))return 'html';
  return 'unknown';
}
async function readResponsePrefix(response,limit=4096){
  try{
    const body=response.clone().body;
    if(!body||typeof body.getReader!=='function')return new Uint8Array(0);
    const reader=body.getReader(),chunks=[];
    let total=0;
    while(total<limit){
      const item=await reader.read();
      if(item.done||!item.value)break;
      const take=item.value.subarray(0,Math.min(item.value.byteLength,limit-total));
      if(take.byteLength){chunks.push(take);total+=take.byteLength;}
      if(take.byteLength<item.value.byteLength)break;
    }
    try{await reader.cancel()}catch{}
    const result=new Uint8Array(total);let offset=0;
    for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.byteLength;}
    return result;
  }catch{return new Uint8Array(0)}
}
function isStalkerSocketCandidate(target){
  try{
    const u=new URL(target);
    return u.protocol==="http:"&&u.hostname==="mag.tivi-one-iptv.net"&&
      u.pathname.toLowerCase()==="/play/live.php"&&
      /^(ts|m2ts)$/i.test(u.searchParams.get("extension")||"")&&
      u.searchParams.has("mac")&&u.searchParams.has("stream")&&
      (u.searchParams.has("play_token")||u.searchParams.has("token"));
  }catch{return false}
}
async function stalkerSocketStreamResponse(request,q,target){
  const h=headersFromQuery(request,q);
  let first;
  try{first=await fetchWithTimeout(target,{method:"GET",headers:h,redirect:"manual"},6000)}
  catch{return new Response("Stalker redirect request failed",{status:502,headers:cors(new Headers({"Content-Type":"text/plain","Cache-Control":"no-store"}))})}
  const location=first.headers.get("location")||"";
  if(first.status<300||first.status>=400||!location){
    // If provider did not redirect, preserve the normal fetch result.
    const outHeaders=cors(new Headers(first.headers));outHeaders.set("Content-Type","video/mp2t");outHeaders.set("Cache-Control","no-store");
    return new Response(first.body,{status:first.status,headers:outHeaders});
  }
  try{await first.body?.cancel()}catch{}
  let dest;
  try{dest=new URL(location,target)}catch{return new Response("Invalid Stalker redirect",{status:502})}
  // Strict allowlist: only the exact Stalker origin and the exact IP it redirects to.
  if(dest.protocol!=="http:"||dest.hostname!=="192.142.25.161"||(dest.port&&dest.port!=="80")){
    return new Response("Stalker redirect destination not allowed",{status:502,headers:cors(new Headers({"Content-Type":"text/plain","Cache-Control":"no-store"}))});
  }
  let socket,reader,writer,cleaned=false;
  const cleanup=async()=>{
    if(cleaned)return;cleaned=true;
    try{await reader?.cancel()}catch{}
    try{await writer?.close()}catch{}
    try{socket?.close()}catch{}
  };
  try{
    socket=connect({hostname:dest.hostname,port:80});
    reader=socket.readable.getReader();writer=socket.writable.getWriter();
    const pathAndQuery=dest.pathname+dest.search;
    const requestHeaders=[
      "GET "+pathAndQuery+" HTTP/1.1",
      "Host: "+dest.host,
      "User-Agent: "+(h.get("User-Agent")||"NM7-TV/1.0.36 Android-TV"),
      "Accept: "+(h.get("Accept")||"*/*"),
      "Accept-Encoding: identity",
      "Connection: close"
    ];
    const referer=h.get("Referer");if(referer)requestHeaders.push("Referer: "+referer.replace(/[\r\n]/g,""));
    const range=h.get("Range");if(range)requestHeaders.push("Range: "+range.replace(/[\r\n]/g,""));
    await writer.write(new TextEncoder().encode(requestHeaders.join("\r\n")+"\r\n\r\n"));
    let raw=new Uint8Array(0),headerEnd=-1;
    const deadline=Date.now()+10000;
    while(headerEnd<0&&raw.byteLength<65536&&Date.now()<deadline){
      const item=await Promise.race([
        reader.read(),
        new Promise(resolve=>setTimeout(()=>resolve({timeout:true}),Math.max(1,deadline-Date.now())))
      ]);
      if(item?.timeout)break;
      if(item.done||!item.value)break;
      const next=new Uint8Array(raw.byteLength+item.value.byteLength);next.set(raw);next.set(item.value,raw.byteLength);raw=next;
      for(let i=0;i+3<raw.length;i++)if(raw[i]===13&&raw[i+1]===10&&raw[i+2]===13&&raw[i+3]===10){headerEnd=i+4;break}
    }
    if(headerEnd<0){await cleanup();return new Response("No HTTP response from Stalker stream socket",{status:502,headers:cors(new Headers({"Content-Type":"text/plain","Cache-Control":"no-store"}))})}
    const headerText=new TextDecoder().decode(raw.subarray(0,headerEnd-4));
    const statusMatch=(headerText.split("\r\n")[0]||"").match(/^HTTP\/\d(?:\.\d)?\s+(\d{3})/i);
    const upstreamStatus=statusMatch?Number(statusMatch[1]):0;
    const upstreamHeaders={};
    for(const line of headerText.split("\r\n").slice(1)){const i=line.indexOf(":");if(i>0)upstreamHeaders[line.slice(0,i).trim().toLowerCase()]=line.slice(i+1).trim()}
    if(upstreamStatus<200||upstreamStatus>=300){
      await cleanup();
      return new Response("Stalker stream upstream HTTP "+upstreamStatus,{status:502,headers:cors(new Headers({"Content-Type":"text/plain","Cache-Control":"no-store"}))});
    }
    const outHeaders=cors(new Headers());
    outHeaders.set("Content-Type","video/mp2t");outHeaders.set("Cache-Control","no-store");
    outHeaders.set("Accept-Ranges",upstreamHeaders["accept-ranges"]||"bytes");
    if(upstreamHeaders["content-length"])outHeaders.set("Content-Length",upstreamHeaders["content-length"]);
    if(upstreamHeaders["content-range"])outHeaders.set("Content-Range",upstreamHeaders["content-range"]);
    outHeaders.set("Access-Control-Expose-Headers","Content-Length,Content-Range,Accept-Ranges");
    const initialBody=raw.subarray(headerEnd);
    const body=new ReadableStream({
      start(controller){if(initialBody.byteLength)controller.enqueue(initialBody)},
      async pull(controller){
        try{
          const item=await reader.read();
          if(item.done){controller.close();await cleanup();return}
          if(item.value?.byteLength)controller.enqueue(item.value);
        }catch{controller.error(new Error("Stalker TCP stream read failed"));await cleanup()}
      },
      async cancel(){await cleanup()}
    });
    return new Response(body,{status:upstreamStatus===206?206:200,headers:outHeaders});
  }catch(e){
    await cleanup();
    return new Response("Stalker TCP socket failed: "+String(e?.name||"Error"),{status:502,headers:cors(new Headers({"Content-Type":"text/plain","Cache-Control":"no-store"}))});
  }
}
async function streamResponse(request,q){
  const target=q.get('u');
  if(!isHttp(target))return new Response('bad url',{status:400});
  if(request.method!=="HEAD"&&isStalkerSocketCandidate(target))return stalkerSocketStreamResponse(request,q,target);
  const r=await fetch(target,{
    method:request.method==='HEAD'?'HEAD':'GET',
    headers:headersFromQuery(request,q),
    redirect:'follow',
    cache:'no-store'
  });
  const ct=(r.headers.get('content-type')||'').toLowerCase();
  const finalUrl=r.url||target;
  const h=cors(new Headers(r.headers));
  h.set('Cache-Control','no-store');

  // Xtream/Stalker endpoints often serve TS from /play/live.php?extension=ts,
  // so the media container is stated in the query rather than the path suffix.
  // Fix the MIME before passing the upstream stream to the browser.
  let queryExtension='';
  try{queryExtension=new URL(target).searchParams.get('extension')||''}catch{}
  if(r.ok&&/^(ts|m2ts)$/i.test(queryExtension)){
    h.set('Content-Type','video/mp2t');
    return new Response(r.body,{status:r.status,headers:h});
  }

  // Some provider reverse proxies incorrectly label MPEG-TS/fMP4 media
  // segments as application/vnd.apple.mpegurl. Never parse binary media as
  // an HLS text manifest merely because the upstream Content-Type is wrong.
  const paths=[finalUrl,target].map(value=>{
    try{return new URL(value).pathname.toLowerCase()}catch{return String(value).toLowerCase().split(/[?#]/)[0]}
  });
  // Prefer the final redirected path when it keeps the extension, but fall back
  // to the requested URL if a CDN redirects to an extensionless signed path.
  const ext=paths.map(path=>(path.match(/\.([a-z0-9]+)$/i)||[])[1]||'').find(Boolean)||'';
  const mediaType={
    ts:'video/mp2t',m2ts:'video/mp2t',
    m4s:'video/mp4',cmfv:'video/mp4',cmfa:'audio/mp4',mp4:'video/mp4',
    aac:'audio/aac',ac3:'audio/ac3',ec3:'audio/eac3',
    vtt:'text/vtt',webvtt:'text/vtt'
  }[ext];
  if(mediaType){
    h.set('Content-Type',mediaType);
    return new Response(r.body,{status:r.status,headers:h});
  }

  const hlsHint=ct.includes('mpegurl')||/\.(m3u8|m3u)(?:$|[?#])/i.test(finalUrl);
  const dashHint=ct.includes('dash+xml')||/\.mpd(?:$|[?#])/i.test(finalUrl);
  // Extensionless manifests may arrive as text/plain; binary segments may be
  // incorrectly labelled as HLS. Sniff a small cloned prefix before rewriting.
  const ambiguousType=!mediaType&&(!ct||ct.includes('octet-stream')||ct.startsWith('text/')||ct.includes('json')||ct.includes('xml'));
  const prefixKind=r.ok&&(hlsHint||dashHint||ambiguousType)
    ?sniffPayloadKind(await readResponsePrefix(r)):'unknown';
  if(prefixKind==='ts'&&(hlsHint||dashHint||ambiguousType)){
    h.set('Content-Type','video/mp2t');
    return new Response(r.body,{status:r.status,headers:h});
  }
  if(prefixKind==='mp4'&&(hlsHint||dashHint||ambiguousType)){
    h.set('Content-Type','video/mp4');
    return new Response(r.body,{status:r.status,headers:h});
  }
  if(prefixKind==='html'&&(hlsHint||dashHint||ambiguousType)){
    h.set('Content-Type','text/html; charset=utf-8');
    return new Response(r.body,{status:r.status,headers:h});
  }
  const looksHls=prefixKind==='hls';
  const looksDash=prefixKind==='dash';
  if(looksHls&&r.ok){
    const body=await r.text();
    h.set('Content-Type','application/vnd.apple.mpegurl; charset=utf-8');
    return new Response(rewriteHls(body,finalUrl,q),{status:r.status,headers:h});
  }
  if(looksDash&&r.ok){
    const body=await r.text();
    h.set('Content-Type','application/dash+xml; charset=utf-8');
    return new Response(rewriteDash(body,finalUrl,q,new URL(request.url).origin),{status:r.status,headers:h});
  }
  if(!h.get('Content-Type')){
    const low=finalUrl.toLowerCase();
    h.set('Content-Type',/\.mp4(?:$|[?#])/i.test(low)?'video/mp4':/\.flv(?:$|[?#])/i.test(low)?'video/x-flv':/\.(ts|m2ts)(?:$|[?#])/i.test(low)?'video/mp2t':'application/octet-stream');
  }
  return new Response(r.body,{status:r.status,headers:h});
}
async function imageResponse(q){const u=q.get('u');if(!isHttp(u))return new Response('bad image url',{status:400});const h=new Headers({'User-Agent':q.get('ua')||'NM7-TV-Web/1.0.69'});if(q.get('r'))h.set('Referer',q.get('r'));const r=await fetch(u,{headers:h,redirect:'follow',cache:'no-store'});if(!r.ok)return new Response('upstream image HTTP '+r.status,{status:r.status});const ct=r.headers.get('content-type')||'';if(!/^image\//i.test(ct)&&!ct.toLowerCase().includes('svg'))return new Response('not an image',{status:415});const ab=await r.arrayBuffer();if(ab.byteLength>2*1024*1024)return new Response('image too large',{status:413});const out=cors(new Headers());out.set('Content-Type',ct);out.set('Content-Length',String(ab.byteLength));out.set('Cache-Control','public,max-age=86400');return new Response(ab,{status:200,headers:out})}
async function licenseResponse(request,q){const u=q.get('u');if(!isHttp(u))return new Response('bad url',{status:400});const h=headersFromQuery(request,q),ua=q.get('ua')||'',ref=q.get('r')||'';if(ua)h.set('User-Agent',ua);if(ref)h.set('Referer',ref);let body;if(request.method==='POST'){const raw=await request.text();if(q.get('base64')==='1'){try{body=Uint8Array.from(atob(raw),c=>c.charCodeAt(0));h.set('Content-Type','application/octet-stream')}catch{return new Response('bad base64 body',{status:400})}}else body=raw}let r=await fetch(u,{method:request.method==='POST'?'POST':'GET',headers:h,body,redirect:'follow',cache:'no-store'});if(!r.ok&&request.method==='POST')r=await fetch(u,{method:'GET',headers:h,redirect:'follow',cache:'no-store'});return new Response(r.body,{status:r.status,headers:cors(new Headers(r.headers))})}

async function sourceResponse(q,env=null){
  const target=String(q.get('u')||'').trim();
  if(!isHttp(target))return new Response(JSON.stringify({channels:[],error:'bad url'}),{status:400,headers:cors(new Headers({'Content-Type':'application/json'}))});

  // Retry source import with a browser UA if the default NM7 request is rejected.
  // This is isolated to /api/source; TV playback/proxy routes are unchanged.
  const attempts=[
    {ua:'NM7-TV-Web/1.0.69',accept:'application/vnd.apple.mpegurl,application/json,text/plain,*/*'},
    {ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',accept:'text/plain,application/vnd.apple.mpegurl,application/json,*/*'}
  ];
  let lastError='unknown error',lastStatus=0,lastContentType='',lastUrl=target;
  for(let i=0;i<attempts.length;i++){
    let r;
    try{
      r=await fetchPlaylistTarget(target,{headers:{'User-Agent':attempts[i].ua,'Accept':attempts[i].accept}},env,10000);
    }catch(e){
      lastError=String(e?.message||e||'fetch failed');
      lastStatus=0;
      if(i+1<attempts.length)continue;
      break;
    }
    lastStatus=r.status;
    lastContentType=r.headers.get('content-type')||'';
    lastUrl=r.url||target;
    if(!r.ok){
      lastError='HTTP '+r.status;
      try{await r.body?.cancel()}catch{}
      if(i+1<attempts.length)continue;
      break;
    }
    let body='';
    try{body=await r.text()}catch(e){
      lastError=String(e?.message||e||'failed to read response');
      lastStatus=0;
      if(i+1<attempts.length)continue;
      break;
    }
    let channels=parseM3U(body,lastUrl);
    if(!channels.length){
      try{
        const j=JSON.parse(body);
        const arr=Array.isArray(j)?j:(Array.isArray(j.channels)?j.channels:Array.isArray(j.data)?j.data:[]);
        channels=arr.map(x=>({
          name:String(x.name||x.title||x.channel||'Kênh'),
          group:String(x.group||x.groupTitle||x.category||'Khác'),
          logo:String(x.logo||x.tvgLogo||''),
          id:String(x.id||x.tvgId||x.name||x.title||''),
          candidates:Array.isArray(x.candidates)?x.candidates:(x.url||x.stream||x.src?[{url:safeUrl(x.url||x.stream||x.src,lastUrl),ref:x.ref||x.referer||'',ua:x.ua||x.userAgent||'',headers:x.headers||{},type:x.type||'',dash:x.type==='dash',hls:x.type==='hls'}]:[])
        }));
      }catch{}
    }
    if(channels.length){
      enrichChannels(channels);
      return new Response(JSON.stringify({channels,source:'custom',upstream:lastUrl,fetchMode:i===0?'nm7-ua':'browser-ua'}),{headers:cors(new Headers({'Content-Type':'application/json','Cache-Control':'no-store'}))});
    }
    lastError='Nguồn không trả về playlist M3U/JSON';
    if(i+1<attempts.length)continue;
    break;
  }
  const detail=lastStatus?'HTTP '+lastStatus:'không nhận được phản hồi HTTP';
  const ct=lastContentType?' ('+lastContentType+')':'';
  let upstreamHost='';
  try{upstreamHost=new URL(lastUrl).host}catch{}
  return new Response(JSON.stringify({
    channels:[],source:'custom',
    error:lastError+'; '+detail+ct+' sau '+attempts.length+' lần thử',
    upstreamHost
  }),{status:502,headers:cors(new Headers({'Content-Type':'application/json','Cache-Control':'no-store'}))});
}
function detectMediaType(url,contentType,bodyText=""){
  const ct=String(contentType||"").toLowerCase(),u=String(url||"").toLowerCase();
  if(ct.includes("dash+xml")||/\.mpd(?:$|[?#])/.test(u)||/<MPD\b/i.test(bodyText))return "dash";
  if(ct.includes("mpegurl")||/\.(m3u8|m3u)(?:$|[?#])/.test(u)||bodyText.trimStart().startsWith("#EXTM3U"))return "hls";
  if(ct.includes("x-flv")||/\.flv(?:$|[?#])/.test(u)||bodyText.startsWith("FLV"))return "flv";
  if(ct.includes("mp2t")||/\.(ts|m2ts)(?:$|[?#])/.test(u)||/[?&]extension=(?:ts|m2ts)(?:&|$)/i.test(u))return "mpegts";
  if(ct.includes("video/mp4")||/\.(mp4|m4v)(?:$|[?#])/.test(u))return "mp4";
  return "http";
}
async function stalkerSocketProbe(target,q){
  let u;
  try{u=new URL(target)}catch{return new Response(JSON.stringify({errorClass:"bad-url"}),{status:400,headers:cors(new Headers({"Content-Type":"application/json"}))})}
  if(u.hostname!=="mag.tivi-one-iptv.net"||u.pathname.toLowerCase()!=="/play/live.php"||
     !u.searchParams.has("mac")||!u.searchParams.has("stream")||
     !/^(ts|m2ts)$/i.test(u.searchParams.get("extension")||"")||
     !(u.searchParams.has("play_token")||u.searchParams.has("token"))){
    return new Response(JSON.stringify({errorClass:"stalker-host-not-allowed"}),{status:403,headers:cors(new Headers({"Content-Type":"application/json"}))});
  }
  const headers=new Headers({"User-Agent":q.get("ua")||"NM7-TV/1.0.36 Android-TV","Accept":"*/*","Accept-Encoding":"identity"});
  const ref=q.get("r");if(ref)headers.set("Referer",ref);
  let first;
  try{first=await fetchWithTimeout(target,{method:"GET",headers,redirect:"manual"},5000)}
  catch(e){return new Response(JSON.stringify({errorClass:"initial-fetch-"+String(e?.name||"Error")}),{status:502,headers:cors(new Headers({"Content-Type":"application/json"}))})}
  const location=first.headers.get("location")||"";
  try{await first.body?.cancel()}catch{}
  if(first.status<300||first.status>=400||!location){
    return new Response(JSON.stringify({firstStatus:first.status,redirectPresent:!!location,errorClass:"expected-redirect-not-found"}),{status:502,headers:cors(new Headers({"Content-Type":"application/json"}))});
  }
  let dest;
  try{dest=new URL(location,target)}catch{return new Response(JSON.stringify({firstStatus:first.status,errorClass:"bad-redirect"}),{status:502,headers:cors(new Headers({"Content-Type":"application/json"}))})}
  // Restrict this experiment to the single public IP returned by this provider, on HTTP/80.
  if(dest.protocol!=="http:"||dest.hostname!=="192.142.25.161"||(dest.port&&dest.port!=="80")){
    return new Response(JSON.stringify({firstStatus:first.status,redirectHost:dest.hostname,redirectPort:dest.port||"80",errorClass:"redirect-not-allowlisted"}),{status:403,headers:cors(new Headers({"Content-Type":"application/json"}))});
  }
  let socket,reader,writer;
  try{
    socket=connect({hostname:dest.hostname,port:80});
    reader=socket.readable.getReader();
    writer=socket.writable.getWriter();
    const pathAndQuery=dest.pathname+dest.search;
    const lines=[
      "GET "+pathAndQuery+" HTTP/1.1",
      "Host: "+(q.get("socketHostMode")==="origin" ? u.host : dest.host),
      "User-Agent: "+(headers.get("User-Agent")||"NM7-TV/1.0.36 Android-TV"),
      "Accept: */*",
      "Accept-Encoding: identity",
      ...(q.get("socketNoRange")==="1"?[]:["Range: bytes=0-32767"]),
      "Connection: close"
    ];
    if(ref)lines.push("Referer: "+ref.replace(/[\\r\\n]/g,""));
    await writer.write(new TextEncoder().encode(lines.join("\r\n")+"\r\n\r\n"));
    // Keep the writable side open while reading; some live origins do not answer
    // until they finish parsing the request on the socket.
    let raw=new Uint8Array(0),deadline=Date.now()+6500,headerEnd=-1,needed=12000;
    while(raw.byteLength<50000&&Date.now()<deadline){
      const remaining=deadline-Date.now();
      const item=await Promise.race([
        reader.read(),
        new Promise(resolve=>setTimeout(()=>resolve({timeout:true}),remaining))
      ]);
      if(item?.timeout||item.done||!item.value)break;
      const chunk=item.value;
      const next=new Uint8Array(Math.min(50000,raw.byteLength+chunk.byteLength));
      next.set(raw,0);next.set(chunk.subarray(0,next.byteLength-raw.byteLength),raw.byteLength);raw=next;
      if(headerEnd<0){
        for(let i=0;i+3<raw.length;i++){
          if(raw[i]===13&&raw[i+1]===10&&raw[i+2]===13&&raw[i+3]===10){headerEnd=i+4;break}
        }
      }
      if(headerEnd>=0&&raw.length-headerEnd>=needed)break;
    }
    if(headerEnd<0){
      return new Response(JSON.stringify({firstStatus:first.status,connected:true,bytesReceived:raw.byteLength,errorClass:"no-http-header"}),{status:502,headers:cors(new Headers({"Content-Type":"application/json"}))});
    }
    const headerText=new TextDecoder().decode(raw.subarray(0,headerEnd-4));
    const statusLine=headerText.split("\r\n")[0]||"";
    const sm=statusLine.match(/^HTTP\/\d(?:\.\d)?\s+(\d{3})/i);
    const status=sm?Number(sm[1]):0;
    const responseHeaders={};
    for(const line of headerText.split("\r\n").slice(1)){
      const i=line.indexOf(":");if(i>0)responseHeaders[line.slice(0,i).trim().toLowerCase()]=line.slice(i+1).trim();
    }
    let body=raw.subarray(headerEnd);
    if(/chunked/i.test(responseHeaders["transfer-encoding"]||"")){
      const decoded=[];let p=0,total=0,done=false;
      while(p<body.length&&total<16000){
        let e=-1;for(let i=p;i+1<body.length;i++)if(body[i]===13&&body[i+1]===10){e=i;break}
        if(e<0)break;
        const sizeText=new TextDecoder().decode(body.subarray(p,e)).split(";")[0].trim();
        const size=parseInt(sizeText,16);if(!Number.isFinite(size)||size<0)break;
        p=e+2;if(size===0){done=true;break}
        if(p+size>body.length)break;
        const piece=body.subarray(p,p+size);decoded.push(piece);total+=piece.length;p+=size+2;
      }
      const merged=new Uint8Array(total);let o=0;for(const piece of decoded){merged.set(piece,o);o+=piece.length}body=merged;
    }
    const sync=body.length>376&&body[0]===0x47&&body[188]===0x47&&body[376]===0x47;
    return new Response(JSON.stringify({
      firstStatus:first.status,redirectHost:dest.hostname,redirectPort:dest.port||"80",
      socketHttpStatus:status,hostMode:q.get("socketHostMode")==="origin"?"origin":"redirect-ip",
      rangeSent:q.get("socketNoRange")!=="1",
      contentType:responseHeaders["content-type"]||"",
      transferEncoding:responseHeaders["transfer-encoding"]||"",contentLength:responseHeaders["content-length"]||"",
      bytesRead:body.byteLength,tsSync188:sync,server:responseHeaders["server"]||"",
      errorClass:status>=400?"upstream-http-error":"none"
    }),{headers:cors(new Headers({"Content-Type":"application/json","Cache-Control":"no-store"}))});
  }catch(e){
    return new Response(JSON.stringify({firstStatus:first.status,redirectHost:dest.hostname,redirectPort:dest.port||"80",errorClass:"socket-"+String(e?.name||"Error"),errorMessage:String(e?.message||"").slice(0,120)}),{status:502,headers:cors(new Headers({"Content-Type":"application/json","Cache-Control":"no-store"}))});
  }finally{
    try{await reader?.cancel()}catch{}
    try{await writer?.close()}catch{}
    try{socket?.close()}catch{}
  }
}
async function probeResponse(request,q){
  const target=q.get("u");
  if(q.get("socketProbe")==="1")return stalkerSocketProbe(target,q);
  if(!isHttp(target))return new Response(JSON.stringify({type:"http",error:"bad url"}),{status:400,headers:{"Content-Type":"application/json"}});
  // Mirror playback request metadata (UA, Referer and playlist headers) so the
  // diagnostic tests the same request shape as the stream proxy.
  const headers=headersFromQuery(request,q);
  const requestedUA=q.get("ua")||"";
  const requestedReferer=q.get("r")||"";
  if(requestedUA)headers.set("User-Agent",requestedUA);
  if(requestedReferer)headers.set("Referer",requestedReferer);
  // Test-only safe redirect fingerprint: reveal only status and destination host,
  // never query/path because Stalker URLs carry MACs and short-lived play tokens.
  if(q.get("manualRedirect")==="1"){
    try{
      const mr=await fetchWithTimeout(target,{method:"GET",headers,redirect:"manual"},5000);
      const location=mr.headers.get("location")||"";
      let locationHost="";
      try{locationHost=new URL(location,target).hostname}catch{}
      const requestedUrl=new URL(target);
      const redirectUrl=location?new URL(location,target):null;
      const out={
        status:mr.status,
        contentType:mr.headers.get("content-type")||"",
        server:mr.headers.get("server")||"",
        cfRayPresent:!!mr.headers.get("cf-ray"),
        redirectPresent:!!location,
        redirectHost:locationHost,
        redirectScheme:redirectUrl?.protocol||"",
        redirectPort:redirectUrl?.port||"",
        redirectPathSame:!!redirectUrl&&redirectUrl.pathname===requestedUrl.pathname,
        requestedHost:requestedUrl.hostname,
        requestedPort:requestedUrl.port||""
      };
      try{await mr.body?.cancel()}catch{}
      // Test whether the origin redirects to a raw IP that rejects Worker fetches.
      // Keep all token-bearing paths/queries internal; report only status and host.
      if(q.get("rewriteHost")==="1"&&location){
        try{
          const redirected=new URL(location,target);
          const isIp=(host)=>/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)||host.includes(':');
          const redirectWasIp=isIp(redirected.hostname)&&!isIp(requestedUrl.hostname);
          if(redirectWasIp){
            redirected.hostname=requestedUrl.hostname;
            const rr=await fetchWithTimeout(redirected.href,{method:"GET",headers,redirect:"manual"},7000);
            const prefix=await readResponsePrefix(rr,4096);
            const secondLocation=rr.headers.get("location")||"";
            let secondHost="";
            try{secondHost=new URL(secondLocation,redirected.href).hostname}catch{}
            out.rewriteHostTest={
              applied:true,status:rr.status,contentType:rr.headers.get("content-type")||"",
              server:rr.headers.get("server")||"",cfRayPresent:!!rr.headers.get("cf-ray"),
              bodyBytes:prefix.byteLength,
              tsSync188:prefix.byteLength>376&&prefix[0]===0x47&&prefix[188]===0x47&&prefix[376]===0x47,
              redirectPresent:!!secondLocation,redirectHost:secondHost
            };
            try{await rr.body?.cancel()}catch{}
          }else out.rewriteHostTest={applied:false,reason:"redirect-is-not-ip"};
          // Second safe experiment: re-host the redirected path on the original host AND original port.
          // This distinguishes an upstream proxy-port redirect from an IP/WAF restriction.
          if(redirectWasIp){
            try{
              const originalPortTarget=new URL(location,target);
              originalPortTarget.protocol=requestedUrl.protocol;
              originalPortTarget.hostname=requestedUrl.hostname;
              originalPortTarget.port=requestedUrl.port;
              const rr2=await fetchWithTimeout(originalPortTarget.href,{method:"GET",headers,redirect:"manual"},7000);
              const prefix2=await Promise.race([
                readResponsePrefix(rr2,4096),
                new Promise(resolve=>setTimeout(()=>resolve(new Uint8Array(0)),2500))
              ]);
              const secondLocation2=rr2.headers.get("location")||"";
              let secondHost2="";
              try{secondHost2=new URL(secondLocation2,originalPortTarget.href).hostname}catch{}
              out.rewriteOriginalPortTest={
                applied:true,status:rr2.status,contentType:rr2.headers.get("content-type")||"",
                server:rr2.headers.get("server")||"",cfRayPresent:!!rr2.headers.get("cf-ray"),
                bodyBytes:prefix2.byteLength,
                tsSync188:prefix2.byteLength>376&&prefix2[0]===0x47&&prefix2[188]===0x47&&prefix2[376]===0x47,
                redirectPresent:!!secondLocation2,redirectHost:secondHost2
              };
              try{await rr2.body?.cancel()}catch{}
            }catch(e){out.rewriteOriginalPortTest={applied:false,errorClass:String(e?.name||"Error")}}
          }
        }catch(e){out.rewriteHostTest={applied:false,errorClass:String(e?.name||"Error")}}
      }
      return new Response(JSON.stringify(out),{headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Cache-Control":"no-store"}});
    }catch(e){
      return new Response(JSON.stringify({status:0,errorClass:String(e?.name||"Error")} ),{headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Cache-Control":"no-store"}});
    }
  }
  let r=null,bodyText="",bodyBytes=0,headStatus=0,getStatus=0;
  try{r=await fetchWithTimeout(target,{method:"HEAD",headers},5000);headStatus=r.status}catch{}
  let finalUrl=r?.url||target,ct=(r?.headers.get("content-type")||"").toLowerCase();
  let type=detectMediaType(finalUrl,ct);
  // HEAD is frequently blocked by IPTV hosts, even when GET is allowed.
  // Retry with a small range and inspect only a short prefix of the body.
  if(!r||!r.ok||type==="http"){
    try{
      const getHeaders=new Headers(headers);
      getHeaders.set("Range","bytes=0-2047");
      const gr=await fetchWithTimeout(target,{method:"GET",headers:getHeaders},7000);
      r=gr;getStatus=gr.status;finalUrl=gr.url||target;ct=(gr.headers.get("content-type")||"").toLowerCase();
      const reader=gr.body?.getReader();
      if(reader){
        const chunk=await reader.read();
        if(chunk?.value){bodyBytes=chunk.value.byteLength;bodyText=new TextDecoder().decode(chunk.value.slice(0,4096));}
        try{await reader.cancel()}catch{}
      }
      type=detectMediaType(finalUrl,ct,bodyText);
    }catch{
      if(type==="http")type=detectMediaType(target,ct);
    }
  }
  const status=r?.status||0;
  const bodyLower=String(bodyText||"").toLowerCase();
  // Return safe response fingerprints only; never echo upstream body, URLs or credentials.
  const bodyTrim=String(bodyText||"").trimStart();
  let bodyClass="empty";
  if(bodyTrim){
    if(/^<!doctype html|^<html\\b/i.test(bodyTrim))bodyClass="html";
    else if(bodyTrim.charAt(0)==="{"||bodyTrim.charAt(0)==="["){try{JSON.parse(bodyTrim);bodyClass="json"}catch{bodyClass="text-or-json"}}
    else bodyClass="plain-text";
  }
  let finalHost="";
  try{finalHost=new URL(finalUrl).hostname}catch{}
  let errorHint="none";
  if(status===401)errorHint="unauthorized";
  else if(status===403){
    if(/token.{0,24}(expired|invalid)|expired.{0,24}token|invalid.{0,24}token/.test(bodyLower))errorHint="token-rejected";
    else if(/mac.{0,24}(invalid|blocked|not found)|device.{0,24}(not authorized|blocked)/.test(bodyLower))errorHint="device-or-session-rejected";
    else if(/cloudflare|cf-ray|attention required|checking your browser|web application firewall|request blocked by security/.test(bodyLower)||/cloudflare/i.test(String(r?.headers.get("server")||""))||!!r?.headers.get("cf-ray"))errorHint="edge-or-waf-block";
    else if(/ip address.{0,30}(blocked|blacklist|not allowed)|geo.?block|country.{0,20}(blocked|restricted)/.test(bodyLower))errorHint="ip-or-region-restricted";
    else if(/login|sign in|authentication required|session required/.test(bodyLower))errorHint="session-required";
    else if(/access denied|forbidden|not allowed/.test(bodyLower))errorHint="upstream-access-policy";
    else errorHint="forbidden-unspecified";
  }else if(status===404)errorHint="not-found";
  else if(status===429)errorHint="rate-limited";
  else if(status>=500)errorHint="upstream-server-error";
  else if(status===0)errorHint="network-or-timeout";
  return new Response(JSON.stringify({
    type,contentType:ct,status,headStatus,getStatus,errorHint,
    bodyClass,bodyBytes,finalHost,
    serverType:r?.headers.get("server")||"",
    viaPresent:!!r?.headers.get("via"),
    cfRayPresent:!!r?.headers.get("cf-ray"),
    wwwAuthenticatePresent:!!r?.headers.get("www-authenticate"),
    retryAfter:r?.headers.get("retry-after")||""
  }),{headers:{"Content-Type":"application/json","Cache-Control":"no-store","Access-Control-Allow-Origin":"*"}});
}

const NEWS_SOURCES = {
  highlights: {url:'https://www.24h.com.vn/video-highlight-c953.html', label:'HighLight 24h'},
  onplus: {url:'https://onplus.com.vn/', label:'Video thể thao · ON Plus'},
  replay: {url:'', label:'Xem lại · GetOut'}
};
// GetOut's BTV adapter reads the current base URL from this public text config.
// Restrict the result to the provider hosts found in the APK so a changed remote
// config cannot make the Worker fetch an arbitrary host.
const GETOUT_BTV_CONFIG_URL = 'https://raw.githubusercontent.com/leeshin5757/getout/main/txt/btv';
const GETOUT_BTV_ALLOWED_HOSTS = new Set(['bongplus.vip','www.bongplus.vip','bongtv.com','www.bongtv.com']);
let getoutBtvBaseCache = {at:0, base:'https://bongplus.vip'};
async function getGetOutBtvBase() {
  const now = Date.now();
  if (now - getoutBtvBaseCache.at < 300000 && getoutBtvBaseCache.base) return getoutBtvBaseCache.base;
  try {
    const configResponse = await fetch(GETOUT_BTV_CONFIG_URL, {
      headers:{'User-Agent':'Mozilla/5.0 (compatible; NM7TV/1.0)','Accept':'text/plain'},
      redirect:'follow', signal:AbortSignal.timeout(5000)
    });
    if (configResponse.ok) {
      const raw = (await configResponse.text()).trim();
      const parsed = new URL(raw);
      if (parsed.protocol === 'https:' && GETOUT_BTV_ALLOWED_HOSTS.has(parsed.hostname.toLowerCase()) && parsed.pathname === '/') {
        getoutBtvBaseCache = {at:now,base:parsed.origin};
        return parsed.origin;
      }
    }
  } catch (_) {}
  getoutBtvBaseCache.at = now;
  return getoutBtvBaseCache.base || 'https://bongplus.vip';
}
const newsCache = new Map();
async function newsResponse(url) {
  const source = url.searchParams.get('source') || 'highlights';
  const cfg = NEWS_SOURCES[source];
  const headersOut = {'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,HEAD,OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
  if (!cfg) return new Response(JSON.stringify({error:'unknown source',items:[]}), {status:400,headers:headersOut});
  const now = Date.now(), cached = newsCache.get(source);
  if (cached && now-cached.at < 120000) return new Response(JSON.stringify(cached.data), {headers:{...headersOut,'Cache-Control':'public, max-age=60'}});
  try {
    const providerBase = source === 'replay' ? await getGetOutBtvBase() : '';
    const sourceUrl = source === 'replay'
      ? new URL('/gateway-api/sp/sports/anon/getReplay?pageNo=1&pageSize=30',providerBase).href
      : cfg.url;
    const upstream = await fetch(sourceUrl,{headers:{'User-Agent':'Mozilla/5.0 (compatible; NM7TV/1.0)','Accept':source === 'replay' ? 'application/json' : 'text/html,application/xhtml+xml'},redirect:'follow', signal:AbortSignal.timeout(9000)});
    if (!upstream.ok) throw new Error('upstream-'+upstream.status);
    if (source === 'replay') {
      const payload = await upstream.json();
      const candidates = [];
      function collect(value, depth) {
        if (!value || depth > 7) return;
        if (Array.isArray(value)) { for (const item of value) collect(item, depth + 1); return; }
        if (typeof value !== 'object') return;
        const keys = Object.keys(value);
        if (keys.some(k => /homeTeam|awayTeam|videos|roomId/i.test(k))) candidates.push(value);
        for (const key of keys) if (value[key] && typeof value[key] === 'object') collect(value[key], depth + 1);
      }
      collect(payload, 0);
      const items = [], seen = new Set();
      for (const rec of candidates) {
        const home = rec.homeTeam || rec.home || rec.homeName || rec.homeTeamName || {};
        const away = rec.awayTeam || rec.away || rec.awayName || rec.awayTeamName || {};
        const homeName = typeof home === 'string' ? home : (home.name || home.teamName || '');
        const awayName = typeof away === 'string' ? away : (away.name || away.teamName || '');
        const title = String(rec.title || rec.matchName || rec.name || (homeName && awayName ? homeName + ' - ' + awayName : '') || 'Video xem lại trận đấu').trim();
        const videos = Array.isArray(rec.videos) ? rec.videos : [];
        const videoCandidate = videos.map(v => v && (v.url || v.playUrl || v.videoUrl || v.link)).find(v => typeof v === 'string' && /^https:\/\//i.test(v)) || '';
        const playbackUrl = /\.(m3u8|mp4)(?:$|[?#])/i.test(videoCandidate) ? videoCandidate : '';
        const rawHref = rec.url || rec.detailUrl || rec.webUrl || rec.link || videoCandidate || '';
        let href = '';
        try { if (rawHref) { const parsed = new URL(String(rawHref), 'https://www.bongtv.com/'); if (parsed.protocol === 'http:' || parsed.protocol === 'https:') href = parsed.href; } } catch {}
        if (!href || seen.has(href)) continue;
        seen.add(href);
        const homeLogo = typeof home === 'object' ? (home.logo || home.logoUrl || home.image || '') : '';
        const awayLogo = typeof away === 'object' ? (away.logo || away.logoUrl || away.image || '') : '';
        let image = '';
        try { image = new URL(homeLogo || awayLogo, 'https://www.bongtv.com/').href; } catch {}
        items.push({title, href, playbackUrl, image, source: 'Xem lại · GetOut', matchTime: rec.matchTime || rec.time || rec.startTime || ''});
        if (items.length >= 40) break;
      }
      const data = {source, sourceUrl:'https://www.bongtv.com/', updatedAt:new Date().toISOString(), items};
      newsCache.set(source,{at:now,data});
      return new Response(JSON.stringify(data),{headers:{...headersOut,'Cache-Control':'public, max-age=60'}});
    }
    const html = await upstream.text();
    const items=[], seen=new Set();
    const anchors=html.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi)||[];
    for (const block of anchors) {
      const hm=/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/i.exec(block);
      if(!hm) continue;
      let href; try{href=new URL(hm[1],cfg.url).href}catch{continue}
      if(!/^https?:$/.test(new URL(href).protocol)||seen.has(href)||href===cfg.url)continue;
      const im=/<img\b[^>]*>/i.exec(block);
      let image='';
      if(im){const sm=/(?:src|data-src|data-original)\s*=\s*["']([^"']+)["']/i.exec(im[0]);if(sm){try{image=new URL(sm[1],cfg.url).href}catch{}}}
      let title='';
      const tm=/\btitle\s*=\s*["']([^"']+)["']/i.exec(hm[0]);
      if(tm) title=tm[1];
      if(!title) title=block.replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/\s+/g,' ').trim();
      if(title.length<8||title.length>220)continue;
      if(source==='highlights'&&!/video|highlight|bàn thắng|bong da|bóng đá|trận/i.test(href+' '+title))continue;
      if(!image && !/video|highlight|match|tran|clip/i.test(href+' '+title))continue;
      seen.add(href);items.push({title,href,image,source:cfg.label});
      if(items.length>=40)break;
    }
    const data={source,sourceUrl:cfg.url,updatedAt:new Date().toISOString(),items};
    newsCache.set(source,{at:now,data});
    return new Response(JSON.stringify(data),{headers:{...headersOut,'Cache-Control':'public, max-age=60'}});
  } catch (e) {
    return new Response(JSON.stringify({source,sourceUrl:cfg.url,items:[],error:'Không lấy được danh sách từ nguồn. Hãy mở nguồn gốc hoặc thử lại.'}),{status:502,headers:{...headersOut,'Cache-Control':'no-store'}});
  }
}

export default {async fetch(request,env){const url=new URL(request.url),p=url.pathname,q=url.searchParams;if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors(new Headers())});try{if(p==='/api/news')return newsResponse(url);if(p==='/api/playlist')return playlistResponse(q.get('source')||'tv',q.get('default')||'',env,q.get('refresh')==='1');if(p.startsWith('/api/dash-resource/'))return dashResourceResponse(request,url);if(p==='/api/source')return sourceResponse(q,env);if(p==='/api/stream')return streamResponse(request,q);if(p==='/api/image')return imageResponse(q);if(p==='/api/license')return licenseResponse(request,q);if(p==='/api/probe')return probeResponse(request,q);if(p==='/'||p==='/tv')return env.ASSETS.fetch(new Request(new URL('/index.html',request.url),request));if(p.startsWith('/web-tv/'))return env.ASSETS.fetch(new Request(new URL(p.replace(/^\/web-tv\//,'/'),request.url),request));return env.ASSETS.fetch(request)}catch(e){return new Response(JSON.stringify({error:'worker error',message:String(e?.message||e)}),{status:502,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}})}}};

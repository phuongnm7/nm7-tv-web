const SOURCES = {
  tv: [
    'https://phuongnm7-playlist.phuongnm7-iptv.workers.dev/',
    'https://raw.githubusercontent.com/phuongnm7/Iptv-phuongnm7/main/IPTV_Gop_VMTTV_vAppTV.m3u',
    'https://iptv-live-merge.phuongnm7-iptv.workers.dev/playlist.m3u'
  ],
  sport: [
    'https://raw.githubusercontent.com/phuongnm7/Iptv-phuongnm7/main/sports-auto.m3u?utm_source=chatgpt.com',
    'https://thethaonm7.phuongnm7-iptv.workers.dev/playlist.m3u'
  ]
};
const BUILTIN = {
  vtv1hd: [
    {url:'https://live-a.fptplay53.net/live/media/vtv1/live247-hls-avc/index.m3u8',ref:'https://fptplay.vn/',ua:'Mozilla/5.0 (Linux; Android 15; SM-S918B) AppleWebKit/537.36 Chrome/135.0.7049.111 Mobile Safari/537.36 vAppTV/1.0.2',headers:{Origin:'https://fptplay.vn'},hls:true},
    {url:'https://vips-livecdn.fptplay.net/live/media/vtv1/live247-hls-avc/vtv1-avc1_5600000=10000-mp4a_131600=20000.m3u8',ref:'https://fptplay.vn/',ua:'Mozilla/5.0 (Linux; Android 15; SM-S918B) AppleWebKit/537.36 Chrome/135.0.7049.111 Mobile Safari/537.36 vAppTV/1.0.2',headers:{Origin:'https://fptplay.vn'},hls:true},
    {url:'https://vtvgolive-failover.vtvdigital.vn/vtvgo/vtv1-manifest.m3u8',ref:'https://vtvgo.vn/',ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36',headers:{Origin:'https://vtvgo.vn'},hls:true}
  ],
  vtvcab3hd: [
    {url:'https://856175157.r.vtvcdn.com/ondrm/THETHAO_HD/m30_index.m3u8',ref:'',ua:'KhoaTivi',hls:true,forceProxy:true},
    {url:'https://e3.endpoint.cdn.sctvonline.vn/hls/vtvcab3/index.m3u8',ref:'http://sctvonline.vn/',ua:'ReactNativeVideo/3.4.4 (Linux;Android 9) ExoPlayerLib/2.13.3',hls:true,forceProxy:true}
  ],
  vtvcab16hd: [
    {url:'https://livevliatmcdw.seenow.vn/live/data8/BONGDA_HD/Live_DASHDRM/BONGDA_HD.mpd',ref:'',ua:'Dalvik/2.1.0',headers:{},type:'dash',dash:true,hls:false,drm:{type:'clearkey',key:'f3d73b3a9b89462ebf7911004ea3b3b9:2e547a81ff90aa02648cb9e3f79e7339'},forceProxy:true},
    {url:'https://livevlisctcdnw.seenow.vn/mean/BONGDA_HD/manifest.mpd',ref:'',ua:'Dalvik/2.1.0',headers:{},type:'dash',dash:true,hls:false,drm:{type:'clearkey',key:'f69bf028397e4ecfafce84abb7c5fe2b:25028aad0e2003b2785cf5196a4e2fa1'},forceProxy:true}
  ]
};
const playlistCache=new Map(),CACHE_TTL=30000;
function isHttp(u){return /^https?:\/\//i.test(String(u||''))}
function safeUrl(u,b){try{return new URL(u,b).toString()}catch{return String(u||'')}}
function score(u){let s=0;if(/\.m3u8(?:$|[?#])/i.test(u))s+=100;if(/\.m3u(?:$|[?#])/i.test(u))s+=80;if(/\/hls\//i.test(u))s+=30;if(/playlist|index\.m3u|manifest/i.test(u))s+=20;if(/\.(mp4|ts)(?:$|[?#])/i.test(u))s+=10;if(/tth\.vn\//i.test(u))s-=50;return s}
function addBuiltin(c){
  const key=String(c.id||'').toLowerCase().trim(),name=String(c.name||'').toLowerCase().replace(/[^a-z0-9]+/g,'');let extra=BUILTIN[key]||[];
  if(!extra.length&&(key==='vtv1'||name==='vtv1'||name.startsWith('vtv1')))extra=BUILTIN.vtv1hd;
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
    c.candidates.sort((a,b)=>score(String(b.url||''))-score(String(a.url||'')));
  }
  return out
}
function parseM3U(t,base=''){
  const lines=String(t||'').replace(/^\uFEFF/,'').split(/\r?\n/),out=[];let m=null,ua='',ref='',origin='',manifestType='',licenseType='',licenseKey='';
  const finish=()=>{if(m&&m.candidates.length)out.push(m);m=null};
  for(const raw of lines){
    const l=raw.trim();if(!l)continue;
    if(l.startsWith('#EXTINF:')){finish();const p=l.indexOf(','),h=p<0?l:l.slice(0,p);m={name:p<0?'Kênh':l.slice(p+1).trim(),group:(/group-title="([^"]*)"/i.exec(h)||[])[1]||'Khác',logo:(/tvg-logo="([^"]*)"/i.exec(h)||[])[1]||'',id:(/tvg-id="([^"]*)"/i.exec(h)||[])[1]||'',candidates:[]};ua='';ref='';origin='';manifestType='';licenseType='';licenseKey=''}
    else if(m&&l.startsWith('#EXTVLCOPT:')){const um=/http-user-agent=(?:"([^"]+)"|([^\s]+))/i.exec(l),rm=/(?:http-referrer|http-referer)=(?:"([^"]+)"|([^\s]+))/i.exec(l),om=/http-origin=(?:"([^"]+)"|([^\s]+))/i.exec(l);if(um)ua=um[1]||um[2];if(rm)ref=rm[1]||rm[2];if(om)origin=om[1]||om[2]}
    else if(m&&l.startsWith('#KODIPROP:')){const mt=/inputstream\.adaptive\.manifest_type=(.+)/i.exec(l),lt=/inputstream\.adaptive\.license_type=(.+)/i.exec(l),lk=/inputstream\.adaptive\.license_key=(.+)/i.exec(l);if(mt)manifestType=mt[1].trim();if(lt)licenseType=lt[1].trim();if(lk)licenseKey=lk[1].trim()}
    else if(m&&!l.startsWith('#')&&/^(https?|rtsp|rtmp|udp|srt|rtp):/i.test(l)){const ps=l.split('|');let r=ref,u=ua,o=origin;for(let i=1;i<ps.length;i++){const z=ps[i],eq=z.indexOf('=');if(eq<0)continue;const k=z.slice(0,eq),v=z.slice(eq+1);if(/^referer(?:er)?$/i.test(k))r=v;if(/^http-user-agent$/i.test(k))u=v;if(/^origin$/i.test(k))o=v}const lm=manifestType.toLowerCase();m.candidates.push({url:safeUrl(ps[0],base),ref:r,ua:u,headers:o?{Origin:o}:{},type:lm==='mpd'?'dash':lm==='hls'?'hls':'',dash:lm==='mpd',hls:lm==='hls'||/\.(m3u8|m3u)(?:$|[?#])/i.test(ps[0])||/playlist|index\.m3u|manifest/i.test(ps[0]),drm:licenseType&&licenseKey?{type:licenseType,key:licenseKey}:null})}
  }
  finish();
  const merged=[],byKey=new Map();
  for(const c of out){c.id=c.id||c.name;const gid=String(c.id||'').toLowerCase().trim(),nameKey=String(c.name||'').toLowerCase().replace(/\b(server|source|nguon)\s*\d+\b/g,'').replace(/[^a-z0-9]+/g,' ').trim(),key=(c.group||'')+'|'+(gid||nameKey);if(!byKey.has(key)){byKey.set(key,{...c,candidates:c.candidates.slice()});merged.push(byKey.get(key))}else{const x=byKey.get(key),seen=new Set(x.candidates.map(v=>v.url));for(const v of c.candidates)if(v.url&&!seen.has(v.url)){x.candidates.push(v);seen.add(v.url)}if(!x.logo&&c.logo)x.logo=c.logo}}
  for(const c of merged){addBuiltin(c);c.candidates.sort((a,b)=>score(b.url)-score(a.url))}
  return merged;
}
function headersFromQuery(req,q){const h=new Headers();h.set('User-Agent',q.get('ua')||req.headers.get('user-agent')||'NM7-TV-Web/1.0.69');if(q.get('r'))h.set('Referer',q.get('r'));for(const k of ['range','accept','accept-language','origin','if-none-match','if-modified-since']){const v=req.headers.get(k);if(v)h.set(k,v)}try{const extra=JSON.parse(q.get('h')||'{}');for(const [k,v] of Object.entries(extra||{})){const lk=k.toLowerCase();if(['host','connection','content-length','cookie','user-agent','referer'].includes(lk))continue;if(typeof v==='string'&&v.length<4000)h.set(k,v)}}catch{}return h}
function apiUrl(path,u,q){let x=path+'?u='+encodeURIComponent(u);for(const k of ['r','ua','h']){const v=q.get(k)||'';if(v)x+='&'+k+'='+encodeURIComponent(v)}return x}
function rewriteHls(text,finalUrl,q){const px=u=>{try{const abs=safeUrl(u,finalUrl);if(/^data:|^blob:/i.test(abs))return u;return apiUrl('/api/stream',abs,q)}catch{return u}};text=String(text||'').replace(/URI\s*=\s*"([^"]+)"/gi,(m,u)=>'URI="'+px(u)+'"');const lines=text.split(/\r?\n/);for(let i=0;i<lines.length;i++){const z=lines[i].trim();if(z&&!z.startsWith('#')&&!/^data:|^blob:/i.test(z))lines[i]=px(z)}return lines.join('\n')}
function rewriteDash(text,finalUrl){
  text=String(text||'');
  const base=safeUrl('./',finalUrl);
  if(/<BaseURL\b[^>]*\/\s*>/i.test(text)){
    return text.replace(/<BaseURL\b[^>]*\/\s*>/i,'<BaseURL>'+base+'</BaseURL>');
  }
  if(/<BaseURL\b[^>]*>[\s\S]*?<\/BaseURL>/i.test(text)){
    return text.replace(/<BaseURL\b[^>]*>[\s\S]*?<\/BaseURL>/i,'<BaseURL>'+base+'</BaseURL>');
  }
  return text.replace(/(<MPD\b[^>]*>)/i,'$1<BaseURL>'+base+'</BaseURL>');
}
function cors(h){h.set('Access-Control-Allow-Origin','*');h.set('Access-Control-Allow-Methods','GET,HEAD,POST,OPTIONS');h.set('Access-Control-Allow-Headers','Range,Accept,Content-Type,Origin,Referer,User-Agent,X-Requested-With');h.set('Access-Control-Expose-Headers','Content-Length,Content-Range,Accept-Ranges,Content-Type,ETag');return h}
async function fetchWithTimeout(url,init={},ms=9000){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{return await fetch(url,{...init,signal:c.signal,redirect:'follow',cache:'no-store'})}finally{clearTimeout(t)}}
async function playlistResponse(source,exactDefault=false,env=null){
  if(!SOURCES[source])return new Response(JSON.stringify({channels:[],source}),{status:400,headers:{'Content-Type':'application/json'}});
  const cacheKey=(source==='tv'&&exactDefault)?'tv:android1069':source;const now=Date.now(),hit=playlistCache.get(cacheKey);if(hit&&now-hit.time<CACHE_TTL)return new Response(JSON.stringify({channels:hit.channels,source,cached:true}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  const errors=[];
  const targets=(source==='tv'&&exactDefault)?[SOURCES.tv[0]]:SOURCES[source];
  for(const target of targets){try{
    const init={headers:{'User-Agent':'NM7-TV-Web/1.0.69','Accept':'application/vnd.apple.mpegurl,application/json,text/plain,*/*'}};
    const r=(source==='tv'&&exactDefault&&env?.PLAYLIST_SOURCE)
      ?await env.PLAYLIST_SOURCE.fetch(new Request(target,init))
      :await fetchWithTimeout(target,init,7000);if(!r.ok)throw new Error('HTTP '+r.status);const body=await r.text();let channels=parseM3U(body,target);if(!channels.length){try{const j=JSON.parse(body),arr=Array.isArray(j)?j:(Array.isArray(j.channels)?j.channels:Array.isArray(j.data)?j.data:[]);channels=arr.map(x=>({name:String(x.name||x.title||x.channel||'Kênh'),group:String(x.group||x.groupTitle||x.category||'Khác'),logo:String(x.logo||x.tvgLogo||''),id:String(x.id||x.tvgId||x.name||x.title||''),candidates:Array.isArray(x.candidates)?x.candidates:(x.url||x.stream||x.src?[{url:x.url||x.stream||x.src,ref:x.ref||x.referer||'',ua:x.ua||x.userAgent||'',headers:x.headers||{},type:x.type||'',dash:x.type==='dash',hls:x.type==='hls'}]:[])}))}catch{}}if(!channels.length)throw new Error('playlist rỗng');enrichChannels(channels);playlistCache.set(cacheKey,{time:now,channels});return new Response(JSON.stringify({channels,source,cached:false,upstream:target}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}})}catch(e){errors.push(target+': '+e.message)}}
  if(hit&&hit.channels?.length)return new Response(JSON.stringify({channels:hit.channels,source,cached:true,stale:true,error:errors.join(' | ')}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  return new Response(JSON.stringify({channels:[],source,error:errors.join(' | ')}),{status:504,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
}
async function streamResponse(request,q){
  const target=q.get('u');if(!isHttp(target))return new Response('bad url',{status:400});const r=await fetch(target,{method:request.method==='HEAD'?'HEAD':'GET',headers:headersFromQuery(request,q),redirect:'follow',cache:'no-store'}),ct=(r.headers.get('content-type')||'').toLowerCase(),finalUrl=r.url||target,looksHls=ct.includes('mpegurl')||/\.(m3u8|m3u)(?:$|[?#])/i.test(finalUrl),looksDash=ct.includes('dash+xml')||/\.mpd(?:$|[?#])/i.test(finalUrl),h=cors(new Headers(r.headers));h.set('Cache-Control','no-store');if(looksHls&&r.ok){const body=await r.text();h.set('Content-Type','application/vnd.apple.mpegurl; charset=utf-8');return new Response(rewriteHls(body,finalUrl,q),{status:r.status,headers:h})}if(looksDash&&r.ok){const body=await r.text();h.set('Content-Type','application/dash+xml; charset=utf-8');return new Response(rewriteDash(body,finalUrl),{status:r.status,headers:h})}if(!h.get('Content-Type')){const low=finalUrl.toLowerCase();h.set('Content-Type',/\.mp4(?:$|[?#])/i.test(low)?'video/mp4':/\.flv(?:$|[?#])/i.test(low)?'video/x-flv':/\.(ts|m2ts)(?:$|[?#])/i.test(low)?'video/mp2t':'application/octet-stream')}return new Response(r.body,{status:r.status,headers:h})
}
async function imageResponse(q){const u=q.get('u');if(!isHttp(u))return new Response('bad image url',{status:400});const h=new Headers({'User-Agent':q.get('ua')||'NM7-TV-Web/1.0.69'});if(q.get('r'))h.set('Referer',q.get('r'));const r=await fetch(u,{headers:h,redirect:'follow',cache:'no-store'});if(!r.ok)return new Response('upstream image HTTP '+r.status,{status:r.status});const ct=r.headers.get('content-type')||'';if(!/^image\//i.test(ct)&&!ct.toLowerCase().includes('svg'))return new Response('not an image',{status:415});const ab=await r.arrayBuffer();if(ab.byteLength>2*1024*1024)return new Response('image too large',{status:413});const out=cors(new Headers());out.set('Content-Type',ct);out.set('Content-Length',String(ab.byteLength));out.set('Cache-Control','public,max-age=86400');return new Response(ab,{status:200,headers:out})}
async function licenseResponse(request,q){const u=q.get('u');if(!isHttp(u))return new Response('bad url',{status:400});const h=headersFromQuery(request,q),ua=q.get('ua')||'',ref=q.get('r')||'';if(ua)h.set('User-Agent',ua);if(ref)h.set('Referer',ref);let body;if(request.method==='POST'){const raw=await request.text();if(q.get('base64')==='1'){try{body=Uint8Array.from(atob(raw),c=>c.charCodeAt(0));h.set('Content-Type','application/octet-stream')}catch{return new Response('bad base64 body',{status:400})}}else body=raw}let r=await fetch(u,{method:request.method==='POST'?'POST':'GET',headers:h,body,redirect:'follow',cache:'no-store'});if(!r.ok&&request.method==='POST')r=await fetch(u,{method:'GET',headers:h,redirect:'follow',cache:'no-store'});return new Response(r.body,{status:r.status,headers:cors(new Headers(r.headers))})}
async function sourceResponse(q){
  const target=String(q.get('u')||'').trim();
  if(!isHttp(target))return new Response(JSON.stringify({channels:[],error:'bad url'}),{status:400,headers:cors(new Headers({'Content-Type':'application/json'}))});
  try{
    const r=await fetchWithTimeout(target,{headers:{'User-Agent':'NM7-TV-Web/1.0.69','Accept':'application/vnd.apple.mpegurl,application/json,text/plain,*/*'}},10000);
    if(!r.ok)throw new Error('HTTP '+r.status);
    const body=await r.text();
    let channels=parseM3U(body,target);
    if(!channels.length){
      try{
        const j=JSON.parse(body);
        const arr=Array.isArray(j)?j:(Array.isArray(j.channels)?j.channels:Array.isArray(j.data)?j.data:[]);
        channels=arr.map(x=>({
          name:String(x.name||x.title||x.channel||'Kênh'),
          group:String(x.group||x.groupTitle||x.category||'Khác'),
          logo:String(x.logo||x.tvgLogo||''),
          id:String(x.id||x.tvgId||x.name||x.title||''),
          candidates:Array.isArray(x.candidates)?x.candidates:(x.url||x.stream||x.src?[{url:safeUrl(x.url||x.stream||x.src,target),ref:x.ref||x.referer||'',ua:x.ua||x.userAgent||'',headers:x.headers||{},type:x.type||'',dash:x.type==='dash',hls:x.type==='hls'}]:[])
        }));
      }catch{}
    }
    if(!channels.length)throw new Error('playlist rỗng');
    enrichChannels(channels);
    return new Response(JSON.stringify({channels,source:'custom',upstream:r.url||target}),{headers:cors(new Headers({'Content-Type':'application/json','Cache-Control':'no-store'}))});
  }catch(e){
    return new Response(JSON.stringify({channels:[],source:'custom',error:String(e?.message||e)}),{status:502,headers:cors(new Headers({'Content-Type':'application/json','Cache-Control':'no-store'}))});
  }
}
async function probeResponse(q){const u=q.get('u');if(!isHttp(u))return new Response(JSON.stringify({type:'http',error:'bad url'}),{status:400,headers:{'Content-Type':'application/json'}});const h=new Headers({'User-Agent':q.get('ua')||'NM7-TV-Web/1.0.69'});if(q.get('r'))h.set('Referer',q.get('r'));try{const r=await fetch(u,{method:'HEAD',headers:h,redirect:'follow',cache:'no-store'}).catch(()=>null),finalUrl=r?.url||u,ct=(r?.headers.get('content-type')||'').toLowerCase();let type='http';if(ct.includes('dash+xml')||/\.mpd(?:$|[?#])/i.test(finalUrl))type='dash';else if(ct.includes('mpegurl')||/\.(m3u8|m3u)(?:$|[?#])/i.test(finalUrl))type='hls';else if(ct.includes('flv')||/\.flv(?:$|[?#])/i.test(finalUrl))type='flv';else if(ct.includes('mp2t')||/\.ts(?:$|[?#])/i.test(finalUrl))type='mpegts';else if(ct.includes('video/mp4')||/\.mp4(?:$|[?#])/i.test(finalUrl))type='mp4';return new Response(JSON.stringify({type,finalUrl,resolvedUrl:finalUrl,contentType:ct,serverType:r?.headers.get('server')||''}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}})}catch{return new Response(JSON.stringify({type:'http',finalUrl:u,resolvedUrl:u,error:'probe failed'}),{headers:{'Content-Type':'application/json'}})}}
export default {async fetch(request,env){const url=new URL(request.url),p=url.pathname,q=url.searchParams;if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors(new Headers())});try{if(p==='/api/playlist')return playlistResponse(q.get('source')||'tv',q.get('default')==='android1069',env);if(p==='/api/source')return sourceResponse(q);if(p==='/api/stream')return streamResponse(request,q);if(p==='/api/image')return imageResponse(q);if(p==='/api/license')return licenseResponse(request,q);if(p==='/api/probe')return probeResponse(q);if(p==='/'||p==='/tv')return env.ASSETS.fetch(new Request(new URL('/index.html',request.url),request));if(p.startsWith('/web-tv/'))return env.ASSETS.fetch(new Request(new URL(p.replace(/^\/web-tv\//,'/'),request.url),request));return env.ASSETS.fetch(request)}catch(e){return new Response(JSON.stringify({error:'worker error',message:String(e?.message||e)}),{status:502,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}})}}};

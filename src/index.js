const PLAYLIST_SOURCES = {
  tv: [
    "https://phuongnm7-playlist.phuongnm7-iptv.workers.dev/",
    "https://iptv-live-merge.phuongnm7-iptv.workers.dev/playlist.m3u",
    "https://raw.githubusercontent.com/phuongnm7/Iptv-phuongnm7/main/IPTV_Gop_VMTTV_vAppTV.m3u"
  ],
  sport: [
    "https://thethaonm7.phuongnm7-iptv.workers.dev/playlist.m3u"
  ]
};

const BUILTIN = {
  vtv1hd: [
    {url:"https://vtvgolive-failover.vtvdigital.vn/vtvgo/vtv1-manifest.m3u8",ref:"",ua:"Mozilla/5.0",hls:true},
    {url:"https://live-a.fptplay53.net/live/media/vtv1/live247-hls-avc/index.m3u8",ref:"",ua:"Mozilla/5.0",hls:true}
  ],
  vtvcab3hd: [
    {url:"https://e3.endpoint.cdn.sctvonline.vn/hls/vtvcab3/sd2/index.m3u8",ref:"http://sctvonline.vn/",ua:"ReactNativeVideo/3.4.4 (Linux;Android 9) ExoPlayerLib/2.13.3",hls:true},
    {url:"https://livevlive.vtvcab.vn/hls/OS_THETHAO_HD/sc-gaFEAA/m30_index.m3u8",ref:"",ua:"Mozilla/5.0",hls:true}
  ],
  vtvcab6hd: [
    {url:"https://e3.endpoint.cdn.sctvonline.vn/hls/vtvcab6/sd2/index.m3u8",ref:"http://sctvonline.vn/",ua:"ReactNativeVideo/3.4.4 (Linux;Android 9) ExoPlayerLib/2.13.3",hls:true},
    {url:"https://livevlive.vtvcab.vn/hls/OS_HAY_TV/sc-gaFEAA/m30_index.m3u8",ref:"",ua:"Mozilla/5.0",hls:true}
  ],
  vtvcab16hd: [
    {url:"https://e1.endpoint.cdn.sctvonline.vn/hls/vtvcab16/sd2/index.m3u8",ref:"http://sctvonline.vn/",ua:"ReactNativeVideo/3.4.4 (Linux;Android 9) ExoPlayerLib/2.13.3",hls:true},
    {url:"https://livevlive.vtvcab.vn/hls/OS_BONGDA_HD/sc-gaFEAA/m30_index.m3u8",ref:"",ua:"Mozilla/5.0",hls:true}
  ],
  vtvcab18hd: [
    {url:"https://livevlive.vtvcab.vn/hls/OS_THETHAO_TINTUC_HD/sc-gaFEAA/m30_index.m3u8",ref:"",ua:"Mozilla/5.0",hls:true}
  ]
};

function corsHeaders(extra={}) {
  return {
    "Access-Control-Allow-Origin":"*",
    "Access-Control-Allow-Methods":"GET,HEAD,POST,OPTIONS",
    "Access-Control-Allow-Headers":"Range,Accept,Content-Type,Origin,Referer,User-Agent,X-Requested-With",
    "Access-Control-Expose-Headers":"Content-Length,Content-Range,Accept-Ranges,Content-Type,ETag",
    ...extra
  };
}

function json(data,status=200,extra={}) {
  return new Response(JSON.stringify(data),{
    status,
    headers:corsHeaders({"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...extra})
  });
}

function bad(message,status=400){ return new Response(message,{status,headers:corsHeaders({"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store"})}); }

function headerValue(request,name, fallback=""){ return request.headers.get(name)||fallback; }

function safeProxyHeaders(request,urlObj) {
  const h = new Headers();
  h.set("User-Agent", urlObj.searchParams.get("ua") || headerValue(request,"User-Agent","Mozilla/5.0"));
  const ref=urlObj.searchParams.get("r"); if(ref) h.set("Referer",ref);
  for(const k of ["Range","Accept","Accept-Language","Origin","If-None-Match","If-Modified-Since"]){
    const v=request.headers.get(k); if(v) h.set(k,v);
  }
  try{
    const extra=JSON.parse(urlObj.searchParams.get("h")||"{}");
    for(const [k,v] of Object.entries(extra||{})){
      const lk=k.toLowerCase();
      if(["host","connection","content-length","cookie","user-agent","referer"].includes(lk)) continue;
      if(typeof v==="string" && v.length<4000) h.set(k,v);
    }
  }catch{}
  return h;
}

function appendProxy(url, q, extra={}) {
  const u=new URL("/__nm7/stream", q.origin);
  u.searchParams.set("u",url);
  const r=q.searchParams.get("r"), ua=q.searchParams.get("ua"), h=q.searchParams.get("h"), o=q.searchParams.get("o");
  if(r)u.searchParams.set("r",r);
  if(ua)u.searchParams.set("ua",ua);
  if(h)u.searchParams.set("h",h);
  if(o)u.searchParams.set("o",o);
  for(const [k,v] of Object.entries(extra||{}))u.searchParams.set(k,v);
  return u.toString();
}

function parsePlaylist(text, base) {
  const lines=String(text||"").replace(/^\uFEFF/,"").split(/\r?\n/), out=[];
  let m=null, ua="", ref="", origin="", manifestType="", licenseType="", licenseKey="";
  const finish=()=>{if(m&&m.candidates.length)out.push(m)};
  for(const raw of lines){
    const l=raw.trim(); if(!l) continue;
    if(l.startsWith("#EXTINF:")){
      finish();
      const p=l.indexOf(","), h=p<0?l:l.slice(0,p);
      m={name:p<0?"Kênh":l.slice(p+1).trim(),group:(/group-title="([^"]*)"/i.exec(h)||[])[1]||"Khác",logo:(/tvg-logo="([^"]*)"/i.exec(h)||[])[1]||"",id:(/tvg-id="([^"]*)"/i.exec(h)||[])[1]||"",candidates:[]};
      ua="";ref="";origin="";manifestType="";licenseType="";licenseKey="";
      continue;
    }
    if(!m)continue;
    if(l.startsWith("#EXTVLCOPT:")){
      const um=/http-user-agent=(?:"([^"]+)"|([^\s]+))/i.exec(l);
      const rm=/(?:http-referrer|http-referer)=(?:"([^"]+)"|([^\s]+))/i.exec(l);
      const om=/http-origin=(?:"([^"]+)"|([^\s]+))/i.exec(l);
      if(um)ua=um[1]||um[2]; if(rm)ref=rm[1]||rm[2]; if(om)origin=om[1]||om[2];
      continue;
    }
    if(l.startsWith("#KODIPROP:")){
      const mt=/inputstream\.adaptive\.manifest_type=(.+)/i.exec(l), lt=/inputstream\.adaptive\.license_type=(.+)/i.exec(l), lk=/inputstream\.adaptive\.license_key=(.+)/i.exec(l);
      if(mt)manifestType=mt[1].trim(); if(lt)licenseType=lt[1].trim(); if(lk)licenseKey=lk[1].trim();
      continue;
    }
    if(l.startsWith("#") || !/^(https?|rtsp|rtmp|udp|srt|rtp):/i.test(l))continue;
    const ps=l.split("|");
    let url=ps[0], r=ref, u=ua;
    try { url=new URL(url,base).toString(); } catch {}
    for(let i=1;i<ps.length;i++){
      const eq=ps[i].indexOf("="); if(eq<1)continue;
      const k=ps[i].slice(0,eq), v=decodeURIComponent(ps[i].slice(eq+1));
      if(/^referer$/i.test(k))r=v; else if(/^http-user-agent$/i.test(k))u=v; else if(/^origin$/i.test(k))origin=v;
    }
    const lm=manifestType.toLowerCase();
    const cand={url,ref:r,ua:u,headers:origin?{Origin:origin}:{},type:lm==="mpd"?"dash":lm==="hls"?"hls":"",dash:lm==="mpd",hls:lm==="hls"||/\.m3u8?(?:$|\?)/i.test(url)||/playlist|index\.m3u|manifest/i.test(url),drm:licenseType&&licenseKey?{type:licenseType,key:licenseKey}:null};
    m.candidates.push(cand);
  }
  finish();
  const merged=[],byKey=new Map();
  for(const c of out){
    c.id=c.id||c.name;
    const gid=(c.id||"").toLowerCase().trim();
    const nameKey=(c.name||"").toLowerCase().replace(/\b(server|source|nguon)\s*\d+\b/g,"").replace(/[^a-z0-9]+/g," ").trim();
    const key=(c.group||"")+"|"+(gid||nameKey);
    if(!byKey.has(key)){ byKey.set(key,{...c,candidates:[...c.candidates]}); merged.push(byKey.get(key)); }
    else {
      const cur=byKey.get(key), seen=new Set(cur.candidates.map(x=>x.url));
      for(const x of c.candidates)if(x.url&&!seen.has(x.url)){cur.candidates.push(x);seen.add(x.url)}
      if(!cur.logo&&c.logo)cur.logo=c.logo;
    }
  }
  for(const c of merged){ addBuiltin(c); c.candidates.sort((a,b)=>score(b.url)-score(a.url)); }
  return merged;
}

function addBuiltin(c){
  const key=(c.id||"").toLowerCase().trim(), rawName=(c.name||"").toLowerCase(), name=rawName.replace(/[^a-z0-9]+/g,"");
  let extra=BUILTIN[key]||[];
  if(!extra.length&&(key==="vtv1"||key==="vtv1.vn"||name==="vtv1"||name.includes("vtv1")||name.startsWith("vtv1")))extra=BUILTIN.vtv1hd;
  if(!extra.length&&(key==="vtvcab3hd"||name.startsWith("onsport")||name.includes("vtvcab3")))extra=BUILTIN.vtvcab3hd;
  if(!extra.length&&(key==="vtvcab6hd"||key==="onsportsplus"||/on\s*sports\s*\+/i.test(rawName)||name.includes("vtvcab6")))extra=BUILTIN.vtvcab6hd;
  if(!extra.length&&(key==="vtvcab16hd"||name.startsWith("onfootball")||name.includes("vtvcab16")))extra=BUILTIN.vtvcab16hd;
  if(!extra.length&&(key==="vtvcab18hd"||name.startsWith("onsportsnews")||name.includes("vtvcab18")))extra=BUILTIN.vtvcab18hd;
  const seen=new Set((c.candidates||[]).map(x=>x.url));
  for(const x of extra)if(!seen.has(x.url)){c.candidates.push(x);seen.add(x.url)}
}

function score(u){let s=0;if(/\.m3u8(?:$|\?)/i.test(u))s+=100;if(/\.m3u(?:$|\?)/i.test(u))s+=80;if(/\/hls\//i.test(u))s+=30;if(/playlist|index\.m3u|manifest/i.test(u))s+=20;if(/\.(mp4|ts)(?:$|\?)/i.test(u))s+=10;if(/tth\.vn\//i.test(u))s-=50;return s}

async function fetchText(url){
  const ac=new AbortController(); const timer=setTimeout(()=>ac.abort(),9000);
  try{
    const r=await fetch(url,{redirect:"follow",cache:"no-store",signal:ac.signal,headers:{"User-Agent":"NM7-TV-Web/1.0","Accept":"application/vnd.apple.mpegurl,text/plain,*/*"}});
    if(!r.ok)throw new Error("HTTP "+r.status);
    return {text:await r.text(),url:r.url||url};
  } finally {clearTimeout(timer)}
}

let playlistCache={};
async function playlistAPI(request){
  const source=new URL(request.url).searchParams.get("source"), targets=PLAYLIST_SOURCES[source];
  if(!targets)return json({channels:[],source},400);
  const hit=playlistCache[source], now=Date.now();
  if(hit&&now-hit.time<30000)return json({channels:hit.channels,source,cached:true});
  const results=await Promise.all(targets.map(async target=>{
    try{
      const {text}=await fetchText(target);
      const channels=parsePlaylist(text,target);
      for(const c of channels){
        const out=[];
        for(const x of c.candidates||[]){
          if(!/^https?:/i.test(x.url)) continue;
          const u=new URL("/__nm7/stream",request.url);
          u.searchParams.set("u",x.url);
          if(x.ref)u.searchParams.set("r",x.ref);
          if(x.ua)u.searchParams.set("ua",x.ua);
          if(x.headers&&Object.keys(x.headers).length)u.searchParams.set("h",JSON.stringify(x.headers));
          out.push({...x,proxy:u.toString()});
        }
        c.candidates=out;
      }
      if(!channels.length)throw new Error("playlist rỗng");
      return {target,channels};
    }catch(e){return {target,error:String(e)}}
  }));
  const good=results.find(x=>x.channels?.length);
  if(good){playlistCache[source]={time:now,channels:good.channels};return json({channels:good.channels,source,cached:false,upstream:good.target});}
  const errors=results.filter(x=>x.error).map(x=>x.target+": "+x.error).join(" | ");
  if(hit)return json({channels:hit.channels,source,cached:true,stale:true,error:errors});
  return json({channels:[],source,error:errors},504);
}

function rewriteHls(text, finalUrl, requestUrl){
  const px=(u)=>{
    try{
      const abs=new URL(u,finalUrl).toString();
      if(/^data:|^blob:/i.test(abs))return u;
      const q=new URL(requestUrl);
      return appendProxy(abs,q);
    }catch{return u}
  };
  text=text.replace(/URI\s*=\s*"([^"]+)"/gi,(m,u)=>'URI="'+px(u)+'"');
  const lines=text.split(/\r?\n/);
  for(let i=0;i<lines.length;i++){const z=lines[i].trim();if(z&&!z.startsWith("#")&&!/^data:|^blob:/i.test(z))lines[i]=px(z)}
  return lines.join("\n");
}

function rewriteDash(text,finalUrl){
  const hasBase=/<BaseURL(?:\s|>)/i.test(text);
  const base=(()=>{try{return new URL(".",finalUrl).toString()}catch{return finalUrl}})();
  if(hasBase)return text.replace(/(<BaseURL[^>]*>)([^<]*)(<\/BaseURL>)/gi,(m,a,u,b)=>{try{return a+new URL(u.trim(),finalUrl).toString()+b}catch{return m}});
  return text.replace(/(<MPD\b[^>]*>)/i,"$1<BaseURL>"+base+"</BaseURL>");
}

async function streamAPI(request){
  const q=new URL(request.url), target=q.searchParams.get("u");
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:corsHeaders()});
  if(!target||!/^(https?):/i.test(target))return bad("bad url");
  try{
    const headers=safeProxyHeaders(request,q);
    const r=await fetch(target,{redirect:"follow",cache:"no-store",headers});
    const ct=(r.headers.get("content-type")||"").toLowerCase(), finalUrl=r.url||target;
    const looksHls=ct.includes("mpegurl")||/\.(m3u8|m3u)(?:$|\?)/i.test(finalUrl);
    const looksDash=ct.includes("dash+xml")||/\.mpd(?:$|\?)/i.test(finalUrl);
    if(looksHls){
      const body=await r.text();
      return new Response(rewriteHls(body,finalUrl,request.url),{status:r.status,headers:corsHeaders({"Content-Type":"application/vnd.apple.mpegurl; charset=utf-8","Cache-Control":"no-store"})});
    }
    if(looksDash){
      const body=await r.text();
      return new Response(rewriteDash(body,finalUrl),{status:r.status,headers:corsHeaders({"Content-Type":"application/dash+xml","Cache-Control":"no-store"})});
    }
    const outCt=ct||(/\.mp4(?:$|\?)/i.test(finalUrl)?"video/mp4":"application/octet-stream");
    const outHeaders=corsHeaders({"Content-Type":outCt,"Cache-Control":"no-store"});
    for(const k of ["content-length","content-range","accept-ranges","etag"]){const v=r.headers.get(k);if(v)outHeaders[k]=v}
    return new Response(request.method==="HEAD"?null:r.body,{status:r.status,headers:outHeaders});
  }catch(e){return bad("stream proxy error",502)}
}

async function probeAPI(request){
  const q=new URL(request.url), u=q.searchParams.get("u");
  if(!u||!/^(https?):/i.test(u))return json({type:"http",error:"bad url"},400);
  const headers=safeProxyHeaders(request,q);
  try{
    let r;
    try{r=await fetch(u,{method:"HEAD",redirect:"follow",cache:"no-store",headers})}catch{}
    let prefix="";
    if(!r || !(r.ok||r.status===206||r.status===302) || !r.headers.get("content-type") || /text\/html/i.test(r.headers.get("content-type")||"")){
      r=await fetch(u,{method:"GET",redirect:"follow",cache:"no-store",headers});
      const ab=await r.arrayBuffer(); prefix=new TextDecoder().decode(ab.slice(0,4096));
    }
    const finalUrl=r.url||u, ct=r.headers.get("content-type")||"";
    return json({type:typeFrom(ct,finalUrl,prefix),contentType:ct,finalUrl,serverType:r.headers.get("server")||""});
  }catch{return json({type:typeFrom("",u,""),finalUrl:u,error:"probe failed"})}
}

function typeFrom(contentType,url,prefix){
  const ct=String(contentType||"").toLowerCase(), u=String(url||"").toLowerCase(), b=String(prefix||"").replace(/^\uFEFF/,"").trim().toLowerCase();
  if(ct.includes("dash+xml")||/\.mpd(?:$|\?)/i.test(u)||/<mpd[\s>]/i.test(b))return "dash";
  if(ct.includes("mpegurl")||ct.includes("vnd.apple.mpegurl")||/\.(m3u8|m3u)(?:$|\?)/i.test(u)||b.startsWith("#extm3u"))return "hls";
  if(ct.includes("video/x-flv")||ct.includes("video/flv")||/\.flv(?:$|\?)/i.test(u))return "flv";
  if(ct.includes("mp2t")||ct.includes("mpegts")||/\.ts(?:$|\?)/i.test(u))return "mpegts";
  if(ct.includes("video/mp4")||/\.mp4(?:$|\?)/i.test(u))return "mp4";
  if(/^rtsp:/i.test(u))return "rtsp"; if(/^rtmp:/i.test(u))return "rtmp"; if(/^udp:/i.test(u))return "udp";
  return "http";
}

async function licenseAPI(request){
  const q=new URL(request.url), target=q.searchParams.get("u");
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:corsHeaders()});
  if(!target||!/^(https?):/i.test(target))return bad("bad url");
  const headers=new Headers(); headers.set("User-Agent",q.searchParams.get("ua")||headerValue(request,"User-Agent","NM7-TV-Web/1.0"));
  const ref=q.searchParams.get("r"); if(ref)headers.set("Referer",ref);
  for(const k of ["Accept","Content-Type","Origin"]){const v=request.headers.get(k);if(v)headers.set(k,v)}
  try{
    const extra=JSON.parse(q.searchParams.get("h")||"{}");
    for(const [k,v] of Object.entries(extra||{})){const lk=k.toLowerCase();if(["host","connection","content-length","cookie","user-agent","referer"].includes(lk))continue;if(typeof v==="string"&&v.length<4000)headers.set(k,v)}
  }catch{}
  let body;
  if(request.method==="POST")body=await request.arrayBuffer();
  let r=await fetch(target,{method:request.method==="POST"?"POST":"GET",redirect:"follow",cache:"no-store",headers,body});
  if(!r.ok&&request.method==="POST")r=await fetch(target,{method:"GET",redirect:"follow",cache:"no-store",headers});
  const out=corsHeaders({"Content-Type":r.headers.get("content-type")||"application/octet-stream","Cache-Control":"no-store"});
  return new Response(r.body,{status:r.status,headers:out});
}

async function imageAPI(request){
  const q=new URL(request.url), u=q.searchParams.get("u");
  if(!u||!/^(https?):\/\//i.test(u))return bad("bad image url");
  try{
    const h=new Headers();h.set("User-Agent",q.searchParams.get("ua")||"NM7-TV-Web/1.0.69");const ref=q.searchParams.get("r");if(ref)h.set("Referer",ref);
    const x=await fetch(u,{redirect:"follow",cache:"no-store",headers:h});
    if(!x.ok)return bad("upstream image HTTP "+x.status,x.status);
    const ct=x.headers.get("content-type")||"application/octet-stream";
    if(!/^image\//i.test(ct)&&!ct.toLowerCase().includes("svg"))return bad("not an image",415);
    const ab=await x.arrayBuffer();if(ab.byteLength>2*1024*1024)return bad("image too large",413);
    return new Response(ab,{status:200,headers:corsHeaders({"Content-Type":ct,"Content-Length":String(ab.byteLength),"Cache-Control":"public,max-age=86400"})});
  }catch{return bad("image proxy error",502)}
}

async function apiRouter(request){
  const url=new URL(request.url),p=url.pathname,proxy=url.searchParams.get("proxy");
  if(p==="/api/playlist"){
    if(proxy==="stream")return streamAPI(request);
    if(proxy==="probe")return probeAPI(request);
    if(proxy==="license")return licenseAPI(request);
    if(proxy==="image")return imageAPI(request);
    return playlistAPI(request);
  }
  if(p==="/api/stream"||p==="/__nm7/stream")return streamAPI(request);
  if(p==="/api/probe"||p==="/__nm7/probe")return probeAPI(request);
  if(p==="/api/license"||p==="/__nm7/license")return licenseAPI(request);
  if(p==="/api/image"||p==="/__nm7/image")return imageAPI(request);
  return null;
}

export default {
  async fetch(request,env) {
    const api=await apiRouter(request);
    if(api)return api;
    const url=new URL(request.url);
    if(url.pathname==="/"||url.pathname==="/tv"){
      const target=new URL("/index.html",url);
      return env.ASSETS.fetch(new Request(target,request));
    }
    return env.ASSETS.fetch(request);
  }
};

const SOURCES={tv:"https://phuongnm7-playlist.phuongnm7-iptv.workers.dev/",sport:"https://thethaonm7.phuongnm7-iptv.workers.dev/playlist.m3u"};
function parse(t){const lines=String(t||"").replace(/^\uFEFF/,"").split(/\r?\n/),out=[];let m=null,ua="",ref="";
for(const raw of lines){const l=raw.trim();
if(l.indexOf("#EXTINF:")===0){if(m&&m.candidates.length)out.push(m);const p=l.indexOf(","),h=p<0?l:l.slice(0,p);m={name:p<0?"Kênh":l.slice(p+1).trim(),group:(/group-title="([^"]*)"/i.exec(h)||[])[1]||"Khác",logo:(/tvg-logo="([^"]*)"/i.exec(h)||[])[1]||"",id:(/tvg-id="([^"]*)"/i.exec(h)||[])[1]||"",candidates:[]};ua="";ref="";}
else if(m&&l.indexOf("#EXTVLCOPT:")===0){const um=/http-user-agent=(?:"([^"]+)"|([^\s]+))/i.exec(l),rm=/(?:http-referrer|http-referer)=(?:"([^"]+)"|([^\s]+))/i.exec(l);if(um)ua=um[1]||um[2];if(rm)ref=rm[1]||rm[2];}
else if(m&&l.charAt(0)!=="#"&&/^(https?|rtsp|rtmp|udp):/i.test(l)){const ps=l.split("|"),url=ps[0];let r=ref,u=ua;for(let i=1;i<ps.length;i++){if(/^referer=/i.test(ps[i]))r=ps[i].slice(ps[i].indexOf("=")+1);if(/^http-user-agent=/i.test(ps[i]))u=ps[i].slice(ps[i].indexOf("=")+1);}m.candidates.push({url,ref:r,ua:u,hls:/\\.m3u8(?:$|\\?)/i.test(url)||/\\.m3u(?:$|\\?)/i.test(url)||/playlist|index\\.m3u|manifest/i.test(url)});}}
if(m&&m.candidates.length)out.push(m);
const merged=[],byKey={};
for(const c of out){
  c.id=c.id||c.name;
  const gid=(c.id||"").toLowerCase().trim();
  const nameKey=(c.name||"").toLowerCase().replace(/\b(server|source|nguon)\s*\d+\b/g,"").replace(/[^a-z0-9]+/g," ").trim();
  const key=(c.group||"")+"|"+(gid||nameKey);
  if(!byKey[key]){byKey[key]={...c,candidates:c.candidates.slice()};merged.push(byKey[key]);}
  else{
    const seen=new Set(byKey[key].candidates.map(x=>x.url));
    for(const x of c.candidates)if(x.url&&!seen.has(x.url)){byKey[key].candidates.push(x);seen.add(x.url);}
    if(!byKey[key].logo&&c.logo)byKey[key].logo=c.logo;
  }
}
for(const c of merged){addBuiltin(c);c.candidates.sort((a,b)=>score(b.url)-score(a.url));}
return merged}
const BUILTIN={
  vtv1hd:[{url:"https://vtvgolive-failover.vtvdigital.vn/vtvgo/vtv1-manifest.m3u8",ref:"",ua:"",hls:true}],
  vtvcab3hd:[{url:"https://e3.endpoint.cdn.sctvonline.vn/hls/vtvcab3/index.m3u8",ref:"http://sctvonline.vn/",ua:"ReactNativeVideo/3.4.4 (Linux;Android 9) ExoPlayerLib/2.13.3",hls:true}],
  vtvcab16hd:[{url:"https://e7.endpoint.cdn.sctvonline.vn/live/smil:VTVCAB16.smil/chunklist_w2005840737_b1692000.m3u8",ref:"http://sctvonline.vn/",ua:"ReactNativeVideo/3.4.4 (Linux;Android 9) ExoPlayerLib/2.13.3",hls:true}]
};
function addBuiltin(c){
  const key=(c.id||"").toLowerCase().trim();
  const name=(c.name||"").toLowerCase().replace(/[^a-z0-9]+/g,"");
  let extra=BUILTIN[key]||[];
  if(!extra.length&&((key==="vtv1"||name==="vtv1"||name.indexOf("vtv1")===0)))extra=BUILTIN.vtv1hd;
  if(!extra.length&&((name.indexOf("onsport")===0||name.indexOf("vtvcab3")>=0)))extra=BUILTIN.vtvcab3hd;
  if(!extra.length&&((name.indexOf("onfootball")===0||name.indexOf("vtvcab16")>=0)))extra=BUILTIN.vtvcab16hd;
  if(!extra.length)return;
  const seen=new Set((c.candidates||[]).map(x=>x.url));
  for(const x of extra)if(!seen.has(x.url)){c.candidates.push(x);seen.add(x.url);}
}
function score(u){let s=0;if(/\.m3u8(?:$|\?)/i.test(u))s+=100;if(/\.m3u(?:$|\?)/i.test(u))s+=80;if(/\/hls\//i.test(u))s+=30;if(/playlist|index\.m3u|manifest/i.test(u))s+=20;if(/\.(mp4|ts)(?:$|\?)/i.test(u))s+=10;if(/tth\.vn\//i.test(u))s-=50;return s}
function proxyUrl(c){const out=[];for(const x of c.candidates){if(!/^https?:/i.test(x.url))continue;let q="?u="+encodeURIComponent(x.url);if(x.ref)q+="&r="+encodeURIComponent(x.ref);if(x.ua)q+="&ua="+encodeURIComponent(x.ua);out.push({url:x.url,ref:x.ref||"",ua:x.ua||"",hls:!!x.hls,proxy:x.hls?"/api/stream"+q:x.url})}c.candidates=out;return c}
let cache={};
function withTimeout(ms){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);return {signal:c.signal,done:()=>clearTimeout(t)}}
async function fetchUpstream(url){
  const x=withTimeout(12000);
  try{return await fetch(url,{cache:"no-store",signal:x.signal,headers:{"user-agent":"NM7-TV-Web/1.0"}})}
  finally{x.done()}
}
export default async function handler(req,res){const source=new URL(req.url,"https://nm7-tv-web.vercel.app").searchParams.get("source");const target=SOURCES[source];if(!target)return res.status(400).json({channels:[]});
try{
  const now=Date.now();
  const hit=cache[source];
  if(hit&&now-hit.time<30000){
    res.setHeader("Cache-Control","no-store");
    return res.status(200).json({channels:hit.channels,source:source||"tv",cached:true});
  }
  const r=await fetchUpstream(target);
  if(!r.ok)throw new Error("upstream "+r.status);
  const body=await r.text();
  let channels=parse(body);
  for(const c of channels)proxyUrl(c);
  if(!channels.length)throw new Error("upstream playlist rỗng");
  cache[source]={time:now,channels};
  res.setHeader("Cache-Control","no-store");
  return res.status(200).json({channels,source:source||"tv",cached:false});
}catch(e){
  const hit=cache[source];
  if(hit&&hit.channels&&hit.channels.length){
    res.setHeader("Cache-Control","no-store");
    return res.status(200).json({channels:hit.channels,source:source||"tv",cached:true,stale:true,error:String(e)});
  }
  return res.status(504).json({channels:[],source:source||"tv",error:String(e)})
}}
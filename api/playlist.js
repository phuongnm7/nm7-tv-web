const SOURCES={tv:["https://nm7-tv-web.vercel.app/api/vietmitv-merge","https://phuongnm7-playlist.phuongnm7-iptv.workers.dev/","https://raw.githubusercontent.com/phuongnm7/Iptv-phuongnm7/main/IPTV_Gop_VMTTV_vAppTV.m3u","https://iptv-live-merge.phuongnm7-iptv.workers.dev/playlist.m3u"],sport:["https://thethaonm7.phuongnm7-iptv.workers.dev/playlist.m3u"]};
function parse(t){const lines=String(t||"").replace(/^\uFEFF/,"").split(/\r?\n/),out=[];let m=null,ua="",ref="",origin="",manifestType="",licenseType="",licenseKey="";
for(const raw of lines){const l=raw.trim();
 if(l.indexOf("#EXTINF:")===0){
  if(m&&m.candidates.length)out.push(m);
  const p=l.indexOf(","),h=p<0?l:l.slice(0,p);
  m={name:p<0?"Kênh":l.slice(p+1).trim(),group:(/group-title="([^"]*)"/i.exec(h)||[])[1]||"Khác",logo:(/tvg-logo="([^"]*)"/i.exec(h)||[])[1]||"",id:(/tvg-id="([^"]*)"/i.exec(h)||[])[1]||"",candidates:[]};
  ua="";ref="";origin="";manifestType="";licenseType="";licenseKey="";
 }else if(m&&l.indexOf("#EXTVLCOPT:")===0){
  const um=/http-user-agent=(?:"([^"]+)"|([^\s]+))/i.exec(l),rm=/(?:http-referrer|http-referer)=(?:"([^"]+)"|([^\s]+))/i.exec(l);
  if(um)ua=um[1]||um[2];if(rm)ref=rm[1]||rm[2];const om=/http-origin=(?:"([^"]+)"|([^\s]+))/i.exec(l);if(om)origin=om[1]||om[2];
 }else if(m&&l.indexOf("#KODIPROP:")===0){
  const mt=/inputstream\.adaptive\.manifest_type=(.+)/i.exec(l),lt=/inputstream\.adaptive\.license_type=(.+)/i.exec(l),lk=/inputstream\.adaptive\.license_key=(.+)/i.exec(l);
  if(mt)manifestType=mt[1].trim();
  if(lt)licenseType=lt[1].trim();
  if(lk)licenseKey=lk[1].trim();
 }else if(m&&l.charAt(0)!=="#"&&/^(https?|rtsp|rtmp|udp):/i.test(l)){
  const ps=l.split("|"),url=ps[0];let r=ref,u=ua;
  for(let i=1;i<ps.length;i++){if(/^referer(?:er)?=/i.test(ps[i]))r=ps[i].slice(ps[i].indexOf("=")+1);if(/^http-user-agent=/i.test(ps[i]))u=ps[i].slice(ps[i].indexOf("=")+1);if(/^origin=/i.test(ps[i]))origin=ps[i].slice(ps[i].indexOf("=")+1);}
  const lowerManifest=manifestType.toLowerCase();
  const drm=licenseType&&licenseKey?{type:licenseType,key:licenseKey}:null;
  const cand={url,ref:r,ua:u,headers:origin?{Origin:origin}:{},type:lowerManifest==="mpd"?"dash":lowerManifest==="hls"?"hls":"",dash:lowerManifest==="mpd",hls:lowerManifest==="hls"||/\.m3u8(?:$|\?)/i.test(url)||/\.m3u(?:$|\?)/i.test(url)||/playlist|index\.m3u|manifest/i.test(url),drm};
  m.candidates.push(cand);
 }
}
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
function proxyUrl(c){
 const out=[];
 for(const x of c.candidates){
  if(!/^https?:/i.test(x.url))continue;
  let q="?u="+encodeURIComponent(x.url);
  if(x.ref)q+="&r="+encodeURIComponent(x.ref);
  if(x.ua)q+="&ua="+encodeURIComponent(x.ua);
  if(x.headers&&Object.keys(x.headers).length)q+="&h="+encodeURIComponent(JSON.stringify(x.headers));
  out.push({...x,proxy:"/api/stream"+q});
 }
 c.candidates=out;return c
}
let cache={};
function withTimeout(ms){const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),ms);return {signal:ac.signal,done:()=>clearTimeout(timer)}}
async function fetchText(url){
 const x=withTimeout(9000);
 try{
  const r=await fetch(url,{redirect:"follow",cache:"no-store",signal:x.signal,headers:{"User-Agent":"NM7-TV-Web/1.0","Accept":"application/vnd.apple.mpegurl,text/plain,*/*"}});
  if(!r.ok)throw new Error("HTTP "+r.status);
  return await r.text();
 }finally{x.done()}
}
export default async function handler(req,res){
 const params=new URL(req.url,"https://nm7-tv-web.vercel.app").searchParams;
 const source=params.get("source");
 const choice=String(params.get("default")||"");
 const isDefault=source==="tv"&&["1","2","android1069"].includes(choice);
 const preset=choice==="2"?2:1;
 const cacheKey=isDefault?"tv:default:"+preset:source;
 const allTargets=SOURCES[source];
 if(!allTargets)return res.status(400).json({channels:[],source});
 const targets=isDefault?(preset===2?[SOURCES.tv[1]]:[SOURCES.tv[0],SOURCES.tv[1]]):allTargets;
 const now=Date.now(),hit=cache[cacheKey];
 if(hit&&now-hit.time<30000){res.setHeader("Cache-Control","no-store");return res.status(200).json({channels:hit.channels,source,cached:true,preset:isDefault?preset:undefined,upstream:hit.upstream})}
 const errors=[];
 const results=await Promise.all(targets.map(async target=>{
  try{
   const body=await fetchText(target);
   let channels=parse(body);
   if(!channels.length){
    try{
     const j=JSON.parse(body);
     const arr=Array.isArray(j)?j:(Array.isArray(j.channels)?j.channels:Array.isArray(j.data)?j.data:[]);
     channels=arr.map(x=>({
      name:String(x.name||x.title||x.channel||"Kênh"),
      group:String(x.group||x.groupTitle||x.category||"Khác"),
      logo:String(x.logo||x.tvgLogo||""),
      id:String(x.id||x.tvgId||x.name||x.title||""),
      candidates:Array.isArray(x.candidates)?x.candidates:(x.url||x.stream||x.src?[{url:x.url||x.stream||x.src,ref:x.ref||x.referer||"",ua:x.ua||x.userAgent||"",headers:x.headers||{},type:x.type||"",dash:x.type==="dash",hls:x.type==="hls",drm:x.drm||null}]:[])
     }));
    }catch{}
   }
   for(const ch of channels)proxyUrl(ch);
   if(!channels.length)throw new Error("playlist rỗng");
   return {target,channels};
  }catch(e){return {target,error:String(e)}}
 }));
 const good=results.find(x=>x.channels&&x.channels.length);
 if(good){
  cache[cacheKey]={time:now,channels:good.channels,upstream:good.target};
  res.setHeader("Cache-Control","no-store");
  return res.status(200).json({channels:good.channels,source,cached:false,preset:isDefault?preset:undefined,upstream:good.target});
 }
 for(const x of results)if(x.error)errors.push(x.target+": "+x.error);
 if(hit&&hit.channels&&hit.channels.length){
  res.setHeader("Cache-Control","no-store");
  return res.status(200).json({channels:hit.channels,source,cached:true,stale:true,preset:isDefault?preset:undefined,upstream:hit.upstream,error:errors.join(" | ")});
 }
 return res.status(504).json({channels:[],source,error:errors.join(" | ")});
}

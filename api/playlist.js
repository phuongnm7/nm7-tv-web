const SOURCES={tv:"https://phuongnm7-playlist.phuongnm7-iptv.workers.dev/",sport:"https://thethaonm7.phuongnm7-iptv.workers.dev/playlist.m3u"};
function parse(t){
 const lines=String(t||"").replace(/^\uFEFF/,"").split(/\r?\n/),out=[];let m=null,ua="",ref="",dash=false,licenseType="",licenseKey="";
 for(const raw of lines){const l=raw.trim();
  if(l.indexOf("#EXTINF:")===0){
   if(m&&m.candidates.length)out.push(m);
   const p=l.indexOf(","),h=p<0?l:l.slice(0,p);
   m={name:p<0?"Kênh":l.slice(p+1).trim(),group:(/group-title="([^"]*)"/i.exec(h)||[])[1]||"Khác",logo:(/tvg-logo="([^"]*)"/i.exec(h)||[])[1]||"",id:(/tvg-id="([^"]*)"/i.exec(h)||[])[1]||"",candidates:[],dash:false,licenseType:"",licenseKey:""};
   ua="";ref="";dash=false;licenseType="";licenseKey="";
  } else if(m&&l.indexOf("#EXTVLCOPT:")===0){
   const um=/http-user-agent=(?:"([^"]+)"|([^\s]+))/i.exec(l),rm=/(?:http-referrer|http-referer)=(?:"([^"]+)"|([^\s]+))/i.exec(l);
   if(um)ua=um[1]||um[2]; if(rm)ref=rm[1]||rm[2];
  } else if(m&&l.indexOf("#KODIPROP:")===0){
   const kv=l.slice(10),eq=kv.indexOf("="),k=eq>=0?kv.slice(0,eq).trim().toLowerCase():"",v=eq>=0?kv.slice(eq+1).trim():"";
   if(k.indexOf("manifest_type")>=0&&(v.toLowerCase().indexOf("mpd")>=0||v.toLowerCase().indexOf("dash")>=0))dash=true;
   if(k.indexOf("license_type")>=0)licenseType=v;
   if(k.indexOf("license_key")>=0)licenseKey=v;
  } else if(m&&l.charAt(0)!=="#"&&/^(https?|rtsp|rtmp|udp):/i.test(l)){
   const ps=l.split("|"),url=ps[0];let r=ref,u=ua;
   for(let i=1;i<ps.length;i++){if(/^referer=/i.test(ps[i]))r=ps[i].slice(ps[i].indexOf("=")+1);if(/^http-user-agent=/i.test(ps[i]))u=ps[i].slice(ps[i].indexOf("=")+1)}
   const isDash=dash||/\.mpd(?:$|\?)/i.test(url),isHls=/\.m3u8(?:$|\?)/i.test(url)||/playlist|index\.m3u|\.m3u(?:$|\?)/i.test(url);
   m.candidates.push({url,ref:r,ua:u,hls:isHls,dash:isDash,licenseType,licenseKey});
   m.dash=m.dash||isDash;m.licenseType=licenseType;m.licenseKey=licenseKey;
  }
 }
 if(m&&m.candidates.length)out.push(m);
 const merged=[],byKey={};
 for(const c of out){
  c.id=c.id||c.name;
  const gid=(c.id||"").toLowerCase().trim(),nameKey=(c.name||"").toLowerCase().replace(/\b(server|source|nguon)\s*\d+\b/g,"").replace(/[^a-z0-9]+/g," ").trim(),key=(c.group||"")+"|"+(gid||nameKey);
  if(!byKey[key])byKey[key]={...c,candidates:c.candidates.slice()};
  else{
   const seen=new Set(byKey[key].candidates.map(x=>x.url));
   for(const x of c.candidates)if(x.url&&!seen.has(x.url)){byKey[key].candidates.push(x);seen.add(x.url);}
   if(!byKey[key].logo&&c.logo)byKey[key].logo=c.logo;
   if(c.licenseKey&&!byKey[key].licenseKey)byKey[key].licenseKey=c.licenseKey;
   if(c.licenseType&&!byKey[key].licenseType)byKey[key].licenseType=c.licenseType;
   byKey[key].dash=byKey[key].dash||c.dash;
  }
 }
 for(const c of Object.values(byKey)){addBuiltin(c);c.candidates.sort((a,b)=>score(b.url)-score(a.url));}
 return Object.values(byKey);
}
const BUILTIN={
  vtv1:[{url:"https://livevlisctcdnw.seenow.vn/livesnv2/VTV1_HD/manifest.mpd",ref:"",ua:"",hls:false,dash:true,licenseType:"",licenseKey:""}],
  vtv1hd:[{url:"https://livevlisctcdnw.seenow.vn/livesnv2/VTV1_HD/manifest.mpd",ref:"",ua:"",hls:false,dash:true,licenseType:"",licenseKey:""}],
  onfootball:[{url:"https://livevlisctcdnw.seenow.vn/mean/BONGDA_HD/manifest.mpd",ref:"",ua:"",hls:false,dash:true,licenseType:"",licenseKey:""}]
};
function addBuiltin(c){
  const id=(c.id||"").toLowerCase().replace(/[^a-z0-9]+/g,""),name=(c.name||"").toLowerCase().replace(/[^a-z0-9]+/g,"");
  let extra=BUILTIN[id]||[];
  if(!extra.length&&(id==="vtv1"||id==="vtv1hd"||name==="vtv1"||name.indexOf("vtv1")===0))extra=BUILTIN.vtv1;
  if(!extra.length&&(id==="vtvcab16hd"||name.indexOf("onfootball")>=0))extra=BUILTIN.onfootball;
  if(!extra.length)return;
  const seen=new Set(c.candidates.map(x=>x.url));
  for(const x of extra)if(!seen.has(x.url)){c.candidates.push({...x});seen.add(x.url);}
  c.dash=c.dash||extra.some(x=>x.dash);
}
function score(u){let s=0;if(/\.m3u8(?:$|\?)/i.test(u))s+=100;if(/\.mpd(?:$|\?)/i.test(u))s+=95;if(/\.m3u(?:$|\?)/i.test(u))s+=80;if(/\/hls\//i.test(u))s+=20;if(/playlist|index\.m3u|manifest/i.test(u))s+=15;if(/\.(mp4|ts)(?:$|\?)/i.test(u))s+=10;return s}
function proxify(c){
 const xs=[];for(const x of c.candidates){if(!/^https?:/i.test(x.url))continue;let q="?u="+encodeURIComponent(x.url);if(x.ref)q+="&r="+encodeURIComponent(x.ref);if(x.ua)q+="&ua="+encodeURIComponent(x.ua);
  xs.push({...x,proxy:(x.hls||x.dash)?"/api/stream"+q:x.url});
 }c.candidates=xs;return c;
}
let cache={};
export default async function handler(req,res){
 const source=new URL(req.url,"https://nm7-tv-web.vercel.app").searchParams.get("source"),target=SOURCES[source];
 if(!target)return res.status(400).json({channels:[]});
 try{
  const now=Date.now();
  if(cache[source]&&now-cache[source].time<30000){res.setHeader("Cache-Control","s-maxage=30, stale-while-revalidate=120");return res.status(200).json({channels:cache[source].channels,source,cached:true});}
  const r=await fetch(target,{cache:"no-store",headers:{"user-agent":"NM7-TV-Web/1.0"}});
  if(!r.ok)throw new Error("upstream "+r.status);
  const channels=parse(await r.text()).map(proxify);
  cache[source]={time:now,channels};
  res.setHeader("Cache-Control","s-maxage=30, stale-while-revalidate=120");
  return res.status(200).json({channels,source,cached:false});
 }catch(e){return res.status(502).json({channels:[],error:String(e)})}
}
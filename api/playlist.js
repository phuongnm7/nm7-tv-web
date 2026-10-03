const SOURCES={
 tv:"https://phuongnm7-playlist.phuongnm7-iptv.workers.dev/",
 sport:"https://thethaonm7.phuongnm7-iptv.workers.dev/playlist.m3u"
};

function attrs(s){
 const o={},re=/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s,]+))/g;let m;
 while((m=re.exec(s)))o[m[1].toLowerCase()]=m[2]!=null?m[2]:m[3]!=null?m[3]:m[4];
 return o;
}
function normName(s){
 return String(s||"").toLowerCase().replace(/\b(server|source|nguon|sv)\s*\d+\b/g,"").replace(/\([^)]*\)/g,"").replace(/[^a-z0-9]+/g," ").trim();
}
function typeOf(url,mime,manifest){
 const u=String(url||"").toLowerCase(),m=String(mime||"").toLowerCase(),x=String(manifest||"").toLowerCase();
 if(x.indexOf("mpd")>=0||m.indexOf("dash")>=0||/\.mpd(?:$|\?)/i.test(u))return "dash";
 if(x.indexOf("hls")>=0||m.indexOf("mpegurl")>=0||/\.m3u8?(?:$|\?)/i.test(u)||/playlist|index\.m3u|chunklist/i.test(u))return "hls";
 if(/^rtsps?:/i.test(u))return "rtsp";
 if(/^rtmps?:/i.test(u))return "rtmp";
 if(/^udp:/i.test(u))return "udp";
 if(/\.mp4(?:$|\?)/i.test(u))return "mp4";
 if(/\.ts(?:$|\?)/i.test(u))return "ts";
 return "http";
}
function parse(t){
 const lines=String(t||"").replace(/^\uFEFF/,"").split(/\r?\n/),raw=[],pending=null;
 let m=null,headers={},options=[],manifest="",licenseType="",licenseKey="",licenseUrl="";
 function flush(){if(m&&m.candidates.length){raw.push(m);m=null;}headers={};options=[];manifest="";licenseType="";licenseKey="";licenseUrl="";}
 for(let i=0;i<lines.length;i++){
  const l=lines[i].trim();
  if(!l)continue;
  if(/^#EXTINF:/i.test(l)){
   flush();const p=l.indexOf(","),h=p<0?l:l.slice(0,p),a=attrs(h);
   m={name:p<0?(a["tvg-name"]||"Kênh"):l.slice(p+1).trim(),group:a["group-title"]||"Khác",logo:a["tvg-logo"]||"",id:a["tvg-id"]||a["tvg-name"]||"",candidates:[]};continue;
  }
  if(!m)continue;
  if(/^#EXTGRP:/i.test(l)){m.group=l.slice(8).trim()||m.group;continue;}
  if(/^#EXTVLCOPT:/i.test(l)){
   const z=l.slice(11),eq=z.indexOf("=");if(eq>0){const k=z.slice(0,eq).trim().toLowerCase(),v=z.slice(eq+1).trim();if(k==="http-user-agent")headers["User-Agent"]=v;else if(k==="http-referrer"||k==="http-referer")headers["Referer"]=v;else if(k==="http-origin")headers["Origin"]=v;else options.push(l);}continue;
  }
  if(/^#KODIPROP:/i.test(l)){
   options.push(l);const z=l.slice(10),eq=z.indexOf("=");if(eq>0){const k=z.slice(0,eq).trim().toLowerCase(),v=z.slice(eq+1).trim();if(k.indexOf("manifest_type")>=0)manifest=v;if(k.indexOf("license_type")>=0)licenseType=v;if(k.indexOf("license_key")>=0)licenseKey=v;if(k.indexOf("license_header")>=0){const hp=v.indexOf("=");if(hp>0)headers[v.slice(0,hp)]=v.slice(hp+1);}}continue;
  }
  if(/^#EXTHTTP:/i.test(l)){options.push(l);continue;}
  if(l.charAt(0)==="#")continue;
  if(/^(https?|rtsp|rtmps?|udp):/i.test(l)){
   const ps=l.split("|"),url=ps.shift(),hh={...headers};for(const p of ps){const eq=p.indexOf("=");if(eq>0){const k=decodeURIComponent(p.slice(0,eq)),v=decodeURIComponent(p.slice(eq+1));if(k.toLowerCase()==="referer"||k.toLowerCase()==="referrer")hh["Referer"]=v;else if(k.toLowerCase()==="user-agent")hh["User-Agent"]=v;else hh[k]=v;}}
   const mime=options.join("\n").match(/mimetype=([^\s]+)/i);const type=typeOf(url,mime?mime[1]:"",manifest);
   const drm=(licenseType||licenseKey)?{type:licenseType||"",key:licenseKey||""}:null;
   m.candidates.push({url,type,mime:mime?mime[1]:"",ua:hh["User-Agent"]||"",ref:hh["Referer"]||"",headers:hh,drm:drm});
   if(licenseKey)licenseUrl=licenseKey;
  }
 }
 flush();
 const merged=[],by={};
 for(const c of raw){
  const key=(c.group||"Khác")+"|"+((c.id||"")?c.id.toLowerCase().trim():normName(c.name));
  if(!by[key]){by[key]={name:c.name,group:c.group||"Khác",logo:c.logo||"",id:c.id||normName(c.name),candidates:[]};merged.push(by[key]);}
  for(const x of c.candidates){
   let found=false;for(const y of by[key].candidates)if(y.url===x.url)found=true;if(!found)by[key].candidates.push(x);
  }
 }
 for(const c of merged){
  c.candidates.sort((a,b)=>score(b)-score(a));
  for(const x of c.candidates){
   x.proxy=(x.type==="hls"||x.type==="dash")?makeProxy(x):x.url;
  }
 }
 addKnownFallbacks(merged);
 for(const c of merged)c.candidates.sort((a,b)=>score(b)-score(a));
 return merged;
}
function score(c){
 let s=0,t=String(c.type||"");
 if(t==="hls")s+=100;if(t==="dash")s+=95;if(t==="mp4")s+=35;if(t==="ts")s+=30;if(t==="rtsp"||t==="rtmp"||t==="udp")s+=10;
 if(c.ua)s+=5;if(c.ref)s+=3;return s;
}
function makeProxy(x){
 let q="?u="+encodeURIComponent(x.url);
 if(x.ref)q+="&r="+encodeURIComponent(x.ref);
 if(x.ua)q+="&ua="+encodeURIComponent(x.ua);
 return "/api/stream"+q;
}
function addKnownFallbacks(channels){
 const add=(names,entry)=>{for(const c of channels){const n=(c.id+" "+c.name).toLowerCase().replace(/[^a-z0-9]+/g,"");let ok=false;for(const v of names)if(n.indexOf(v)>=0)ok=true;if(!ok)continue;let dup=false;for(const x of c.candidates)if(x.url===entry.url)dup=true;if(!dup)c.candidates.push({...entry,headers:{},proxy:makeProxy(entry)})}};
 add(["vtv1","vtv1hd"],{url:"https://livevlisctcdnw.seenow.vn/livesnv2/VTV1_HD/manifest.mpd",type:"dash",mime:"application/dash+xml",ua:"Mozilla/5.0"});
 add(["onfootball","vtvcab16","bongdahd"],{url:"https://livevlisctcdnw.seenow.vn/mean/BONGDA_HD/manifest.mpd",type:"dash",mime:"application/dash+xml",ua:"Mozilla/5.0"});
 add(["onsport","vtvcab3"],{url:"https://livevlive.vtvcab.vn/hls/OS_THETHAO_HD/sc-gaFEAA/m30_index.m3u8",type:"hls",mime:"application/x-mpegURL",ua:"Mozilla/5.0 (Linux; Android 10; KM6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Mobile Safari/537.36"});
 add(["onfootball","vtvcab16","bongdahd"],{url:"https://livevlive.vtvcab.vn/hls/OS_BONGDA_HD/sc-gaFEAA/m30_index.m3u8",type:"hls",mime:"application/x-mpegURL",ua:"Mozilla/5.0 (Linux; Android 10; KM6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Mobile Safari/537.36"});
}
let cache={};
export default async function handler(req,res){
 const u=new URL(req.url,"https://nm7-tv-web.vercel.app"),source=u.searchParams.get("source"),target=SOURCES[source];
 res.setHeader("Access-Control-Allow-Origin","*");res.setHeader("Cache-Control","s-maxage=15, stale-while-revalidate=60");
 if(!target)return res.status(400).json({channels:[],error:"unknown source"});
 try{
  const now=Date.now();
  if(cache[source]&&now-cache[source].time<15000)return res.status(200).json({channels:cache[source].channels,source,cached:true});
  const r=await fetch(target,{cache:"no-store",headers:{"User-Agent":"NM7-TV-Web/1.0.69","Accept":"application/vnd.apple.mpegurl,application/x-mpegURL,text/plain,*/*"}});
  if(!r.ok)throw new Error("upstream "+r.status);
  const channels=parse(await r.text());
  cache[source]={time:now,channels};
  return res.status(200).json({channels,source,cached:false});
 }catch(e){return res.status(502).json({channels:[],error:String(e)})}
}
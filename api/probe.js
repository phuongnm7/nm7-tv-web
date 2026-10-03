function typeFrom(contentType,url,prefix){
 const ct=String(contentType||"").toLowerCase(),u=String(url||"").toLowerCase(),b=String(prefix||"").replace(/^\uFEFF/,"").trim().toLowerCase();
 if(ct.indexOf("dash+xml")>=0||/\.mpd(?:$|\?)/i.test(u)||/<mpd[\s>]/i.test(b))return "dash";
 if(ct.indexOf("mpegurl")>=0||ct.indexOf("vnd.apple.mpegurl")>=0||/\.(m3u8|m3u)(?:$|\?)/i.test(u)||b.startsWith("#extm3u"))return "hls";
 if(ct.indexOf("video/x-flv")>=0||ct.indexOf("video/flv")>=0||/\.flv(?:$|\?)/i.test(u))return "flv";
 if(ct.indexOf("mp2t")>=0||ct.indexOf("mpegts")>=0||/\.ts(?:$|\?)/i.test(u))return "mpegts";
 if(ct.indexOf("video/mp4")>=0||/\.mp4(?:$|\?)/i.test(u))return "mp4";
 if(/^rtsp:/i.test(u))return "rtsp";
 if(/^rtmp:/i.test(u))return "rtmp";
 if(/^udp:/i.test(u))return "udp";
 return "http";
}
async function getProbe(url,headers){
 try{
  const h=await fetch(url,{method:"HEAD",redirect:"follow",cache:"no-store",headers});
  const ct=(h.headers.get("content-type")||"").toLowerCase();
  const usable=h.ok||h.status===206||h.status===302;
  if(usable&&ct&&!/text\/html/.test(ct))return {r:h,prefix:""};
 }catch{}
 const r=await fetch(url,{method:"GET",redirect:"follow",cache:"no-store",headers:{...headers,Range:"bytes=0-4095"}});
 let prefix="";
 try{prefix=Buffer.from(await r.arrayBuffer()).subarray(0,4096).toString("utf8")}catch{}
 return {r,prefix};
}
export default async function handler(req,res){
 const q=new URL(req.url,"https://nm7-tv-web.vercel.app").searchParams;
 const u=q.get("u"),ref=q.get("r")||"",ua=q.get("ua")||"Mozilla/5.0",extra=q.get("h")||"";
 if(!u||!/^https?:/i.test(u))return res.status(400).json({type:"http",error:"bad url"});
 const headers={"User-Agent":ua};if(ref)headers["Referer"]=ref;
 try{
  const eh=JSON.parse(extra||"{}");
  for(const [k,v] of Object.entries(eh||{})){
   const lk=k.toLowerCase();if(["host","connection","content-length","cookie"].includes(lk))continue;
   if(typeof v==="string"&&v.length<4000)headers[k]=v;
  }
 }catch{}
 try{
  const {r,prefix}=await getProbe(u,headers),finalUrl=r.url||u,ct=r.headers.get("content-type")||"";
  res.setHeader("Access-Control-Allow-Origin","*");res.setHeader("Cache-Control","no-store");
  return res.status(200).json({type:typeFrom(ct,finalUrl,prefix),contentType:ct,finalUrl,serverType:r.headers.get("server")||""});
 }catch(e){
  return res.status(200).json({type:typeFrom("",u,""),finalUrl:u,error:"probe failed"});
 }
}
function typeFrom(contentType,url){
 const ct=String(contentType||"").toLowerCase(),u=String(url||"").toLowerCase();
 if(ct.indexOf("dash+xml")>=0||/\.mpd(?:$|\?)/i.test(u))return "dash";
 if(ct.indexOf("mpegurl")>=0||ct.indexOf("vnd.apple.mpegurl")>=0||/\.m3u8?(?:$|\?)/i.test(u))return "hls";
 if(ct.indexOf("video/mp4")>=0||/\.mp4(?:$|\?)/i.test(u))return "mp4";
 if(ct.indexOf("video/")===0)return "video";
 return "http";
}
async function headOrRange(url,headers){
 try{
  const h=await fetch(url,{method:"HEAD",redirect:"follow",cache:"no-store",headers});
  if(h.ok||h.status===206||h.status===302)return h;
 }catch(e){}
 return fetch(url,{method:"GET",redirect:"follow",cache:"no-store",headers:{...headers,Range:"bytes=0-2047"}});
}
export default async function handler(req,res){
 const q=new URL(req.url,"https://nm7-tv-web.vercel.app").searchParams;
 const u=q.get("u"),ref=q.get("r")||"",ua=q.get("ua")||"Mozilla/5.0";
 if(!u||!/^https?:/i.test(u))return res.status(400).json({type:"http",error:"bad url"});
 const headers={"User-Agent":ua};if(ref)headers["Referer"]=ref;
 try{
  const r=await headOrRange(u,headers);
  const finalUrl=r.url||u,ct=r.headers.get("content-type")||"";
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Cache-Control","no-store");
  return res.status(200).json({type:typeFrom(ct,finalUrl),contentType:ct,finalUrl});
 }catch(e){
  return res.status(200).json({type:typeFrom("",u),finalUrl:u,error:String(e)});
 }
}

import { Readable } from "node:stream";
export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Cache-Control","no-store");
  if(req.method==="OPTIONS")return res.status(204).send("");
  const q=new URL(req.url,"https://nm7-tv-web.vercel.app").searchParams;
  const target=q.get("u"),ref=q.get("r")||"",ua=q.get("ua")||"Mozilla/5.0";
  if(!target||!/^(https?):/i.test(target))return res.status(400).json({error:"bad url"});
  try{
    const h={"User-Agent":ua};if(ref)h.Referer=ref;
    const r=await fetch(target,{method:"GET",redirect:"follow",cache:"no-store",headers:{...h,Range:"bytes=0-8191"}});
    const ab=await r.arrayBuffer(),bytes=new Uint8Array(ab),n=Math.min(bytes.length,8192);
    let text="";try{text=new TextDecoder("utf-8").decode(bytes.slice(0,n))}catch(e){}
    const contentType=r.headers.get("content-type")||"";
    const prefix=text.slice(0,800);
    let type="http";
    if(/mpegurl/i.test(contentType)||/^\s*#EXTM3U/i.test(prefix))type="hls";
    else if(/dash\+xml/i.test(contentType)||/<MPD[\s>]/i.test(prefix))type="dash";
    else if(/mpeg2?-ts|video/mp2t/i.test(contentType)||looksTs(bytes,n))type="ts";
    else if(/video\/mp4|\.mp4(?:$|\?)/i.test(contentType)||/\.mp4(?:$|\?)/i.test(r.url||target))type="mp4";
    return res.status(200).json({type,contentType,finalUrl:r.url||target,prefix});
  }catch(e){return res.status(502).json({error:String(e)})}
}
function looksTs(b,n){
  for(let off=0;off<188&&off<n;off++)if(off+376<n&&b[off]===0x47&&b[off+188]===0x47&&b[off+376]===0x47)return true;
  return false;
}
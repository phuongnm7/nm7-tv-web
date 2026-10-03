export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Cache-Control","no-store");
  if(req.method==="OPTIONS")return res.status(204).send("");
  const q=new URL(req.url,"https://nm7-tv-web.vercel.app").searchParams;
  const target=q.get("u"),ref=q.get("r")||"",ua=q.get("ua")||"Mozilla/5.0";
  if(!target||String(target).indexOf("http")!==0)return res.status(400).json({error:"bad url"});
  try{
    const h={"User-Agent":ua};if(ref)h.Referer=ref;
    const r=await fetch(target,{method:"GET",redirect:"follow",cache:"no-store",headers:Object.assign({},h,{Range:"bytes=0-8191"})});
    const ab=await r.arrayBuffer(),bytes=new Uint8Array(ab),n=Math.min(bytes.length,8192);
    let text="";try{text=new TextDecoder("utf-8").decode(bytes.slice(0,n))}catch(e){}
    const contentType=String(r.headers.get("content-type")||"").toLowerCase();
    const prefix=text.slice(0,800);
    let type="http";
    if(contentType.indexOf("mpegurl")>=0||prefix.replace(/^\s+/,"").indexOf("#EXTM3U")===0)type="hls";
    else if(contentType.indexOf("dash+xml")>=0||prefix.indexOf("<MPD")>=0)type="dash";
    else if(contentType.indexOf("mpeg2-ts")>=0||contentType.indexOf("video/mp2t")>=0||looksTs(bytes,n))type="ts";
    else if(contentType.indexOf("video/mp4")>=0||String(r.url||target).indexOf(".mp4")>=0)type="mp4";
    return res.status(200).json({type,contentType,finalUrl:r.url||target,prefix});
  }catch(e){return res.status(502).json({error:String(e)})}
}
function looksTs(b,n){
  for(let off=0;off<188&&off<n;off++)if(off+376<n&&b[off]===71&&b[off+188]===71&&b[off+376]===71)return true;
  return false;
}
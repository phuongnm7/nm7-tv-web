export default async function handler(req,res){
 res.setHeader("Access-Control-Allow-Origin","*");res.setHeader("Cache-Control","no-store");
 const q=new URL(req.url,"https://nm7-tv-web.vercel.app").searchParams,target=q.get("u"),ref=q.get("r")||"",ua=q.get("ua")||"Mozilla/5.0";
 if(!target||!/^(https?):/i.test(target))return res.status(400).json({error:"bad url"});
 try{
  const h={"User-Agent":ua};if(ref)h.Referer=ref;
  const r=await fetch(target,{cache:"no-store",redirect:"follow",headers:{...h,Range:"bytes=0-4095"}});
  const b=new Uint8Array(await r.arrayBuffer()),n=Math.min(b.length,4096),ct=String(r.headers.get("content-type")||"").toLowerCase(),u=String(r.url||target).toLowerCase();
  let type="http";let p="";try{p=new TextDecoder().decode(b.slice(0,n))}catch(e){}
  if(ct.includes("mpegurl")||/^\s*#extm3u/i.test(p))type="hls";else if(ct.includes("dash+xml")||p.toLowerCase().includes("<mpd"))type="dash";else if(ct.includes("mp2t")||isTs(b,n))type="ts";else if(ct.includes("video/mp4")||u.includes(".mp4"))type="mp4";
  return res.status(200).json({type,contentType:ct,finalUrl:r.url||target});
 }catch(e){return res.status(502).json({type:"http",error:e.message||String(e)})}
}
function isTs(b,n){for(let i=0;i<188&&i+376<n;i++)if(b[i]===71&&b[i+188]===71&&b[i+376]===71)return true;return false}
import { Readable } from "node:stream";
export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type,Origin,Referer");
  res.setHeader("Cache-Control","no-store");
  if(req.method==="OPTIONS")return res.status(204).send("");
  const q=new URL(req.url,"https://nm7-tv-web.vercel.app").searchParams,target=q.get("u"),rawHeaders=q.get("h")||"{}";
  if(!target||!/^(https?):/i.test(target))return res.status(400).send("bad license url");
  try{
    const h={"User-Agent":req.headers["user-agent"]||"NM7-TV-Web/1.0.69"};
    try{const extra=JSON.parse(rawHeaders);for(const k of Object.keys(extra)){if(k.toLowerCase()!=="host"&&k.toLowerCase()!=="content-length"&&k.toLowerCase()!=="connection")h[k]=String(extra[k]);}}catch(e){}
    if(req.headers.referer&&!h.Referer)h.Referer=req.headers.referer;
    if(req.headers["content-type"])h["Content-Type"]=req.headers["content-type"];
    const opt={method:req.method||"GET",headers:h,cache:"no-store",redirect:"follow"};
    if(req.method!=="GET"&&req.method!=="HEAD"&&req.body!=null){opt.body=(Buffer.isBuffer(req.body)||typeof req.body==="string")?req.body:JSON.stringify(req.body);}
    const r=await fetch(target,opt);
    const ct=r.headers.get("content-type");if(ct)res.setHeader("Content-Type",ct);
    if(r.body)return Readable.fromWeb(r.body).pipe(res);
    return res.status(r.status).send(Buffer.from(await r.arrayBuffer()));
  }catch(e){return res.status(502).send("license proxy error")}
}
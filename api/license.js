import { Readable } from "node:stream";
export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type,Origin,Referer");
  res.setHeader("Cache-Control","no-store");
  if(req.method==="OPTIONS")return res.status(204).send("");
  const q=new URL(req.url,"https://nm7-tv-web.vercel.app").searchParams,target=q.get("u");
  if(!target||!/^(https?):/i.test(target))return res.status(400).send("bad license url");
  try{
    const h={"User-Agent":req.headers["user-agent"]||"NM7-TV-Web/1.0.69"};
    if(req.headers.referer)h.Referer=req.headers.referer;
    const opt={method:req.method||"GET",headers:h,cache:"no-store",redirect:"follow"};
    if(req.method!=="GET"&&req.method!=="HEAD"&&req.body)opt.body=req.body;
    const r=await fetch(target,opt);
    const ct=r.headers.get("content-type");if(ct)res.setHeader("Content-Type",ct);
    if(r.body)return Readable.fromWeb(r.body).pipe(res);
    return res.status(r.status).send(Buffer.from(await r.arrayBuffer()));
  }catch(e){return res.status(502).send("license proxy error")}
}
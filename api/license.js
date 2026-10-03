import {Readable} from "node:stream";
export default async function handler(req,res){
 res.setHeader("Access-Control-Allow-Origin","*");res.setHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS");res.setHeader("Access-Control-Allow-Headers","Content-Type,Origin,Referer");
 if(req.method==="OPTIONS")return res.status(204).send("");
 const q=new URL(req.url,"https://nm7-tv-web.vercel.app").searchParams,target=q.get("u"),raw=q.get("h")||"{}";
 if(!target||!/^(https?):/i.test(target))return res.status(400).send("bad license url");
 try{
  const headers={"User-Agent":req.headers["user-agent"]||"NM7-TV/1.0.69"};
  try{const extra=JSON.parse(raw);for(const k of Object.keys(extra)){const v=String(extra[k]??"");if(!/^(host|content-length|connection)$/i.test(k)&&!/[\r\n]/.test(v))headers[k]=v}}catch(e){}
  if(req.headers["content-type"])headers["Content-Type"]=req.headers["content-type"];
  if(req.headers.referer&&!headers.Referer)headers.Referer=req.headers.referer;
  const init={method:req.method||"GET",headers,redirect:"follow",cache:"no-store"};
  if(req.method!=="GET"&&req.method!=="HEAD"&&req.body!=null)init.body=req.body;
  const r=await fetch(target,init),ct=r.headers.get("content-type");if(ct)res.setHeader("Content-Type",ct);
  if(r.body)return Readable.fromWeb(r.body).pipe(res);
  return res.status(r.status).send(Buffer.from(await r.arrayBuffer()));
 }catch(e){return res.status(502).send("license proxy error")}
}
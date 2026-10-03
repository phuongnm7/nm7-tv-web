import { Readable } from "node:stream";
function safeHeaders(req,extra){
 const out={"User-Agent":req.headers["user-agent"]||"NM7-TV-Web/1.0"};
 const allowed=["accept","content-type","origin","referer"];
 for(const k of allowed){if(req.headers[k])out[k]=req.headers[k]}
 try{const eh=JSON.parse(extra||"{}");for(const [k,v] of Object.entries(eh||{})){const lk=k.toLowerCase();if(["host","connection","content-length","cookie"].includes(lk))continue;if(typeof v==="string"&&v.length<4000)out[k]=v}}catch(e){}
 return out
}
export default async function handler(req,res){
 const q=new URL(req.url,"https://nm7-tv-web.vercel.app").searchParams;
 const target=q.get("u"),ref=q.get("r")||"",ua=q.get("ua")||"",extra=q.get("h")||"";
 if(!target||!/^https?:/i.test(target))return res.status(400).send("bad url");
 const headers=safeHeaders(req,extra);if(ua)headers["User-Agent"]=ua;if(ref)headers["Referer"]=ref;
 res.setHeader("Access-Control-Allow-Origin","*");res.setHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS");res.setHeader("Access-Control-Allow-Headers","Content-Type,Accept,Origin,Referer,User-Agent,X-Requested-With");res.setHeader("Cache-Control","no-store");
 if(req.method==="OPTIONS")return res.status(204).end();
 try{
  let body=undefined;
  if(req.method==="POST"){
   if(req.body&&typeof req.body==="string")body=req.body;
   else if(req.body!=null)body=typeof req.body==="object"?JSON.stringify(req.body):String(req.body);
   else body="";
  }
  const init={method:req.method==="POST"?"POST":"GET",redirect:"follow",cache:"no-store",headers};
  if(req.method==="POST")init.body=body;
  let r=await fetch(target,init);
  if(!r.ok&&req.method==="POST"){
   try{r=await fetch(target,{method:"GET",redirect:"follow",cache:"no-store",headers})}catch(e){}
  }
  const ct=r.headers.get("content-type")||"application/octet-stream";
  res.setHeader("Content-Type",ct);
  res.statusCode=r.status;
  if(r.body){return Readable.fromWeb(r.body).pipe(res)}
  return res.send(Buffer.from(await r.arrayBuffer()));
 }catch(e){return res.status(502).json({error:"license proxy error"})}
}
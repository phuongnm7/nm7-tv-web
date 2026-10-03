import { Readable } from "node:stream";

function cors(res){
 res.setHeader("Access-Control-Allow-Origin","*");
 res.setHeader("Access-Control-Allow-Methods","GET,HEAD,OPTIONS");
 res.setHeader("Access-Control-Allow-Headers","Range,Content-Type,Origin,Referer");
 res.setHeader("Access-Control-Expose-Headers","Content-Length,Content-Range,Accept-Ranges");
 res.setHeader("Cache-Control","no-store");
}
function proxyUrl(abs,ref,ua){var q="/api/stream?u="+encodeURIComponent(abs);if(ref)q+="&r="+encodeURIComponent(ref);if(ua)q+="&ua="+encodeURIComponent(ua);return q}
function rewriteHls(text,finalUrl,ref,ua){
 function px(u){try{return proxyUrl(new URL(u,finalUrl).toString(),ref,ua)}catch(e){return u}}
 text=text.replace(/URI="([^"]+)"/g,function(_,u){return 'URI="'+px(u)+'"'});
 var lines=text.split(/\r?\n/),i,z;
 for(i=0;i<lines.length;i++){z=lines[i].trim();if(z&&z.charAt(0)!=="#"&&z.indexOf("://")>=0)lines[i]=px(z);else if(z&&z.charAt(0)!=="#"&&z.indexOf("://")<0&&z.charAt(0)!==";")lines[i]=px(z)}
 return lines.join("\n")
}
function rewriteDash(text,finalUrl){
 var base=finalUrl.replace(/[^/]*([?#].*)?$/,"");
 var has=false;
 text=text.replace(/<BaseURL(\s[^>]*)?>([\s\S]*?)<\/BaseURL>/gi,function(m,a,v){
   has=true;
   var raw=v.trim();
   try{return "<BaseURL"+(a||"")+">"+new URL(raw,finalUrl).toString()+"</BaseURL>"}catch(e){return m}
 });
 if(!has)text=text.replace(/<MPD(\s[^>]*)?>/i,function(m,a){return "<MPD"+(a||"")+"><BaseURL>"+base+"</BaseURL>"});
 return text
}
export default async function handler(req,res){
 cors(res);
 if(req.method==="OPTIONS")return res.status(204).send("");
 const q=new URL(req.url,"https://nm7-tv-web.vercel.app").searchParams;
 const target=q.get("u"),ref=q.get("r")||"",ua=q.get("ua")||"Mozilla/5.0 (NM7-TV/1.0.69)",rawHeaders=q.get("h")||"{}";
 if(!target||!/^(https?):/i.test(target))return res.status(400).send("bad url");
 try{
  var headers={"User-Agent":ua};
  try{var extra=JSON.parse(rawHeaders);for(var hk in extra){if(extra.hasOwnProperty(hk)&&hk.toLowerCase()!=="host"&&hk.toLowerCase()!=="content-length"&&hk.toLowerCase()!=="connection")headers[hk]=String(extra[hk]);}}catch(e){}
  if(ref&&!headers.Referer)headers.Referer=ref;
  if(req.headers&&req.headers.range)headers.Range=req.headers.range;
  if(req.headers&&req.headers["if-range"])headers["If-Range"]=req.headers["if-range"];
  const r=await fetch(target,{redirect:"follow",cache:"no-store",headers:headers});
  const ct=(r.headers.get("content-type")||"").toLowerCase(),finalUrl=r.url||target;
  if(r.headers.get("accept-ranges"))res.setHeader("Accept-Ranges",r.headers.get("accept-ranges"));
  if(r.headers.get("content-range"))res.setHeader("Content-Range",r.headers.get("content-range"));
  if(r.headers.get("content-length"))res.setHeader("Content-Length",r.headers.get("content-length"));
  if(ct.indexOf("mpegurl")>=0||/\.m3u8(?:$|\?)/i.test(finalUrl)){
    const body=rewriteHls(await r.text(),finalUrl,ref,ua);
    res.setHeader("Content-Type","application/vnd.apple.mpegurl; charset=utf-8");
    return res.status(r.status).send(body);
  }
  if(ct.indexOf("dash+xml")>=0||/\.mpd(?:$|\?)/i.test(finalUrl)){
    const body=rewriteDash(await r.text(),finalUrl);
    res.setHeader("Content-Type","application/dash+xml; charset=utf-8");
    return res.status(r.status).send(body);
  }
  if(ct)res.setHeader("Content-Type",ct);
  if(r.body){res.statusCode=r.status;return Readable.fromWeb(r.body).pipe(res)}
  return res.status(r.status).send(Buffer.from(await r.arrayBuffer()));
 }catch(e){return res.status(502).send("NM7 stream proxy error")}
}
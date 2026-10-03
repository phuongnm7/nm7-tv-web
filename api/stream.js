import { Readable } from "node:stream";
function cors(res){res.setHeader("Access-Control-Allow-Origin","*");res.setHeader("Access-Control-Allow-Methods","GET,HEAD,OPTIONS");res.setHeader("Access-Control-Allow-Headers","Range,Content-Type,Origin,Referer");res.setHeader("Access-Control-Expose-Headers","Content-Length,Content-Range,Accept-Ranges,ETag,Last-Modified");res.setHeader("Cache-Control","no-store")}
function proxy(abs,q){let x="/api/stream?u="+encodeURIComponent(abs);if(q.r)x+="&r="+encodeURIComponent(q.r);if(q.ua)x+="&ua="+encodeURIComponent(q.ua);if(q.h)x+="&h="+encodeURIComponent(q.h);return x}
function rewriteHls(text,base,q){const abs=u=>{try{return new URL(u,base).toString()}catch(e){return u}};text=text.replace(/URI="([^"]+)"/g,(m,u)=>'URI="'+proxy(abs(u),q)+'"');const lines=text.split(/\r?\n/);for(let i=0;i<lines.length;i++){const z=lines[i].trim();if(z&&z[0]!=="#"&&!/^(?:data:|blob:)/i.test(z))lines[i]=proxy(abs(z),q)}return lines.join("\n")}
export default async function handler(req,res){
 cors(res);if(req.method==="OPTIONS")return res.status(204).send("");
 const q=new URL(req.url,"https://nm7-tv-web.vercel.app").searchParams,target=q.get("u"),ref=q.get("r")||"",ua=q.get("ua")||"NM7-TV/1.0.69 Android-TV",rawHeaders=q.get("h")||"{}";
 if(!target||!/^(https?|rtmp|rtsp):/i.test(target))return res.status(400).send("bad url");
 try{
  const headers={"User-Agent":ua};
  try{const extra=JSON.parse(rawHeaders);for(const k of Object.keys(extra)){const v=String(extra[k]??"");if(!/^(host|content-length|connection)$/i.test(k)&&!/[\r\n]/.test(v))headers[k]=v}}catch(e){}
  if(ref&&!headers.Referer)headers.Referer=ref;
  if(req.headers.range)headers.Range=req.headers.range;
  if(req.headers["if-range"])headers["If-Range"]=req.headers["if-range"];
  const r=await fetch(target,{redirect:"follow",cache:"no-store",headers});
  const ct=String(r.headers.get("content-type")||"").toLowerCase(),finalUrl=r.url||target;
  ["accept-ranges","content-range","content-length","etag","last-modified"].forEach(h=>{const v=r.headers.get(h);if(v)res.setHeader(h.replace(/(^|-)(\w)/g,(m,a,b)=>b.toUpperCase()),v)});
  const manifestByUrl=/\.m3u8?(?:$|[?#])/i.test(finalUrl)||/\.mpd(?:$|[?#])/i.test(finalUrl);
  if(manifestByUrl||ct.includes("mpegurl")||ct.includes("dash+xml")){
    const body=await r.text();
    const clean=body.replace(/^\uFEFF/,"").trim();
    const isM3u=ct.includes("mpegurl")||/\.m3u8?(?:$|[?#])/i.test(finalUrl)||/^#EXTM3U/i.test(clean);
    const isMpd=ct.includes("dash+xml")||/\.mpd(?:$|[?#])/i.test(finalUrl)||/^<\?xml[^>]*>\s*<MPD\b/i.test(clean)||/<MPD\b/i.test(clean.slice(0,4096));
    if(isM3u){res.setHeader("Content-Type","application/vnd.apple.mpegurl; charset=utf-8");return res.status(r.status).send(rewriteHls(body,finalUrl,{r:ref,ua,h:rawHeaders}))}
    if(isMpd){res.setHeader("Content-Type","application/dash+xml; charset=utf-8");return res.status(r.status).send(body)}
    if(ct)res.setHeader("Content-Type",ct);
    return res.status(r.status).send(body);
  }
  if(ct)res.setHeader("Content-Type",ct);
  if(r.body){res.statusCode=r.status;return Readable.fromWeb(r.body).pipe(res)}
  return res.status(r.status).send(Buffer.from(await r.arrayBuffer()))
 }catch(e){return res.status(502).send("NM7 stream proxy error")}
}
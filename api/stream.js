import { Readable } from "node:stream";
function proxyUrl(abs,q){
  let s="/api/stream?u="+encodeURIComponent(abs);
  if(q.r)s+="&r="+encodeURIComponent(q.r);
  if(q.ua)s+="&ua="+encodeURIComponent(q.ua);
  if(q.h)s+="&h="+encodeURIComponent(q.h);
  return s
}
function rewriteHls(text,base,q){
  const abs=u=>{try{return new URL(u,base).toString()}catch(e){return u}};
  text=text.replace(/URI="([^"]+)"/g,(m,u)=>'URI="'+proxyUrl(abs(u),q)+'"');
  const lines=text.split(/\r?\n/);
  for(let i=0;i<lines.length;i++){
    const z=lines[i].trim();
    if(z&&z.charAt(0)!=="#"&&!/^(?:data:|blob:)/i.test(z))lines[i]=proxyUrl(abs(z),q)
  }
  return lines.join("\n")
}
function rewriteMpd(text,base,q){
  const abs=u=>{try{return new URL(u,base).toString()}catch(e){return u}};
  const wrap=u=>{u=String(u||"").trim();if(!u||u.indexOf("/api/stream?")===0)return u;return proxyUrl(abs(u),q)};
  text=text.replace(/(<BaseURL(?:\s[^>]*)?>)([^<]+)(<\/BaseURL>)/gi,(m,a,u,b)=>a+wrap(u)+b);
  text=text.replace(/((?:media|initialization|index|sourceURL)=")([^"]+)(")/gi,(m,a,u,b)=>{
    if(!u||u.indexOf("/api/stream?")===0||/^data:/i.test(u))return m;
    return a+wrap(u)+b
  });
  return text
}
export default async function handler(req,res){
  const q=new URL(req.url,"https://nm7-tv-web.vercel.app").searchParams;
  const target=q.get("u"),ref=q.get("r")||"",ua=q.get("ua")||"Mozilla/5.0",rawHeaders=q.get("h")||"{}";
  if(!target||!/^https?:/i.test(target))return res.status(400).send("bad url");
  const headers={"User-Agent":ua};try{
    const extra=JSON.parse(rawHeaders);for(const k of Object.keys(extra||{})){const v=String(extra[k]||"");if(!/^(host|content-length|connection)$/i.test(k)&&!/[\r\n]/.test(v))headers[k]=v}
  }catch(e){}
  if(ref&&!headers.Referer)headers.Referer=ref;
  try{
    const r=await fetch(target,{redirect:"follow",cache:"no-store",headers});
    const ct=(r.headers.get("content-type")||"").toLowerCase(),finalUrl=r.url||target;
    res.setHeader("Access-Control-Allow-Origin","*");
    res.setHeader("Access-Control-Allow-Methods","GET,HEAD,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers","Range,Content-Type,Origin,Referer");
    res.setHeader("Access-Control-Expose-Headers","Content-Length,Content-Range,Accept-Ranges,ETag,Last-Modified");
    res.setHeader("Cache-Control","no-store");
    const bodyIsManifest=/\.m3u8?(?:$|[?#])/i.test(finalUrl)||/\.mpd(?:$|[?#])/i.test(finalUrl)||ct.indexOf("mpegurl")>=0||ct.indexOf("dash+xml")>=0;
    if(bodyIsManifest){
      const body=await r.text(),clean=body.replace(/^\uFEFF/,"").trim();
      const isM3u=ct.indexOf("mpegurl")>=0||/\.m3u8?(?:$|[?#])/i.test(finalUrl)||/^#EXTM3U/i.test(clean);
      const isMpd=ct.indexOf("dash+xml")>=0||/\.mpd(?:$|[?#])/i.test(finalUrl)||/<MPD\b/i.test(clean.slice(0,8192));
      if(isM3u){res.setHeader("Content-Type","application/vnd.apple.mpegurl; charset=utf-8");return res.status(r.status).send(rewriteHls(body,finalUrl,{r:ref,ua,h:rawHeaders}))}
      if(isMpd){res.setHeader("Content-Type","application/dash+xml; charset=utf-8");return res.status(r.status).send(rewriteMpd(body,finalUrl,{r:ref,ua,h:rawHeaders}))}
      if(ct)res.setHeader("Content-Type",ct);
      return res.status(r.status).send(body)
    }
    if(ct)res.setHeader("Content-Type",ct);
    if(r.headers.get("content-length"))res.setHeader("Content-Length",r.headers.get("content-length"));
    if(r.body){res.statusCode=r.status;return Readable.fromWeb(r.body).pipe(res)}
    return res.status(r.status).send(Buffer.from(await r.arrayBuffer()))
  }catch(e){return res.status(502).send("stream proxy error")}
}
import { Readable } from "node:stream";

function applyHeadersFromQuery(req, q){
  const ua=q.get("ua")||req.headers["user-agent"]||"Mozilla/5.0";
  const ref=q.get("r")||"";
  const raw=q.get("h")||"";
  const headers={"User-Agent":ua};
  if(ref)headers["Referer"]=ref;
  for(const key of ["range","accept","accept-language","origin","if-none-match","if-modified-since"]){
    if(req.headers[key])headers[key]=req.headers[key];
  }
  try{
    const extra=JSON.parse(raw||"{}");
    for(const [k,v] of Object.entries(extra||{})){
      const lk=k.toLowerCase();
      if(["host","connection","content-length","cookie","user-agent","referer"].includes(lk))continue;
      if(typeof v==="string"&&v.length<4000)headers[k]=v;
    }
  }catch{}
  return headers;
}
function apiUrl(u,q){
  const p="/api/stream?u="+encodeURIComponent(u);
  const r=q.get("r")||"",ua=q.get("ua")||"",h=q.get("h")||"";
  let x=p;
  if(r)x+="&r="+encodeURIComponent(r);
  if(ua)x+="&ua="+encodeURIComponent(ua);
  if(h)x+="&h="+encodeURIComponent(h);
  return x;
}
function upstreamUrl(u,q){
  const abs=new URL(u,q.get("base")||u).toString();
  return abs;
}
function rewriteHls(text,finalUrl,q){
  const px=(u)=>{
    try{
      const abs=new URL(u,finalUrl).toString();
      if(/^data:|^blob:/i.test(abs))return u;
      return apiUrl(abs,q);
    }catch{return u}
  };
  text=text.replace(/URI\s*=\s*"([^"]+)"/gi,(m,u)=>'URI="'+px(u)+'"');
  const lines=text.split(/\r?\n/);
  for(let i=0;i<lines.length;i++){
    const z=lines[i].trim();
    if(z&&!z.startsWith("#")&&!/^data:|^blob:/i.test(z))lines[i]=px(z);
  }
  return lines.join("\n");
}
function rewriteDash(text,finalUrl){
  const hasBase=/<BaseURL(?:\s|>)/i.test(text);
  const base=(()=>{
    try{return new URL(".",finalUrl).toString()}catch{return finalUrl}
  })();
  if(hasBase){
    return text.replace(/(<BaseURL[^>]*>)([^<]*)(<\/BaseURL>)/gi,(m,a,u,b)=>{
      try{return a+new URL(u.trim(),finalUrl).toString()+b}catch{return m}
    });
  }
  return text.replace(/(<MPD\b[^>]*>)/i,"$1<BaseURL>"+base+"</BaseURL>");
}
export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET,HEAD,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Range,Accept,Content-Type,Origin,Referer,User-Agent,X-Requested-With");
  res.setHeader("Access-Control-Expose-Headers","Content-Length,Content-Range,Accept-Ranges,Content-Type,ETag");
  res.setHeader("Cache-Control","no-store");
  if(req.method==="OPTIONS")return res.status(204).end();

  const q=new URL(req.url,"https://nm7-tv-web.vercel.app").searchParams;
  const target=q.get("u");
  if(!target||!/^https?:/i.test(target))return res.status(400).send("bad url");

  try{
    const headers=applyHeadersFromQuery(req,q);
    const r=await fetch(target,{redirect:"follow",cache:"no-store",headers});
    const ct=(r.headers.get("content-type")||"").toLowerCase();
    const finalUrl=r.url||target;
    const looksHls=ct.includes("mpegurl")||/\\.(m3u8|m3u)(?:$|\\?)/i.test(finalUrl);
    const looksDash=ct.includes("dash+xml")||/\\.mpd(?:$|\\?)/i.test(finalUrl);
    // VietMiTV often serves HLS manifests from /c.php?k=... without a .m3u8
    // suffix and with a generic content-type. Detect and rewrite the manifest.
    const isVietMiWrapper=/\\/c\\.php(?:$|\\?)/i.test(finalUrl);

    if(looksHls){
      const body=await r.text();
      res.setHeader("Content-Type","application/vnd.apple.mpegurl; charset=utf-8");
      return res.status(r.status).send(rewriteHls(body,finalUrl,q));
    }

    if(looksDash){
      const body=await r.text();
      res.setHeader("Content-Type","application/dash+xml; charset=utf-8");
      return res.status(r.status).send(rewriteDash(body,finalUrl));
    }

    if(isVietMiWrapper){
      const body=await r.text();
      const trimmed=body.replace(/^\\uFEFF/,"").trim();
      if(/^#EXTM3U\\b/i.test(trimmed)){
        res.setHeader("Content-Type","application/vnd.apple.mpegurl; charset=utf-8");
        return res.status(r.status).send(rewriteHls(body,finalUrl,q));
      }
      if(/^<\\?xml[\\s\\S]*?<MPD\\b|^<MPD\\b/i.test(trimmed)){
        res.setHeader("Content-Type","application/dash+xml; charset=utf-8");
        return res.status(r.status).send(rewriteDash(body,finalUrl));
      }
      res.setHeader("Content-Type",ct||"text/plain; charset=utf-8");
      return res.status(r.status).send(body);
    }

    const outCt=ct||(/\.mp4(?:$|\?)/i.test(finalUrl)?"video/mp4":"application/octet-stream");
    res.setHeader("Content-Type",outCt);
    for(const k of ["content-length","content-range","accept-ranges","etag"]){
      const v=r.headers.get(k);if(v)res.setHeader(k,v);
    }
    res.statusCode=r.status;
    if(req.method==="HEAD")return res.end();
    if(r.body)return Readable.fromWeb(r.body).pipe(res);
    return res.send(Buffer.from(await r.arrayBuffer()));
  }catch(e){
    return res.status(502).send("stream proxy error");
  }
}
import { Readable } from "node:stream";
export default async function handler(req,res){
  const q=new URL(req.url,"https://nm7-tv-web.vercel.app").searchParams;
  const target=q.get("u"),ref=q.get("r")||"",ua=q.get("ua")||"Mozilla/5.0";
  if(!target||!/^https?:/i.test(target))return res.status(400).send("bad url");
  try{
    const r=await fetch(target,{redirect:"follow",cache:"no-store",headers:{"User-Agent":ua,"Referer":ref}});
    const ct=(r.headers.get("content-type")||"").toLowerCase(),finalUrl=r.url||target;
    res.setHeader("Access-Control-Allow-Origin","*");
    res.setHeader("Cache-Control","no-store");
    if(ct.indexOf("mpegurl")>=0||/\.m3u8(?:$|\?)/i.test(finalUrl)){
      let t=await r.text();
      function px(u){
        try{
          const abs=new URL(u,finalUrl).toString();
          let s="/api/stream?u="+encodeURIComponent(abs);
          if(ref)s+="&r="+encodeURIComponent(ref);
          if(ua)s+="&ua="+encodeURIComponent(ua);
          return s;
        }catch(e){return u}
      }
      t=t.replace(/URI="([^"]+)"/g,(m,u)=>'URI="'+px(u)+'"');
      const lines=t.split(/\r?\n/);
      for(let i=0;i<lines.length;i++){
        const z=lines[i].trim();
        if(z&&z.charAt(0)!=="#"&&/^https?:/i.test(z))lines[i]=px(z);
      }
      res.setHeader("Content-Type","application/vnd.apple.mpegurl; charset=utf-8");
      return res.status(r.status).send(lines.join("\n"));
    }
    if(r.body){
      if(ct)res.setHeader("Content-Type",ct);
      if(r.headers.get("content-length"))res.setHeader("Content-Length",r.headers.get("content-length"));
      res.statusCode=r.status;
      return Readable.fromWeb(r.body).pipe(res);
    }
    const ab=await r.arrayBuffer();
    if(ct)res.setHeader("Content-Type",ct);
    return res.status(r.status).send(Buffer.from(ab));
  }catch(e){
    return res.status(502).send("stream proxy error");
  }
}
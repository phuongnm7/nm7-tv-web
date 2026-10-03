import { Readable } from "node:stream";
export default async function handler(req,res){
  const q=new URL(req.url,"https://nm7-tv-web.vercel.app").searchParams;
  const target=q.get("u"),ref=q.get("r")||"",ua=q.get("ua")||"Mozilla/5.0";
  if(!target||!/^https?:/i.test(target))return res.status(400).send("bad url");
  try{
    const headers={"User-Agent":ua,"Referer":ref};
    if(req.headers&&req.headers.range)headers.Range=req.headers.range;
    if(req.headers&&req.headers["if-range"])headers["If-Range"]=req.headers["if-range"];
    const r=await fetch(target,{redirect:"follow",cache:"no-store",headers});
    const ct=(r.headers.get("content-type")||"").toLowerCase(),finalUrl=r.url||target;
    res.setHeader("Access-Control-Allow-Origin","*");
    res.setHeader("Access-Control-Expose-Headers","Content-Length,Content-Range,Accept-Ranges");
    res.setHeader("Cache-Control","no-store");
    if(ct.indexOf("mpegurl")>=0||ct.indexOf("dash+xml")>=0||/\.(m3u8|mpd)(?:$|\?)/i.test(finalUrl)){
      const t=await r.text();
      if(/\.mpd(?:$|\?)/i.test(finalUrl)||ct.indexOf("dash+xml")>=0){
        res.setHeader("Content-Type","application/dash+xml; charset=utf-8");
        return res.status(r.status).send(t);
      }
      res.setHeader("Content-Type","application/vnd.apple.mpegurl; charset=utf-8");
      return res.status(r.status).send(t);
    }
    if(r.headers.get("content-range"))res.setHeader("Content-Range",r.headers.get("content-range"));
    if(r.headers.get("accept-ranges"))res.setHeader("Accept-Ranges",r.headers.get("accept-ranges"));
    if(r.headers.get("content-length"))res.setHeader("Content-Length",r.headers.get("content-length"));
    if(ct)res.setHeader("Content-Type",ct);
    if(r.body){res.statusCode=r.status;return Readable.fromWeb(r.body).pipe(res);}
    const ab=await r.arrayBuffer();return res.status(r.status).send(Buffer.from(ab));
  }catch(e){return res.status(502).send("stream proxy error")}
}
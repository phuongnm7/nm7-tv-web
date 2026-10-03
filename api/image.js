export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET,HEAD,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Range,Accept,Content-Type,Origin,Referer,User-Agent");
  res.setHeader("Cache-Control","public, max-age=3600, s-maxage=86400");
  if(req.method==="OPTIONS")return res.status(204).end();
  const q=new URL(req.url,"https://nm7-tv-web.vercel.app").searchParams;
  const target=q.get("u"),ref=q.get("r")||"",ua=q.get("ua")||"Mozilla/5.0 (TV; NM7)";
  if(!target||!/^https?:/i.test(target))return res.status(400).send("bad image url");
  try{
    const headers={"User-Agent":ua};
    if(ref)headers.Referer=ref;
    const r=await fetch(target,{redirect:"follow",cache:"no-store",headers});
    if(!r.ok)return res.status(r.status).send("image upstream HTTP "+r.status);
    const ct=(r.headers.get("content-type")||"application/octet-stream").toLowerCase();
    if(!ct.startsWith("image/")&&!/svg/i.test(ct))return res.status(415).send("not an image");
    const ab=await r.arrayBuffer();
    if(ab.byteLength>2*1024*1024)return res.status(413).send("image too large");
    res.setHeader("Content-Type",ct);
    res.setHeader("Content-Length",String(ab.byteLength));
    return res.status(200).send(Buffer.from(ab));
  }catch(e){return res.status(502).send("image proxy error")}
}
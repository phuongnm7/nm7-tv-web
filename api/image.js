export default async function handler(req,res){
 const q=new URL(req.url,"https://nm7-tv-web.vercel.app").searchParams;
 const u=q.get("u"),r=q.get("r")||"",ua=q.get("ua")||"NM7-TV-Web/1.0.69";
 if(!u||!/^(https?):\/\//i.test(u))return res.status(400).send("bad image url");
 try{
  const h={"User-Agent":ua};if(r)h.Referer=r;
  const x=await fetch(u,{redirect:"follow",cache:"no-store",headers:h});
  if(!x.ok)return res.status(x.status).send("upstream image HTTP "+x.status);
  const ct=x.headers.get("content-type")||"application/octet-stream";
  if(!/^image\//i.test(ct)&&ct.toLowerCase().indexOf("svg")<0)return res.status(415).send("not an image");
  const ab=await x.arrayBuffer();if(ab.byteLength>2*1024*1024)return res.status(413).send("image too large");
  res.setHeader("Access-Control-Allow-Origin","*");res.setHeader("Cache-Control","public,max-age=86400");
  res.setHeader("Content-Type",ct);res.setHeader("Content-Length",String(ab.byteLength));
  return res.status(200).send(Buffer.from(ab));
 }catch(e){return res.status(502).send("image proxy error")}
}
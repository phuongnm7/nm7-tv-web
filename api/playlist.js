const SOURCES={tv:"https://phuongnm7-playlist.phuongnm7-iptv.workers.dev/",sport:"https://thethaonm7.phuongnm7-iptv.workers.dev/playlist.m3u"};
export default async function handler(req,res){
  const source=new URL(req.url,"https://nm7-tv-web.vercel.app").searchParams.get("source");
  const target=SOURCES[source];
  if(!target)return res.status(400).send("#EXTM3U\n");
  try{
    const r=await fetch(target,{cache:"no-store",headers:{"user-agent":"NM7-TV-Web/1.0"}});
    const body=await r.text();
    res.setHeader("Content-Type","application/vnd.apple.mpegurl; charset=utf-8");
    res.setHeader("Cache-Control","no-store,max-age=0");
    return res.status(r.status).send(body);
  }catch(e){
    return res.status(502).send("#EXTM3U\n# NM7 proxy error\n");
  }
}
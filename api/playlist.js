const SOURCES={tv:"https://phuongnm7-playlist.phuongnm7-iptv.workers.dev/",sport:"https://thethaonm7.phuongnm7-iptv.workers.dev/playlist.m3u"};
function parse(t){
 const lines=String(t||"").replace(/^\uFEFF/,"").split(/\r?\n/),out=[];
 let m=null,ua="",ref="",options=[],headers={};
 for(let i=0;i<lines.length;i++){
   const l=lines[i].trim();
   if(l.indexOf("#EXTINF:")===0){
     if(m&&m.candidates.length)out.push(m);
     const p=l.indexOf(","),h=p<0?l:l.slice(0,p);
     m={
       name:p<0?"Kênh":l.slice(p+1).trim(),
       group:(/group-title="([^"]*)"/i.exec(h)||[])[1]||"Khác",
       logo:(/tvg-logo="([^"]*)"/i.exec(h)||[])[1]||"",
       id:(/tvg-id="([^"]*)"/i.exec(h)||[])[1]||"",
       candidates:[],
       options:[]
     };
     ua="";ref="";options=[];headers={};
   }else if(m&&/^#EXTVLCOPT:/i.test(l)){
     const rest=l.replace(/^#EXTVLCOPT:/i,"");
     const um=/http-user-agent=(?:"([^"]+)"|(.+))/i.exec(rest);
     const rm=/(?:http-referrer|http-referer)=(?:"([^"]+)"|(.+))/i.exec(rest);
     if(um)ua=(um[1]||um[2]||"").trim();
     if(rm)ref=(rm[1]||rm[2]||"").trim();
   }else if(m&&/^#KODIPROP:/i.test(l)){
     const prop=l.replace(/^#KODIPROP:/i,"");
     options.push(prop);
   }else if(m&&/^#EXTHTTP:/i.test(l)){
     const raw=l.replace(/^#EXTHTTP:/i,"");
     try{
       const obj=JSON.parse(raw);for(const k of Object.keys(obj||{}))headers[k]=String(obj[k]);
     }catch(e){}
   }else if(m&&l.charAt(0)!=="#"&&/^(https?|rtsp|rtmp|udp):/i.test(l)){
     const ps=l.split("|"),url=ps[0];let r=ref,u=ua;
     for(let j=1;j<ps.length;j++){
       if(/^referer=/i.test(ps[j]))r=ps[j].slice(ps[j].indexOf("=")+1);
       else if(/^http-user-agent=/i.test(ps[j]))u=ps[j].slice(ps[j].indexOf("=")+1);
     }
     const low=url.toLowerCase();
     let type="http",mime="";
     if(/\.mpd(?:$|[?#])/i.test(url))type="dash";
     else if(/\.m3u8?(?:$|[?#])/i.test(url)||/playlist|index\.m3u|chunklist/i.test(url))type="hls";
     else if(/\.ts(?:$|[?#])/i.test(url))type="ts";
     else if(/\.mp4(?:$|[?#])/i.test(url))type="mp4";
     m.candidates.push({
       url:url,ref:r,ua:u,hls:type==="hls",type:type,mime:mime,
       options:options.slice(),headers:Object.assign({},headers)
     });
   }
 }
 if(m&&m.candidates.length)out.push(m);

 const merged=[],byKey={};
 for(const c of out){
   c.id=c.id||c.name;
   const gid=(c.id||"").toLowerCase().trim();
   const nameKey=(c.name||"").toLowerCase().replace(/\b(server|source|nguon)\s*\d+\b/g,"").replace(/[^a-z0-9]+/g," ").trim();
   const key=(c.group||"")+"|"+(gid||nameKey);
   if(!byKey[key]){
     byKey[key]={...c,candidates:c.candidates.slice()};
     merged.push(byKey[key]);
   }else{
     const seen=new Set(byKey[key].candidates.map(x=>x.url));
     for(const x of c.candidates)if(x.url&&!seen.has(x.url)){byKey[key].candidates.push(x);seen.add(x.url);}
     if(!byKey[key].logo&&c.logo)byKey[key].logo=c.logo;
     if(c.options&&c.options.length)byKey[key].options=(byKey[key].options||[]).concat(c.options);
   }
 }
 for(const c of merged){
   addBuiltin(c);
   c.candidates.sort((a,b)=>score(b.url)-score(a.url));
   c.candidates=withProxies(c.candidates);
 }
 return merged
}

const BUILTIN={
  vtv1hd:[{url:"https://vtvgolive-failover.vtvdigital.vn/vtvgo/vtv1-manifest.m3u8",ref:"",ua:"",hls:true}],
  vtvcab3hd:[{url:"https://e3.endpoint.cdn.sctvonline.vn/hls/vtvcab3/index.m3u8",ref:"http://sctvonline.vn/",ua:"ReactNativeVideo/3.4.4 (Linux;Android 9) ExoPlayerLib/2.13.3",hls:true}],
  vtvcab16hd:[{url:"https://e7.endpoint.cdn.sctvonline.vn/live/smil:VTVCAB16.smil/chunklist_w2005840737_b1692000.m3u8",ref:"http://sctvonline.vn/",ua:"ReactNativeVideo/3.4.4 (Linux;Android 9) ExoPlayerLib/2.13.3",hls:true}]
};
function addBuiltin(c){
  const key=(c.id||"").toLowerCase().trim();
  const name=(c.name||"").toLowerCase().replace(/[^a-z0-9]+/g,"");
  let extra=BUILTIN[key]||[];
  if(!extra.length&&((key==="vtv1"||name==="vtv1"||name.indexOf("vtv1")===0)))extra=BUILTIN.vtv1hd;
  if(!extra.length&&((name.indexOf("onsport")===0||name.indexOf("vtvcab3")>=0)))extra=BUILTIN.vtvcab3hd;
  if(!extra.length&&((name.indexOf("onfootball")===0||name.indexOf("vtvcab16")>=0)))extra=BUILTIN.vtvcab16hd;
  if(!extra.length)return;
  const seen=new Set((c.candidates||[]).map(x=>x.url));
  for(const x of extra)if(!seen.has(x.url)){c.candidates.push(x);seen.add(x.url);}
}
function score(u){let s=0;if(/\.m3u8(?:$|\?)/i.test(u))s+=100;if(/\.m3u(?:$|\?)/i.test(u))s+=80;if(/\/hls\//i.test(u))s+=30;if(/playlist|index\.m3u|manifest/i.test(u))s+=20;if(/\.(mp4|ts)(?:$|\?)/i.test(u))s+=10;if(/tth\.vn\//i.test(u))s-=50;return s}
function withProxies(cands){
  const out=[];
  for(const x of cands||[]){
    if(!x||!x.url)continue;
    const y={...x};
    if(/^https?:/i.test(y.url)&&(y.type==="hls"||y.type==="dash")){
      let q="?u="+encodeURIComponent(y.url);
      if(y.ref)q+="&r="+encodeURIComponent(y.ref);
      if(y.ua)q+="&ua="+encodeURIComponent(y.ua);
      if(y.headers&&Object.keys(y.headers).length)q+="&h="+encodeURIComponent(JSON.stringify(y.headers));
      y.proxy="/api/stream"+q;
    }
    out.push(y);
  }
  return out
}

function proxyUrl(c){c.candidates=withProxies(c.candidates);return c}

let cache={};
export default async function handler(req,res){const source=new URL(req.url,"https://nm7-tv-web.vercel.app").searchParams.get("source");const target=SOURCES[source];if(!target)return res.status(400).json({channels:[]});
try{const now=Date.now();if(cache[source]&&now-cache[source].time<30000)return res.status(200).json({channels:cache[source].channels,source:source||"tv",cached:true});
const r=await fetch(target,{cache:"no-store",headers:{"user-agent":"NM7-TV-Web/1.0"}});if(!r.ok)throw new Error("upstream "+r.status);const body=await r.text();let channels=parse(body);for(const c of channels)proxyUrl(c);cache[source]={time:now,channels};res.setHeader("Cache-Control","s-maxage=30, stale-while-revalidate=120");return res.status(200).json({channels,source:source||"tv",cached:false});}
catch(e){return res.status(502).json({channels:[],error:String(e)})}}
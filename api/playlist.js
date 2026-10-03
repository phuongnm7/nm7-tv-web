const SOURCES={
  tv:"https://phuongnm7-playlist.phuongnm7-iptv.workers.dev/",
  sport:"https://thethaonm7.phuongnm7-iptv.workers.dev/playlist.m3u"
};
const ATTRIBUTE=/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s,]+))/g;

function parse(content,baseUrl){
  if(content==null)content="";
  content=String(content).replace(/\uFEFF/g,"");
  const trimmed=content.trim();
  if(trimmed.startsWith("<")||content.indexOf("\0")>=0)throw new Error("Nội dung không phải playlist M3U");
  if(/^\s*#EXT-X-/im.test(content)){
    if(!/^https?:\/\//i.test(baseUrl||""))throw new Error("Đây là manifest HLS");
    return [{name:"Luồng HLS",group:"Phát trực tiếp",url:baseUrl,logo:"",tvgId:"",headers:{},options:["#KODIPROP:inputstream.adaptive.manifest_type=hls"],mimeHint:"application/x-mpegURL",type:"hls",candidates:[{url:baseUrl,headers:{},ref:"",ua:"",type:"hls",mime:"application/x-mpegURL",options:[]}]}];
  }
  const lines=content.split(/\r\n|\n|\r/),channels=[];
  let pending=null,headers={},options=[];
  for(const raw of lines){
    const line=raw.trim();if(!line)continue;
    if(/^#EXTM3U/i.test(line))continue;
    if(/^#EXTINF:/i.test(line)){
      pending=parseMetadata(line);headers={};options=[];continue;
    }
    if(/^#EXTGRP:/i.test(line)&&pending){pending.group=line.slice(8).trim();continue}
    if(/^#EXTVLCOPT:/i.test(line)){
      const ok=parseHeaderOption(line.slice(11),headers);if(!ok&&pending)options.push(line);continue;
    }
    if(line.charAt(0)==="#"){if(pending)options.push(line);continue}
    const parsed=splitUrlAndHeaders(line),url=resolveUrl(parsed.url,baseUrl);
    Object.assign(headers,parsed.headers);
    const meta=pending||{name:"",group:"",logo:"",tvgId:"",original:""};
    const name=meta.name||fallbackName(url);
    if(!isNetworkUrl(url)){pending=null;headers={};options=[];continue}
    const mime=hintMime(options)||inferMime(url);
    const type=classify(url,mime,options);
    channels.push({
      name,group:meta.group||"Chưa phân nhóm",url,logo:meta.logo||"",tvgId:meta.tvgId||"",
      headers:{...headers},options:options.slice(),originalExtInf:meta.original,mimeHint:mime,type,
      candidates:[{url,headers:{...headers},ref:headers.Referer||"",ua:headers["User-Agent"]||"",type,mime,options:options.slice()}]
    });
    pending=null;headers={};options=[];
  }
  return channels;
}
function parseMetadata(line){
  const comma=findNameComma(line),attributes=comma>=0?line.slice(0,comma):line,name=comma>=0?line.slice(comma+1).trim():"";
  const a={};let m;ATTRIBUTE.lastIndex=0;while((m=ATTRIBUTE.exec(attributes)))a[m[1].toLowerCase()]=m[2]??m[3]??m[4]??"";
  return {name:name||a["tvg-name"]||"",logo:a["tvg-logo"]||"",tvgId:a["tvg-id"]||"",group:a["group-title"]||"",original:line}
}
function findNameComma(line){let quoted=false,quote="";for(let i=0;i<line.length;i++){const c=line[i];if((c==="'"||c==='"')&&(!quoted||quote===c)){quoted=!quoted;quote=quoted?c:""}else if(c===","&&!quoted)return i}return -1}
function parseHeaderOption(option,headers){
  const e=option.indexOf("=");if(e<1)return false;
  const k=option.slice(0,e).trim().toLowerCase(),v=option.slice(e+1).trim();
  if(k==="http-user-agent"){headers["User-Agent"]=v;return true}
  if(k==="http-referrer"||k==="http-referer"){headers.Referer=v;return true}
  if(k==="http-origin"){headers.Origin=v;return true}
  return false
}
function splitUrlAndHeaders(input){
  const p=input.indexOf("|");if(p<0)return{url:input.trim(),headers:{}};
  const url=input.slice(0,p).trim(),headers={};
  for(const pair of input.slice(p+1).split("&")){
    const e=pair.indexOf("=");if(e<1)continue;
    let k=decode(pair.slice(0,e)),v=decode(pair.slice(e+1));
    if(k==="referrer"||k==="referrer-url"||k==="referer")k="Referer";
    if(k==="user-agent")k="User-Agent";
    if(k==="origin")k="Origin";
    if(validHeader(k,v))headers[k]=v;
  }
  return{url,headers}
}
function validHeader(k,v){return /^[!#$%&'*+.^_\`|~0-9A-Za-z-]+$/.test(k)&&!/[\r\n]/.test(v)}
function decode(v){try{return decodeURIComponent(v)}catch(e){return v}}
function resolveUrl(v,b){const t=String(v||"").trim();if(!t)return"";if(/^[a-z][a-z0-9+.-]*:/i.test(t))return t;try{return new URL(t,b||location.href).toString()}catch(e){return t}}
function isNetworkUrl(v){return /^(https?|rtsp|rtsps|udp|rtmp|rtmps|rtp|srt):\/\//i.test(v)}
function fallbackName(url){try{const u=new URL(url),p=u.pathname.split("/").filter(Boolean);return p[p.length-1]||u.host||"Kênh không tên"}catch(e){return"Kênh không tên"}}
function hintMime(options){
  for(const raw of options){
    const o=String(raw||"").toLowerCase().replace(/ /g,"");
    if(o.includes("manifest_type=hls")||o.includes("manifest-type=hls"))return"application/x-mpegURL";
    if(o.includes("manifest_type=mpd")||o.includes("manifest-type=mpd")||o.includes("manifest_type=dash")||o.includes("manifest-type=dash"))return"application/dash+xml";
    if(o.includes("manifest_type=ism")||o.includes("manifest-type=ism")||o.includes("manifest_type=smoothstreaming"))return"application/vnd.ms-sstr+xml";
    if(o.startsWith("#kodiprop:mimetype="))returnraw(o.split("=",2)[1]);
  }
  return"";
}
function inferMime(url){
  const l=String(url||"").toLowerCase();
  if(/\.m3u8?(?:$|[?#])/.test(l)||/playlist|index\.m3u|chunklist/.test(l))return"application/x-mpegURL";
  if(/\.mpd(?:$|[?#])/.test(l))return"application/dash+xml";
  if(/\.ism(?:l)?\/manifest/.test(l))return"application/vnd.ms-sstr+xml";
  if(/\.ts(?:$|[?#])/.test(l))return"video/mp2t";
  if(/\.mp4(?:$|[?#])/.test(l))return"video/mp4";
  return"";
}
function returnraw(v){return v}
function classify(url,mime,options){
  const l=String(url||"").toLowerCase(),m=String(mime||"").toLowerCase();
  if(m.includes("dash")||/\.mpd(?:$|[?#])/.test(l))return"dash";
  if(m.includes("mpegurl")||/\.m3u8?(?:$|[?#])/.test(l)||/playlist|index\.m3u|chunklist/.test(l))return"hls";
  if(m.includes("smooth")||/\.ism(?:l)?\/manifest/.test(l))return"ism";
  if(m.includes("mp2t")||/\.ts(?:$|[?#])/.test(l))return"ts";
  if(m.includes("mp4")||/\.mp4(?:$|[?#])/.test(l))return"mp4";
  if(/^rtsp/.test(l))return"rtsp";if(/^rtmp/.test(l))return"rtmp";if(/^udp/.test(l))return"udp";if(/^srt/.test(l))return"srt";if(/^rtp/.test(l))return"rtp";
  return"http";
}
let cache={};
export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Cache-Control","s-maxage=8, stale-while-revalidate=30");
  const source=new URL(req.url,"https://nm7-tv-web.vercel.app").searchParams.get("source");
  const target=SOURCES[source||"tv"];
  if(!target)return res.status(400).json({channels:[],error:"Nguồn không hợp lệ"});
  try{
    const now=Date.now();
    if(cache[source]&&now-cache[source].time<8000)return res.status(200).json({channels:cache[source].channels,source,cached:true});
    const r=await fetch(target,{cache:"no-store",headers:{
      "User-Agent":"NM7-TV/1.0.69 Android-TV",
      "Accept":"application/vnd.apple.mpegurl,application/x-mpegURL,text/plain,*/*",
      "Cache-Control":"no-cache"
    }});
    if(!r.ok)throw new Error("HTTP "+r.status);
    const channels=parse(await r.text(),r.url||target);
    cache[source]={time:now,channels};
    return res.status(200).json({channels,source,cached:false});
  }catch(e){
    return res.status(502).json({channels:[],error:e&&e.message?e.message:"Không tải được playlist"});
  }
}
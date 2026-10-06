const YT_ORIGIN = "https://www.youtube.com";
const YT_HOSTS = new Set([
  "www.youtube.com",
  "youtube.com",
  "m.youtube.com",
  "music.youtube.com"
]);

const AD_HOSTS = [
  /(^|\.)doubleclick\.net$/i,
  /(^|\.)googleadservices\.com$/i,
  /(^|\.)googlesyndication\.com$/i,
  /(^|\.)adservice\.google\.com$/i,
  /(^|\.)ads\.youtube\.com$/i
];

const AD_PATHS = [
  /^\/pagead\//i,
  /^\/api\/stats\/ads(?:$|\/|\?)/i,
  /^\/ads\//i,
  /^\/get_midroll_info(?:$|\/|\?)/i
];

const PLAYER_ENDPOINTS = [
  "/youtubei/v1/player",
  "/youtubei/v1/get_watch",
  "/youtubei/v1/next"
];

const AD_SHIELD = String.raw`
(function(){
'use strict';
if(window.__NM7_YT_ADSHIELD__)return;
window.__NM7_YT_ADSHIELD__=true;

var AD_KEYS={
  adPlacements:1,adSlots:1,playerAds:1,no_ads:0,
  adBreakHeartbeatParams:1,adBreaks:1,playerAdParams:1,
  adPodMetadata:1,adClientParams:1
};

function prune(v,d){
  if(!v||typeof v!=='object'||d>18)return v;
  if(Array.isArray(v)){for(var i=0;i<v.length;i++)prune(v[i],d+1);return v;}
  for(var k in v){
    if(!Object.prototype.hasOwnProperty.call(v,k))continue;
    if(AD_KEYS[k]){
      try{delete v[k];}catch(e){try{v[k]=undefined;}catch(e2){}}
      continue;
    }
    prune(v[k],d+1);
  }
  return v;
}

function looks(t){
  return typeof t==='string' &&
    (t.indexOf('"adPlacements"')>=0||
     t.indexOf('"adSlots"')>=0||
     t.indexOf('"playerAds"')>=0||
     t.indexOf('"adBreakHeartbeatParams"')>=0||
     t.indexOf('"playbackTracking"')>=0||
     t.indexOf('/youtubei/v1/player')>=0||
     t.indexOf('/youtubei/v1/get_watch')>=0||
     t.indexOf('/youtubei/v1/next')>=0);
}

function cleanText(t){
  if(!looks(t))return t;
  try{return JSON.stringify(prune(JSON.parse(t),0));}
  catch(e){
    return t
      .replace(/"adPlacements"\s*:/g,'"no_ads":')
      .replace(/"adSlots"\s*:/g,'"no_ads":')
      .replace(/"playerAds"\s*:/g,'"no_ads":')
      .replace(/"adBreakHeartbeatParams"\s*:/g,'"no_ads":')
      .replace(/"adBreaks"\s*:/g,'"no_ads":');
  }
}

var nativeJSON=JSON.parse;
var wrappedJSON=null;
var nativeFetch=null;
var wrappedFetch=null;
var nativeRespJson=null;
var nativeRespText=null;

function installJSON(){
  try{
    if(JSON.parse===wrappedJSON)return;
    if(!nativeJSON)nativeJSON=JSON.parse;
    wrappedJSON=function(t,r){
      var v=nativeJSON.call(JSON,t,r);
      try{if(looks(t))return prune(v,0);}catch(e){}
      return v;
    };
    JSON.parse=wrappedJSON;
  }catch(e){}
}

function cleanHeaders(h){
  var o=new Headers();
  try{h.forEach(function(v,k){
    var x=String(k).toLowerCase();
    if(x==='content-length'||x==='content-encoding'||x==='transfer-encoding')return;
    o.set(k,v);
  });}catch(e){}
  return o;
}

function installResponse(){
  try{
    if(!window.Response||!Response.prototype)return;
    if(typeof Response.prototype.json==='function'){
      if(Response.prototype.json!==nativeRespJson){
        if(!nativeRespJson)nativeRespJson=Response.prototype.json;
        Response.prototype.json=function(){
          return nativeRespJson.call(this).then(function(v){return prune(v,0);});
        };
      }
    }
    if(typeof Response.prototype.text==='function'){
      if(Response.prototype.text!==nativeRespText){
        if(!nativeRespText)nativeRespText=Response.prototype.text;
        Response.prototype.text=function(){
          return nativeRespText.call(this).then(cleanText);
        };
      }
    }
  }catch(e){}
}

function isYTHost(h){
  h=String(h||'').toLowerCase();
  return h==='youtube.com'||h==='www.youtube.com'||h==='m.youtube.com'||h==='music.youtube.com';
}

function localize(u){
  try{
    var x=new URL(String(u||''),location.href);
    if(isYTHost(x.hostname)){
      return location.origin+x.pathname+x.search+x.hash;
    }
  }catch(e){}
  return u;
}

function localizeNavigation(){
  try{
    document.querySelectorAll('a[href]').forEach(function(a){
      var v=a.getAttribute('href'),n=localize(v);
      if(n&&n!==v)a.setAttribute('href',n);
    });
  }catch(e){}
}

function installHistory(){
  try{
    ['pushState','replaceState'].forEach(function(k){
      var n=history[k];
      if(n.__nm7wrapped)return;
      var w=function(state,title,url){
        return n.call(history,state,title,url?localize(url):url);
      };
      w.__nm7wrapped=true;
      w.__nm7native=n;
      history[k]=w;
    });
  }catch(e){}
  try{
    var ow=window.open;
    if(ow&&!ow.__nm7wrapped){
      var wopen=function(url,name,specs){
        return ow.call(window,url?localize(url):url,name,specs);
      };
      wopen.__nm7wrapped=true;
      window.open=wopen;
    }
  }catch(e){}
}

function installXHR(){
  try{
    if(!window.XMLHttpRequest)return;
    var op=XMLHttpRequest.prototype.open;
    if(op.__nm7wrapped)return;
    var w=function(method,url,a,b,c){
      return op.call(this,method,localize(url),a,b,c);
    };
    w.__nm7wrapped=true;
    w.__nm7native=op;
    XMLHttpRequest.prototype.open=w;
  }catch(e){}
}

function installFetch(){
  try{
    if(typeof window.fetch!=='function')return;
    if(window.fetch===wrappedFetch)return;
    if(!nativeFetch||nativeFetch===wrappedFetch)nativeFetch=window.fetch;

    wrappedFetch=function(input,init){
      var raw='';
      try{raw=typeof input==='string'?input:(input&&input.url)||String(input||'');}catch(e){}
      var localized=localize(raw);
      var actual=input;
      try{
        if(localized&&localized!==raw){
          if(typeof input==='string') actual=localized;
          else if(input instanceof Request) actual=new Request(localized,input);
        }
      }catch(e){actual=input;}

      return nativeFetch.call(this,actual,init).then(function(resp){
        if(!looks(raw)&&!looks(localized))return resp;
        try{
          return resp.clone().text().then(function(body){
            var cleaned=cleanText(body);
            if(cleaned===body)return resp;
            return new Response(cleaned,{
              status:resp.status,
              statusText:resp.statusText,
              headers:cleanHeaders(resp.headers)
            });
          });
        }catch(e){return resp;}
      });
    };
    window.fetch=wrappedFetch;
  }catch(e){}
}

function patchGlobals(){
  try{
    if(window.ytInitialPlayerResponse)window.ytInitialPlayerResponse=prune(window.ytInitialPlayerResponse,0);
    if(window.playerResponse)window.playerResponse=prune(window.playerResponse,0);
  }catch(e){}
}

function ads(){
  var selectors=[
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
    '.ytp-skip-ad-button',
    '.ytp-ad-overlay-container',
    '.ytp-ad-overlay-slot',
    '.ytp-ad-text-overlay',
    '.ytp-ad-player-overlay',
    '#player-ads',
    'ytd-ad-slot-renderer',
    'ytd-display-ad-renderer',
    'ytd-in-feed-ad-layout-renderer',
    'ytd-promoted-video-renderer',
    'ytd-action-companion-ad-renderer',
    'ytm-ad-slot-renderer'
  ];
  for(var i=0;i<selectors.length;i++){
    var nodes=document.querySelectorAll(selectors[i]);
    for(var j=0;j<nodes.length;j++){
      try{nodes[j].click();}catch(e){}
      try{nodes[j].remove();}catch(e){}
    }
  }
  var ad=document.querySelector('.ad-showing');
  var v=document.querySelector('video');
  if(ad&&v){
    try{
      if(isFinite(v.duration)&&v.duration>0&&v.currentTime+0.5<v.duration)
        v.currentTime=Math.max(0,v.duration-0.05);
    }catch(e){}
  }
}

function install(){
  installJSON();
  installResponse();
  installFetch();
  installXHR();
  installHistory();
  localizeNavigation();
  patchGlobals();
  ads();
}
install();
setInterval(install,400);
try{new MutationObserver(install).observe(document.documentElement||document,{subtree:true,childList:true});}catch(e){}
})();`;

function isYouTubeHost(host) {
  const h = String(host || "").toLowerCase();
  return YT_HOSTS.has(h);
}

function isPlayerEndpoint(pathname) {
  return PLAYER_ENDPOINTS.some(p => pathname === p || pathname.startsWith(p + "?"));
}

function isExplicitAdTarget(u) {
  const host = String(u.hostname || "").toLowerCase();
  if (AD_HOSTS.some(re => re.test(host))) return true;
  if (isYouTubeHost(host) && AD_PATHS.some(re => re.test(u.pathname))) return true;
  return false;
}

function sanitizeCookie(v) {
  return String(v || "")
    .replace(/;\s*domain=[^;]+/ig, "")
    .replace(/;\s*secure/ig, "; Secure");
}

function rewriteSetCookie(value) {
  return String(value || "")
    .replace(/;\\s*Domain=[^;]+/ig, "")
    .replace(/;\\s*SameSite=None/ig, "; SameSite=None")
    .replace(/;\\s*Partitioned/ig, "");
}

function copyUpstreamHeaders(upstream) {
  const h = new Headers();
  for (const [k, v] of upstream.headers.entries()) {
    const key = k.toLowerCase();
    if ([
      "content-length","content-encoding","transfer-encoding",
      "content-security-policy","content-security-policy-report-only",
      "x-frame-options","cross-origin-opener-policy",
      "cross-origin-embedder-policy","cross-origin-resource-policy"
    ].includes(key)) continue;
    if (key === "set-cookie") continue;
    h.set(k, v);
  }

  try {
    if (typeof upstream.headers.getSetCookie === "function") {
      for (const c of upstream.headers.getSetCookie()) {
        h.append("Set-Cookie", rewriteSetCookie(c));
      }
    } else {
      const c = upstream.headers.get("set-cookie");
      if (c) {
        for (const part of String(c).split(/,(?=[^;,]+=)/)) {
          h.append("Set-Cookie", rewriteSetCookie(part));
        }
      }
    }
  } catch {}

  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Credentials", "true");
  h.set("Access-Control-Expose-Headers", "*");
  return h;
}

function rewriteTargetUrl(value, proxyOrigin) {
  if (!value) return value;
  const s = String(value);
  try {
    const u = new URL(s, YT_ORIGIN + "/");
    if (isYouTubeHost(u.hostname)) {
      return proxyOrigin + u.pathname + u.search + u.hash;
    }
    return s;
  } catch {
    return s;
  }
}

function rewriteYouTubeRuntimeText(text, proxyOrigin) {
  let body = String(text || "");
  const escOrigin = proxyOrigin.replace(/\\/g, "\\\\");
  const originForJs = escOrigin.replace(/\\/g, "\\\\");
  const abs = [
    ["https://www.youtube.com", proxyOrigin],
    ["http://www.youtube.com", proxyOrigin],
    ["https://m.youtube.com", proxyOrigin],
    ["http://m.youtube.com", proxyOrigin]
  ];
  for (const [from, to] of abs) {
    body = body.split(from).join(to);
  }
  body = body
    .replace(/https:\\\/\\\/www\\.youtube\\.com/g, originForJs.replace(/:\\/\\//, ":\\\\/\\\\/"))
    .replace(/https:\\\/\\\/m\\.youtube\\.com/g, originForJs.replace(/:\\/\\//, ":\\\\/\\\\/"))
    .replace(/\\/\\/www\\.youtube\\.com/g, proxyOrigin)
    .replace(/\\/\\/m\\.youtube\\.com/g, proxyOrigin);

  // Runtime APIs used by the YouTube SPA often carry an absolute origin
  // inside JSON/JS rather than as an HTML attribute.
  body = body
    .replace(/(["'])\/\/www\\.youtube\\.com/g, "$1" + proxyOrigin)
    .replace(/(["'])\/\/m\\.youtube\\.com/g, "$1" + proxyOrigin);

  return body;
}

const PROXY_RUNTIME = String.raw\`
(function(){
'use strict';
if(window.__NM7_YT_PROXY_RUNTIME__)return;
window.__NM7_YT_PROXY_RUNTIME__=true;
var ORIGIN=location.origin;
function local(v){
  try{
    if(!v)return v;
    var u=new URL(String(v),location.href);
    var h=(u.hostname||'').toLowerCase();
    if(h==='www.youtube.com'||h==='youtube.com'||h==='m.youtube.com'||h==='music.youtube.com')
      return ORIGIN+u.pathname+u.search+u.hash;
  }catch(e){}
  return v;
}
try{
  var of=window.fetch;
  if(of&&!of.__nm7){
    var wf=function(input,init){
      try{
        if(typeof input==='string')input=local(input);
        else if(input&&input.url){
          var nu=local(input.url);
          if(nu!==input.url)input=new Request(nu,input);
        }
      }catch(e){}
      return of.call(this,input,init);
    };
    wf.__nm7=true; wf.__nm7native=of; window.fetch=wf;
  }
}catch(e){}
try{
  var xo=XMLHttpRequest.prototype.open;
  if(xo&&!xo.__nm7){
    var wx=function(method,url,a,b,c){return xo.call(this,method,local(url),a,b,c)};
    wx.__nm7=true; wx.__nm7native=xo; XMLHttpRequest.prototype.open=wx;
  }
}catch(e){}
try{
  ['pushState','replaceState'].forEach(function(k){
    var n=history[k];
    if(n&&!n.__nm7){
      var w=function(st,title,url){return n.call(history,st,title,url?local(url):url)};
      w.__nm7=true; history[k]=w;
    }
  });
}catch(e){}
try{
  var ow=window.open;
  if(ow&&!ow.__nm7){
    var wo=function(url,name,specs){return ow.call(window,url?local(url):url,name,specs)};
    wo.__nm7=true; window.open=wo;
  }
}catch(e){}
try{
  document.addEventListener('click',function(ev){
    var a=ev.target&&ev.target.closest?ev.target.closest('a[href]'):null;
    if(!a)return;
    var href=a.getAttribute('href'),nu=local(href);
    if(nu&&nu!==href)a.setAttribute('href',nu);
  },true);
}catch(e){}
setInterval(function(){
  try{
    document.querySelectorAll('a[href]').forEach(function(a){
      var h=a.getAttribute('href'),n=local(h);
      if(n&&n!==h)a.setAttribute('href',n);
    });
  }catch(e){}
},750);
})();\`;

function maybeRewriteHtml(upstream, proxyOrigin) {
  const headers = copyUpstreamHeaders(upstream);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "no-store");

  return new HTMLRewriter()
    .on("head", {
      element(el) {
        el.prepend("<script>" + PROXY_RUNTIME + "</script><script>" + AD_SHIELD + "</script>", { html: true });
      }
    })
    .on("*", {
      element(el) {
        for (const attr of ["href","src","action","poster","data-src","data-url","data-href"]) {
          const value = el.getAttribute(attr);
          if (!value) continue;
          const rewritten = rewriteTargetUrl(value, proxyOrigin);
          if (rewritten !== value) el.setAttribute(attr, rewritten);
        }
      }
    })
    .transform(new Response(upstream.body, { status: upstream.status, headers }));
}

function cleanPlayerResponseText(body) {
  if (!body || body.length > 4 * 1024 * 1024) return body;
  return String(body)
    .replace(/"adPlacements"\s*:/g, '"no_ads":')
    .replace(/"adSlots"\s*:/g, '"no_ads":')
    .replace(/"playerAds"\s*:/g, '"no_ads":')
    .replace(/"adBreakHeartbeatParams"\s*:/g, '"no_ads":')
    .replace(/"adBreaks"\s*:/g, '"no_ads":')
    .replace(/"playerAdParams"\s*:/g, '"no_ads":')
    .replace(/"adPodMetadata"\s*:/g, '"no_ads":')
    .replace(/"isAd"\s*:\s*true/g, '"isAd":false')
    .replace(/"is_ad"\s*:\s*true/g, '"is_ad":false');
}

async function fetchUpstream(request, target) {
  const h = new Headers();
  for (const [k, v] of request.headers.entries()) {
    const key = k.toLowerCase();
    if ([
      "host","connection","content-length",
      "origin","referer",
      "sec-fetch-site","sec-fetch-mode","sec-fetch-dest",
      "cf-connecting-ip","cf-ray","cf-visitor"
    ].includes(key)) continue;
    h.set(k, v);
  }

  h.set("Origin", YT_ORIGIN);
  h.set("Referer", YT_ORIGIN + "/");

  let body;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json") &&
        isPlayerEndpoint(target.pathname)) {
      const raw = await request.text();
      body = raw
        .replace(/"clientScreen"\s*:\s*"WATCH"/g, '"clientScreen":"ADUNIT"')
        .replace(/"clientScreen"\s*:\s*"WATCH_CARDS"/g, '"clientScreen":"ADUNIT"');
    } else {
      body = request.body;
    }
  }

  return fetch(target.toString(), {
    method: request.method,
    headers: h,
    body,
    redirect: "follow",
    cache: "no-store"
  });
}

async function handleYouTubeRequest(request) {
  const incoming = new URL(request.url);
  let target = new URL(YT_ORIGIN + incoming.pathname + incoming.search);

  if (incoming.pathname === "/" || incoming.pathname === "/tv" || incoming.pathname === "/embed") {
    target = new URL(YT_ORIGIN + incoming.pathname + incoming.search);
  }

  if (isExplicitAdTarget(target)) {
    return new Response("", {
      status: 204,
      headers: {
        "cache-control": "no-store",
        "access-control-allow-origin": "*"
      }
    });
  }

  const upstream = await fetchUpstream(request, target);
  const ct = (upstream.headers.get("content-type") || "").toLowerCase();
  const proxyOrigin = incoming.origin;

  if (ct.includes("text/html")) {
    return maybeRewriteHtml(upstream, proxyOrigin);
  }

  if (isPlayerEndpoint(target.pathname) &&
      (ct.includes("application/json") || ct.includes("text/json") || ct === "")) {
    const body = await upstream.text();
    const cleaned = cleanPlayerResponseText(body);
    const h = copyUpstreamHeaders(upstream);
    h.set("content-type", "application/json; charset=utf-8");
    h.set("cache-control", "no-store");
    h.set("access-control-allow-origin", "*");
    return new Response(cleaned, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: h
    });
  }

  const h = copyUpstreamHeaders(upstream);
  h.set("cache-control", h.get("cache-control") || "no-store");

  if (ct.includes("javascript") || ct.includes("text/css") ||
      ct.includes("text/plain")) {
    const textBody = await upstream.text();
    const rewritten = rewriteYouTubeRuntimeText(textBody, proxyOrigin);
    if (rewritten !== textBody) {
      h.delete("content-length");
      h.delete("content-encoding");
      return new Response(rewritten, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: h
      });
    }
    return new Response(textBody, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: h
    });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: h
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,HEAD,POST,OPTIONS",
          "access-control-allow-headers": "*",
          "access-control-max-age": "86400"
        }
      });
    }

    try {
      return await handleYouTubeRequest(request);
    } catch (e) {
      return new Response("NM7 YouTube proxy error", {
        status: 502,
        headers: {"content-type":"text/plain; charset=utf-8"}
      });
    }
  }
};

const DEFAULT_HOST = "www.youtube.com";
const YOUTUBE_HOSTS = new Set([
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
  /^\/pagead(?:\/|$)/i,
  /^\/api\/stats\/ads(?:\/|$)/i,
  /^\/ads(?:\/|$)/i,
  /^\/get_midroll_info(?:\/|$)/i
];

const BLOCKED_SCHEMES = /^(javascript|data|blob|chrome|file):/i;

function proxyTargetFromPath(pathname, search) {
  let path = pathname || "/";
  let scheme = "https";
  let host = DEFAULT_HOST;

  const m = path.match(/^\/(https|http)\/([^/]+)(\/.*)?$/i);
  if (m) {
    scheme = m[1].toLowerCase();
    host = m[2].toLowerCase();
    path = m[3] || "/";
  }

  if (!/^[a-z0-9.-]+$/i.test(host)) host = DEFAULT_HOST;
  return new URL(scheme + "://" + host + (path.startsWith("/") ? path : "/" + path) + (search || ""));
}

function isYoutubeHost(host) {
  return YOUTUBE_HOSTS.has(String(host || "").toLowerCase());
}

function adBlocked(url) {
  const h = String(url.hostname || "").toLowerCase();
  if (AD_HOSTS.some(re => re.test(h))) return true;
  if (isYoutubeHost(h) && AD_PATHS.some(re => re.test(url.pathname || "/"))) return true;
  return false;
}

function proxyUrlFor(raw, proxyOrigin) {
  if (!raw) return raw;
  const value = String(raw).trim();
  if (!value || value.startsWith("#") || BLOCKED_SCHEMES.test(value)) return value;

  try {
    const u = new URL(value, "https://" + DEFAULT_HOST + "/");
    if (!isYoutubeHost(u.hostname)) return value;
    return proxyOrigin + "/https/" + u.hostname + u.pathname + u.search + u.hash;
  } catch {
    return value;
  }
}

function rewriteCssUrls(text, proxyOrigin) {
  return String(text || "").replace(
    /url\(\s*(['"]?)(https?:\/\/(?:www|m|music)\.youtube\.com[^'")]+)\1\s*\)/gi,
    (m, q, url) => "url(" + q + proxyUrlFor(url, proxyOrigin) + q + ")"
  );
}

function rewriteRuntimeText(text, proxyOrigin) {
  let body = String(text || "");
  const hosts = [
    "www.youtube.com",
    "youtube.com",
    "m.youtube.com",
    "music.youtube.com"
  ];

  for (const host of hosts) {
    const p = proxyOrigin + "/https/" + host;
    body = body.split("https://" + host).join(p);
    body = body.split("http://" + host).join(p);
    body = body.split("//" + host).join(p);
    body = body.split("\\/\\/" + host).join(p);
  }

  body = rewriteCssUrls(body, proxyOrigin);

  // Common YouTube absolute API/player endpoints embedded in JS/JSON strings.
  body = body
    .replace(/(["'])\/youtubei\//g, "$1" + proxyOrigin + "/https/" + DEFAULT_HOST + "/youtubei/")
    .replace(/(["'])\/api\/stats\//g, "$1" + proxyOrigin + "/https/" + DEFAULT_HOST + "/api/stats/");

  return body;
}

function rewriteSrcset(value, proxyOrigin) {
  return String(value || "").split(",").map(part => {
    const bits = part.trim().split(/\s+/);
    if (!bits[0]) return part;
    bits[0] = proxyUrlFor(bits[0], proxyOrigin);
    return bits.join(" ");
  }).join(", ");
}

function rewriteLocation(location, proxyOrigin) {
  return location ? proxyUrlFor(location, proxyOrigin) : location;
}

function rewriteSetCookie(cookie) {
  return String(cookie || "")
    .replace(/;\s*Domain=[^;]+/ig, "")
    .replace(/;\s*Partitioned/ig, "");
}

function copyHeaders(upstream) {
  const h = new Headers();

  for (const [k, v] of upstream.headers.entries()) {
    const key = k.toLowerCase();
    if ([
      "content-length",
      "content-encoding",
      "transfer-encoding",
      "content-security-policy",
      "content-security-policy-report-only",
      "x-frame-options",
      "clear-site-data"
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
      if (c) h.append("Set-Cookie", rewriteSetCookie(c));
    }
  } catch {}

  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Credentials", "true");
  h.set("Access-Control-Expose-Headers", "*");
  return h;
}

const RUNTIME = String.raw`
(function(){
'use strict';
if(window.__NM7_YT_RUNTIME__)return;
window.__NM7_YT_RUNTIME__=true;

var ORIGIN=location.origin;

function localize(value){
  try{
    if(!value)return value;
    var u=new URL(String(value),location.href);
    var h=(u.hostname||'').toLowerCase();
    if(h==='www.youtube.com'||h==='youtube.com'||h==='m.youtube.com'||h==='music.youtube.com'){
      return ORIGIN+'/https/'+h+u.pathname+u.search+u.hash;
    }
  }catch(e){}
  return value;
}

function patchFetch(){
  try{
    var f=window.fetch;
    if(!f||f.__nm7)return;
    var w=function(input,init){
      try{
        if(typeof input==='string') input=localize(input);
        else if(input&&input.url){
          var u=localize(input.url);
          if(u!==input.url) input=new Request(u,input);
        }
      }catch(e){}
      return f.call(this,input,init);
    };
    w.__nm7=true;
    window.fetch=w;
  }catch(e){}
}

function patchXHR(){
  try{
    var o=XMLHttpRequest.prototype.open;
    if(!o||o.__nm7)return;
    var w=function(method,url,a,b,c){
      return o.call(this,method,localize(url),a,b,c);
    };
    w.__nm7=true;
    XMLHttpRequest.prototype.open=w;
  }catch(e){}
}

function patchHistory(){
  try{
    ['pushState','replaceState'].forEach(function(k){
      var o=history[k];
      if(!o||o.__nm7)return;
      var w=function(s,t,u){return o.call(history,s,t,u?localize(u):u)};
      w.__nm7=true;
      history[k]=w;
    });
  }catch(e){}
}

function patchOpen(){
  try{
    var o=window.open;
    if(!o||o.__nm7)return;
    var w=function(u,n,s){return o.call(window,u?localize(u):u,n,s)};
    w.__nm7=true;
    window.open=w;
  }catch(e){}
}

function rewriteLinks(){
  try{
    document.querySelectorAll('a[href]').forEach(function(a){
      var h=a.getAttribute('href'),n=localize(h);
      if(n&&n!==h)a.setAttribute('href',n);
    });
  }catch(e){}
}

function install(){
  patchFetch();
  patchXHR();
  patchHistory();
  patchOpen();
  rewriteLinks();
}
install();
setInterval(install,700);
try{
  new MutationObserver(install).observe(document.documentElement||document,{
    childList:true,subtree:true
  });
}catch(e){}
})();`;

const ADS = String.raw`
(function(){
'use strict';
if(window.__NM7_YT_AD_DOM__)return;
window.__NM7_YT_AD_DOM__=true;

function work(){
  var skip=[
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
    '.ytp-skip-ad-button'
  ];

  for(var i=0;i<skip.length;i++){
    var a=document.querySelectorAll(skip[i]);
    for(var j=0;j<a.length;j++){
      try{a[j].click()}catch(e){}
    }
  }

  var remove=[
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

  for(var x=0;x<remove.length;x++){
    var nodes=document.querySelectorAll(remove[x]);
    for(var y=0;y<nodes.length;y++){
      try{nodes[y].remove()}catch(e){}
    }
  }

  var container=document.querySelector('.ad-showing');
  var video=document.querySelector('video');
  if(container&&video){
    try{
      if(isFinite(video.duration)&&video.duration>0&&video.currentTime+0.4<video.duration){
        video.currentTime=Math.max(0,video.duration-0.05);
      }
    }catch(e){}
  }
}

try{
  new MutationObserver(work).observe(document.documentElement||document,{
    childList:true,subtree:true
  });
}catch(e){}
setInterval(work,350);
work();
})();`;

function rewriteHtml(upstream, proxyOrigin) {
  const headers = copyHeaders(upstream);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "no-store");

  return new HTMLRewriter()
    .on("head", {
      element(el) {
        el.prepend(
          "<script>" + RUNTIME + "</script>" +
          "<script>" + ADS + "</script>",
          {html:true}
        );
      }
    })
    .on("*", {
      element(el) {
        for (const attr of ["href","src","action","poster","data-src","data-url","data-href"]) {
          const v = el.getAttribute(attr);
          if (!v) continue;
          const n = attr === "srcset" ? rewriteSrcset(v, proxyOrigin) : proxyUrlFor(v, proxyOrigin);
          if (n !== v) el.setAttribute(attr, n);
        }
        const ss = el.getAttribute("srcset");
        if (ss) {
          const n = rewriteSrcset(ss, proxyOrigin);
          if (n !== ss) el.setAttribute("srcset", n);
        }
      }
    })
    .on("meta[http-equiv]", {
      element(el) {
        if ((el.getAttribute("http-equiv") || "").toLowerCase() === "refresh") {
          const c = el.getAttribute("content") || "";
          el.setAttribute("content", c.replace(/url\s*=\s*([^;]+)/i, (_, u) => "url=" + proxyUrlFor(u.trim(), proxyOrigin)));
        }
      }
    })
    .transform(new Response(upstream.body, {status: upstream.status, headers}));
}

async function fetchTarget(request, target) {
  const h = new Headers();
  for (const [k, v] of request.headers.entries()) {
    const key = k.toLowerCase();
    if ([
      "host","connection","content-length",
      "cf-connecting-ip","cf-ray","cf-visitor",
      "x-forwarded-for","x-forwarded-proto","x-real-ip",
      "origin","referer",
      "sec-fetch-site","sec-fetch-mode","sec-fetch-dest"
    ].includes(key)) continue;
    h.set(k, v);
  }

  // Present the request to YouTube as a first-party mobile request.
  h.set("Origin", "https://" + target.host);
  h.set("Referer", "https://" + target.host + "/");

  const init = {
    method: request.method,
    headers: h,
    redirect: "follow",
    cache: "no-store"
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  return fetch(target.toString(), init);
}

function isMobileRequest(request) {
  const ua = request.headers.get("user-agent") || "";
  return /android|iphone|ipad|ipod|mobile/i.test(ua);
}

function mobileTarget(target) {
  if (!isYoutubeHost(target.hostname)) return target;
  const u = new URL(target.toString());
  if (u.hostname === "www.youtube.com" || u.hostname === "youtube.com") {
    u.hostname = "m.youtube.com";
  }
  return u;
}

async function fetchYouTubeTarget(request, target) {
  let upstream = await fetchTarget(request, target);

  // YouTube may rate-limit the desktop www endpoint from a Worker egress IP.
  // Mobile pages are a supported first-party fallback and use the same UI/player
  // path. Only retry on 429 to avoid masking genuine upstream errors.
  if (upstream.status === 429 && isMobileRequest(request)) {
    const mt = mobileTarget(target);
    if (mt.hostname !== target.hostname) {
      const retry = await fetchTarget(request, mt);
      if (retry.ok || retry.status < 500) return retry;
    }
  }

  return upstream;
}

async function handler(request) {
  const incoming = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status:204,
      headers:{
        "access-control-allow-origin":"*",
        "access-control-allow-methods":"GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS",
        "access-control-allow-headers":"*",
        "access-control-max-age":"86400"
      }
    });
  }

  let target = proxyTargetFromPath(incoming.pathname, incoming.search);

  if (isMobileRequest(request) && incoming.pathname === "/") {
    target = mobileTarget(target);
  }

  if (!isYoutubeHost(target.hostname)) {
    return new Response("NM7 YouTube proxy: unsupported host", {status:403});
  }

  if (adBlocked(target)) {
    return new Response("", {
      status:204,
      headers:{
        "cache-control":"no-store",
        "access-control-allow-origin":"*"
      }
    });
  }

  const upstream = await fetchYouTubeTarget(request, target);
  const ct = (upstream.headers.get("content-type") || "").toLowerCase();
  const headers = copyHeaders(upstream);
  const proxyOrigin = incoming.origin;

  let out = upstream;

  if (ct.includes("text/html")) {
    out = rewriteHtml(upstream, proxyOrigin);
  } else if (ct.includes("javascript") || ct.includes("text/css")) {
    const body = await upstream.text();
    const rewritten = rewriteRuntimeText(body, proxyOrigin);
    headers.delete("content-length");
    headers.delete("content-encoding");
    out = new Response(rewritten, {
      status:upstream.status,
      statusText:upstream.statusText,
      headers
    });
  } else {
    out = new Response(upstream.body, {
      status:upstream.status,
      statusText:upstream.statusText,
      headers
    });
  }

  return out;
}

export default {
  async fetch(request) {
    try {
      return await handler(request);
    } catch (e) {
      return new Response("NM7 YouTube proxy error", {
        status:502,
        headers:{"content-type":"text/plain; charset=utf-8"}
      });
    }
  }
};

import { getVietMiTVPlaylist } from "./vietmitv-source.js";

const SOURCES = {
  tv: [
    "https://phuongnm7-playlist.phuongnm7-iptv.workers.dev/",
    "https://iptv-live-merge.phuongnm7-iptv.workers.dev/playlist.m3u",
    "https://raw.githubusercontent.com/phuongnm7/Iptv-phuongnm7/main/IPTV_Gop_VMTTV_vAppTV.m3u"
  ],
  sport: ["https://thethaonm7.phuongnm7-iptv.workers.dev/playlist.m3u"]
};

const MERGE_SOURCES = {
  sport: "https://raw.githubusercontent.com/phuongnm7/Iptv-phuongnm7/main/sports-auto.m3u?utm_source=chatgpt.com"
};

const EXTRA_GROUPS = [
  "Giờ Vàng TV",
  "Gà Vàng 24h TV",
  "Gà Vàng 33 TV",
  "S8 TV",
  "Sao Kê TV"
].map(normalizeGroup);

export const config = { maxDuration: 30 };

function normalizeGroup(value) {
  return String(value || "").normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");
}

function parse(t) {
  const lines = String(t || "").replace(/^\uFEFF/, "").split(/\r?\n/), out = [];
  let m = null, ua = "", ref = "", origin = "", manifestType = "", licenseType = "", licenseKey = "";
  for (const raw of lines) {
    const l = raw.trim();
    if (l.indexOf("#EXTINF:") === 0) {
      if (m && m.candidates.length) out.push(m);
      const p = l.indexOf(","), h = p < 0 ? l : l.slice(0, p);
      m = {
        name: p < 0 ? "Kênh" : l.slice(p + 1).trim(),
        group: (/group-title="([^"]*)"/i.exec(h) || [])[1] || "Khác",
        logo: (/tvg-logo="([^"]*)"/i.exec(h) || [])[1] || "",
        id: (/tvg-id="([^"]*)"/i.exec(h) || [])[1] || "",
        candidates: []
      };
      ua = ""; ref = ""; origin = ""; manifestType = ""; licenseType = ""; licenseKey = "";
    } else if (m && l.indexOf("#EXTVLCOPT:") === 0) {
      const um = /http-user-agent=(?:"([^"]+)"|([^\s]+))/i.exec(l);
      const rm = /(?:http-referrer|http-referer)=(?:"([^"]+)"|([^\s]+))/i.exec(l);
      const om = /http-origin=(?:"([^"]+)"|([^\s]+))/i.exec(l);
      if (um) ua = um[1] || um[2];
      if (rm) ref = rm[1] || rm[2];
      if (om) origin = om[1] || om[2];
    } else if (m && l.indexOf("#KODIPROP:") === 0) {
      const mt = /inputstream\.adaptive\.manifest_type=(.+)/i.exec(l);
      const lt = /inputstream\.adaptive\.license_type=(.+)/i.exec(l);
      const lk = /inputstream\.adaptive\.license_key=(.+)/i.exec(l);
      if (mt) manifestType = mt[1].trim();
      if (lt) licenseType = lt[1].trim();
      if (lk) licenseKey = lk[1].trim();
    } else if (m && l.charAt(0) !== "#" && /^(https?|rtsp|rtmp|udp):/i.test(l)) {
      const ps = l.split("|"), url = ps[0];
      let r = ref, u = ua, o = origin;
      for (let i = 1; i < ps.length; i++) {
        const eq = ps[i].indexOf("=");
        if (eq < 1) continue;
        const key = ps[i].slice(0, eq).trim(), value = ps[i].slice(eq + 1).trim();
        if (/^(referer|http-referrer|http-referer)$/i.test(key)) r = value;
        if (/^http-user-agent$/i.test(key)) u = value;
        if (/^origin$/i.test(key)) o = value;
      }
      const lowerManifest = manifestType.toLowerCase();
      const drm = licenseType && licenseKey ? { type: licenseType, key: licenseKey } : null;
      m.candidates.push({
        url, ref: r, ua: u, headers: o ? { Origin: o } : {},
        type: lowerManifest === "mpd" ? "dash" : lowerManifest === "hls" ? "hls" : "",
        dash: lowerManifest === "mpd",
        hls: lowerManifest === "hls" || /\.(m3u8|m3u)(?:$|\?)/i.test(url) || /playlist|index\.m3u|manifest/i.test(url),
        drm
      });
    }
  }
  if (m && m.candidates.length) out.push(m);

  const merged = [], byKey = {};
  for (const c of out) {
    c.id = c.id || c.name;
    const gid = String(c.id || "").toLowerCase().trim();
    const nameKey = String(c.name || "").toLowerCase().replace(/\b(server|source|nguon)\s*\d+\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();
    const key = (c.group || "") + "|" + (gid || nameKey);
    if (!byKey[key]) {
      byKey[key] = { ...c, candidates: c.candidates.slice() };
      merged.push(byKey[key]);
    } else {
      const seen = new Set(byKey[key].candidates.map(x => x.url));
      for (const x of c.candidates) if (x.url && !seen.has(x.url)) {
        byKey[key].candidates.push(x); seen.add(x.url);
      }
      if (!byKey[key].logo && c.logo) byKey[key].logo = c.logo;
    }
  }
  for (const c of merged) {
    addBuiltin(c);
    c.candidates.sort((a, b) => score(b.url) - score(a.url));
  }
  return merged;
}

const BUILTIN = {
  vtv1hd: [{ url: "https://vtvgolive-failover.vtvdigital.vn/vtvgo/vtv1-manifest.m3u8", ref: "", ua: "", hls: true }],
  vtvcab3hd: [{ url: "https://e3.endpoint.cdn.sctvonline.vn/hls/vtvcab3/index.m3u8", ref: "http://sctvonline.vn/", ua: "ReactNativeVideo/3.4.4 (Linux;Android 9) ExoPlayerLib/2.13.3", hls: true }],
  vtvcab16hd: [{ url: "https://e7.endpoint.cdn.sctvonline.vn/live/smil:VTVCAB16.smil/chunklist_w2005840737_b1692000.m3u8", ref: "http://sctvonline.vn/", ua: "ReactNativeVideo/3.4.4 (Linux;Android 9) ExoPlayerLib/2.13.3", hls: true }]
};

function addBuiltin(c) {
  const key = String(c.id || "").toLowerCase().trim();
  const name = String(c.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  let extra = BUILTIN[key] || [];
  if (!extra.length && (key === "vtv1" || name === "vtv1" || name.indexOf("vtv1") === 0)) extra = BUILTIN.vtv1hd;
  if (!extra.length && (name.indexOf("onsport") === 0 || name.indexOf("vtvcab3") >= 0)) extra = BUILTIN.vtvcab3hd;
  if (!extra.length && (name.indexOf("onfootball") === 0 || name.indexOf("vtvcab16") >= 0)) extra = BUILTIN.vtvcab16hd;
  if (!extra.length) return;
  const seen = new Set((c.candidates || []).map(x => x.url));
  for (const x of extra) if (!seen.has(x.url)) { c.candidates.push(x); seen.add(x.url); }
}

function score(u) {
  let s = 0;
  if (/\.m3u8(?:$|\?)/i.test(u)) s += 100;
  if (/\.m3u(?:$|\?)/i.test(u)) s += 80;
  if (/\/hls\//i.test(u)) s += 30;
  if (/playlist|index\.m3u|manifest/i.test(u)) s += 20;
  if (/\.(mp4|ts)(?:$|\?)/i.test(u)) s += 10;
  if (/tth\.vn\//i.test(u)) s -= 50;
  return s;
}

function proxyUrl(c) {
  const out = [];
  for (const x of c.candidates) {
    if (!/^https?:/i.test(x.url)) continue;
    let q = "?u=" + encodeURIComponent(x.url);
    if (x.ref) q += "&r=" + encodeURIComponent(x.ref);
    if (x.ua) q += "&ua=" + encodeURIComponent(x.ua);
    if (x.headers && Object.keys(x.headers).length) q += "&h=" + encodeURIComponent(JSON.stringify(x.headers));
    out.push({ ...x, proxy: "/api/stream" + q });
  }
  c.candidates = out;
  return c;
}

let cache = {};
function withTimeout(ms) {
  const ac = new AbortController(), timer = setTimeout(() => ac.abort(), ms);
  return { signal: ac.signal, done: () => clearTimeout(timer) };
}
async function fetchText(url) {
  const x = withTimeout(8500);
  try {
    const r = await fetch(url, {
      redirect: "follow", cache: "no-store", signal: x.signal,
      headers: { "User-Agent": "NM7-TV-Web/1.0", "Accept": "application/vnd.apple.mpegurl,text/plain,*/*", "Cache-Control": "no-cache" }
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.text();
  } finally { x.done(); }
}

function channelKey(c) {
  const id = String(c.id || "").toLowerCase().trim();
  const name = String(c.name || "").toLowerCase().replace(/\b(server|source|nguon)\s*\d+\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  return normalizeGroup(c.group) + "|" + (id || name);
}

function combineChannels(main, extra) {
  const merged = main.slice(), byKey = new Map();
  for (const c of merged) byKey.set(channelKey(c), c);
  for (const c of extra) {
    const key = channelKey(c), old = byKey.get(key);
    if (!old) { byKey.set(key, c); merged.push(c); continue; }
    const seen = new Set(old.candidates.map(x => x.url));
    for (const candidate of c.candidates) if (candidate.url && !seen.has(candidate.url)) {
      old.candidates.push(candidate); seen.add(candidate.url);
    }
    if (!old.logo && c.logo) old.logo = c.logo;
  }
  for (const c of merged) { addBuiltin(c); c.candidates.sort((a, b) => score(b.url) - score(a.url)); proxyUrl(c); }
  return merged;
}

async function buildVietMiTV() {
  // Primary list is the exact M3U file uploaded by the user and bundled with this deployment.
  // It no longer depends on vietmitv.id.vn being reachable.
  const main = parse(getVietMiTVPlaylist());
  if (!main.length) throw new Error("File M3U chính không có kênh hợp lệ");

  let extras = [];
  let sportError = "";
  try {
    const sportM3u = await fetchText(MERGE_SOURCES.sport);
    extras = parse(sportM3u).filter(c => EXTRA_GROUPS.includes(normalizeGroup(c.group)));
  } catch (error) {
    sportError = String(error);
  }

  const channels = combineChannels(main, extras);
  return {
    channels,
    upstream: "bundled-uploaded-m3u",
    merged: true,
    extraGroups: [...new Set(extras.map(c => c.group))],
    sportError
  };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD, OPTIONS");
    return res.status(405).end("Method not allowed");
  }

  const source = new URL(req.url, "https://nm7-tv-web.vercel.app").searchParams.get("source");
  const targets = SOURCES[source];
  if (!targets && source !== "vietmitv") return res.status(400).json({ channels: [], source });

  const now = Date.now(), hit = cache[source];
  if (hit && now - hit.time < 5000) {
    res.setHeader("X-NM7-Cache", "HIT");
    return res.status(200).json({ channels: hit.channels, source, cached: true, ...(hit.meta || {}) });
  }

  if (source === "vietmitv" || source === "tv") {
    try {
      const data = await buildVietMiTV();
      cache[source] = { time: now, channels: data.channels, meta: { upstream: data.upstream, merged: true, extraGroups: data.extraGroups } };
      res.setHeader("X-NM7-Cache", "MISS");
      res.setHeader("X-NM7-Main-Channel-Count", String(parseInt(data.channels.length, 10)));
      res.setHeader("X-NM7-Extra-Group-Count", String(data.extraGroups.length));
      return res.status(200).json({ channels: data.channels, source, cached: false, upstream: data.upstream, merged: true, extraGroups: data.extraGroups });
    } catch (error) {
      if (source === "vietmitv") return res.status(502).json({ channels: [], source, error: error?.message || "Không tải được VietMiTV" });
      if (hit && hit.channels && hit.channels.length) return res.status(200).json({ channels: hit.channels, source, cached: true, stale: true, error: error?.message || "Nguồn mới lỗi" });
      // The original TV playlist remains the fallback if VietMiTV is unavailable.
    }
  }

  const errors = [];
  const results = await Promise.all(targets.map(async target => {
    try {
      const body = await fetchText(target);
      const channels = parse(body);
      for (const ch of channels) proxyUrl(ch);
      if (!channels.length) throw new Error("playlist rỗng");
      return { target, channels };
    } catch (e) {
      return { target, error: String(e) };
    }
  }));
  const good = results.find(x => x.channels && x.channels.length);
  if (good) {
    cache[source] = { time: now, channels: good.channels, meta: { upstream: good.target } };
    return res.status(200).json({ channels: good.channels, source, cached: false, upstream: good.target });
  }
  for (const x of results) if (x.error) errors.push(x.target + ": " + x.error);
  if (hit && hit.channels && hit.channels.length) {
    return res.status(200).json({ channels: hit.channels, source, cached: true, stale: true, error: errors.join(" | ") });
  }
  return res.status(504).json({ channels: [], source, error: errors.join(" | ") || "Không tải được playlist" });
}

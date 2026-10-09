// Thin delivery proxy for the GitHub Actions-generated VietMiTV playlist.
// Keep this endpoint independent from /api/playlist?source=sport and from Node-only
// gzip decoding. The original sports-auto.m3u URL is used only by the GitHub generator.
const PLAYLIST_URL =
  "https://raw.githubusercontent.com/phuongnm7/Iptv-phuongnm7/main/generated/vietmitv-merge.m3u";

export const config = { maxDuration: 10 };

function setHeaders(res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  res.setHeader("X-NM7-Merge-Endpoint", "vietmitv-github-delivery-v1");
}

function validateM3U(text) {
  const value = String(text || "").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  if (!/^\s*#EXTM3U\b/im.test(value) || !/^\s*#EXTINF:/im.test(value)) {
    throw new Error("GitHub generated playlist is not a valid M3U");
  }
  return value.endsWith("\n") ? value : value + "\n";
}

function getSummary(playlist) {
  const channels = (playlist.match(/^\s*#EXTINF:/gim) || []).length;
  const groups = new Set();
  for (const line of playlist.split("\n")) {
    if (!/^\s*#EXTINF:/i.test(line)) continue;
    const match = /\bgroup-title\s*=\s*["']([^"']*)["']/i.exec(line);
    if (match && match[1].trim()) groups.add(match[1].trim());
  }
  return { channels, groups: [...groups] };
}

export default async function handler(req, res) {
  setHeaders(res);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD, OPTIONS");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(405).send("Method not allowed");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  let playlist;
  try {
    const upstream = await fetch(PLAYLIST_URL + "?_=" + Date.now(), {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "Accept": "application/x-mpegURL, audio/x-mpegurl, text/plain, */*",
        "Cache-Control": "no-cache, no-store",
        "Pragma": "no-cache",
        "User-Agent": "NM7-VietMiTV-Delivery-Proxy/1",
      },
    });
    if (!upstream.ok) {
      throw new Error("GitHub playlist returned HTTP " + upstream.status);
    }
    playlist = validateM3U(await upstream.text());
  } catch (error) {
    console.error("[vietmitv-merge] delivery proxy failed", error?.stack || error);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("X-NM7-Merge-Error-Stage", "fetch-generated-playlist");
    return res.status(502).send(
      "VietMiTV playlist delivery failed: " + (error?.message || String(error))
    );
  } finally {
    clearTimeout(timer);
  }

  const summary = getSummary(playlist);
  const wantsDiag = new URL(req.url || "/", "https://nm7-tv-web.vercel.app")
    .searchParams.has("diag");

  if (wantsDiag) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("X-NM7-Main-Entry-Count", String(summary.channels));
    res.setHeader("X-NM7-Group-Count", String(summary.groups.length));
    if (req.method === "HEAD") return res.status(200).end();
    return res.status(200).json({
      ok: true,
      endpoint: "vietmitv-github-delivery-v1",
      generator: "GitHub Actions",
      refreshSchedule: "*/5 * * * *",
      source: "GitHub-generated M3U",
      channels: summary.channels,
      groupCount: summary.groups.length,
      groups: summary.groups,
    });
  }

  res.setHeader("Content-Type", "application/x-mpegURL; charset=utf-8");
  res.setHeader("X-NM7-Main-Source", "github-generated-m3u");
  res.setHeader("X-NM7-Channel-Count", String(summary.channels));
  res.setHeader("X-NM7-Group-Count", String(summary.groups.length));
  if (req.method === "HEAD") return res.status(200).end();
  return res.status(200).send(playlist);
}

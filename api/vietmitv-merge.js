import { getVietMiTVPlaylist } from "./vietmitv-source.js";
import { getSportsFallbackM3U } from "./vietmitv-sports-fallback.js";

// This endpoint is isolated from /api/playlist?source=sport. The original sport source
// URL and its handler are intentionally not changed here.
const SPORTS_URL = "https://raw.githubusercontent.com/phuongnm7/Iptv-phuongnm7/main/sports-auto.m3u?utm_source=chatgpt.com";
const TARGET_GROUPS = [
  "Giờ Vàng TV",
  "Gà Vàng 24h TV",
  "Gà Vàng 33 TV",
  "S8 TV",
  "Sao Kê TV"
];

export const config = { maxDuration: 30 };

function normalizeGroup(value) {
  return String(value || "").normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");
}

function validatePlaylist(text, label) {
  const value = String(text || "").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  if (!/^\s*#EXTM3U\b/i.test(value) || !/^\s*#EXTINF:/im.test(value)) {
    throw new Error(label + " không trả về M3U hợp lệ");
  }
  return value;
}

async function fetchSports() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(SPORTS_URL, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "Accept": "application/x-mpegURL, audio/x-mpegurl, text/plain, */*",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "User-Agent": "NM7-TV-Playlist-Merger/1.0"
      }
    });
    if (!response.ok) throw new Error("sports-auto.m3u phản hồi HTTP " + response.status);
    return validatePlaylist(await response.text(), "sports-auto.m3u");
  } finally {
    clearTimeout(timer);
  }
}

function extractEntries(m3u) {
  const entries = [];
  let current = null;
  function finish() {
    if (!current) return;
    const hasUrl = current.some(line => {
      const value = line.trim();
      return value && !value.startsWith("#") &&
        /^(https?|rtsp|rtmp|udp):\/\//i.test(value.split("|")[0]);
    });
    if (hasUrl) entries.push(current);
  }

  for (const line of m3u.split(/\r?\n/)) {
    if (/^\s*#EXTM3U\b/i.test(line)) continue;
    if (/^\s*#EXTINF:/i.test(line)) {
      finish();
      current = [line];
    } else if (current) {
      current.push(line);
    }
  }
  finish();
  return entries;
}

function entryGroup(entry) {
  const extinf = entry.find(line => /^\s*#EXTINF:/i.test(line)) || "";
  const match = /\bgroup-title\s*=\s*["']([^"']*)["']/i.exec(extinf);
  if (match) return match[1].trim();
  const extgrp = entry.find(line => /^\s*#EXTGRP:/i.test(line)) || "";
  return extgrp.replace(/^\s*#EXTGRP:/i, "").trim();
}

function composePlaylist(mainM3u, sportsM3u, fallbackM3U) {
  const mainLines = mainM3u.split(/\r?\n/);
  const header = mainLines.find(line => /^\s*#EXTM3U\b/i.test(line)) || "#EXTM3U";
  const mainBody = mainLines.filter(line => !/^\s*#EXTM3U\b/i.test(line)).join("\n").trim();
  if (!mainBody) throw new Error("File M3U chính không có nội dung kênh");

  const targets = new Set(TARGET_GROUPS.map(normalizeGroup));
  const liveExtras = extractEntries(sportsM3u).filter(entry => targets.has(normalizeGroup(entryGroup(entry))));
  const liveGroups = new Set(liveExtras.map(entry => normalizeGroup(entryGroup(entry))));
  const missingGroups = new Set([...targets].filter(group => !liveGroups.has(group)));
  const fallbackExtras = extractEntries(fallbackM3U).filter(entry =>
    targets.has(normalizeGroup(entryGroup(entry))) && missingGroups.has(normalizeGroup(entryGroup(entry)))
  );
  const extras = liveExtras.concat(fallbackExtras);
  const availableGroups = new Set(extras.map(entry => normalizeGroup(entryGroup(entry))));
  const missing = [...targets].filter(group => !availableGroups.has(group));
  if (missing.length) throw new Error("Thiếu nhóm kênh dự phòng: " + missing.join(", "));

  const merged = header + "\n" + mainBody + "\n" +
    extras.map(entry => entry.join("\n").trim()).join("\n") + "\n";

  return {
    m3u: merged,
    mainEntries: extractEntries(mainM3u).length,
    extraEntries: extras.length,
    mainGroups: [...new Set(extractEntries(mainM3u).map(entry => entryGroup(entry)).filter(Boolean))],
    extraGroups: [...new Set(extras.map(entry => entryGroup(entry)))],
    totalEntries: extractEntries(merged).length
  };
}

function setHeaders(res) {
  res.setHeader("Content-Type", "audio/x-mpegurl; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  res.setHeader("X-NM7-Merge-Endpoint", "vietmitv-merge-v2");
}

export default async function handler(req, res) {
  setHeaders(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD, OPTIONS");
    return res.status(405).send("Method not allowed");
  }

  // Read both bundled files before touching the network. Sports-source failures must
  // never stop the primary uploaded playlist from being served.
  let mainM3u;
  let fallbackM3u;
  try {
    mainM3u = validatePlaylist(getVietMiTVPlaylist(), "File M3U đã tải lên");
    fallbackM3u = validatePlaylist(getSportsFallbackM3U(), "Bản dự phòng thể thao");
  } catch (error) {
    // A local bundled-data error is an internal error, not an upstream 502.
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("X-NM7-Merge-Error-Stage", "local-bundled-data");
    return res.status(500).send("Không đọc được dữ liệu M3U đã đóng gói: " + (error?.message || "lỗi dữ liệu"));
  }

  let sportsM3u = fallbackM3u;
  let live = false;
  let fallbackReason = "upstream-unavailable";
  try {
    sportsM3u = await fetchSports();
    live = true;
    fallbackReason = "";
  } catch (_) {
    // Keep the original source URL unchanged and use the bundled sports groups.
    // Deliberately do not propagate the upstream error into the HTTP response.
  }

  let result;
  try {
    result = composePlaylist(mainM3u, sportsM3u, fallbackM3u);
  } catch (_) {
    // A malformed/incomplete live source must not prevent playback of the known-good
    // bundled groups. Retry composition using bundled data only.
    live = false;
    fallbackReason = "local-merge-recovery";
    try {
      result = composePlaylist(mainM3u, fallbackM3u, fallbackM3u);
    } catch (_) {
      // Last-resort response: the primary M3U is locally valid, so serve it rather than
      // returning a gateway error. This branch is independent of sports-auto.m3u.
      res.setHeader("X-NM7-Sports-Source", "fallback-failed-primary-only");
      res.setHeader("X-NM7-Main-Source", "uploaded-m3u");
      if (req.method === "HEAD") return res.status(200).end();
      return res.status(200).send(mainM3u.endsWith("\n") ? mainM3u : mainM3u + "\n");
    }
  }

  res.setHeader("X-NM7-Main-Source", "uploaded-m3u");
  res.setHeader("X-NM7-Sports-Source", live ? "live" : "fallback");
  res.setHeader("X-NM7-Main-Group-Count", String(result.mainGroups.length));
  res.setHeader("X-NM7-Main-Entry-Count", String(result.mainEntries));
  res.setHeader("X-NM7-Extra-Group-Count", String(result.extraGroups.length));
  res.setHeader("X-NM7-Extra-Entry-Count", String(result.extraEntries));
  res.setHeader("X-NM7-Total-Entry-Count", String(result.totalEntries));
  res.setHeader("X-NM7-Extra-Groups", result.extraGroups.join(", "));
  if (fallbackReason) res.setHeader("X-NM7-Sports-Fallback-Reason", fallbackReason);

  const wantsDiag = new URL(req.url, "https://nm7-tv-web.vercel.app").searchParams.has("diag");
  if (wantsDiag) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    if (req.method === "HEAD") return res.status(200).end();
    return res.status(200).json({
      ok: true,
      endpoint: "vietmitv-merge-v2",
      mainSource: "uploaded-m3u",
      sportsSource: live ? "live" : "bundled-fallback",
      mainEntries: result.mainEntries,
      mainGroups: result.mainGroups.length,
      extraEntries: result.extraEntries,
      extraGroups: result.extraGroups,
      totalEntries: result.totalEntries,
      fallbackReason: fallbackReason || null
    });
  }

  if (req.method === "HEAD") return res.status(200).end();
  return res.status(200).send(result.m3u);
}

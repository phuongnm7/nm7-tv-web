import { getVietMiTVPlaylist } from "./vietmitv-source.js";
import { getSportsFallbackM3U } from "./vietmitv-sports-fallback.js";

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
  // Keep the request short so a slow upstream cannot consume the serverless function's
  // execution window. A bundled fallback is available immediately after this timeout.
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
  } catch (error) {
    throw new Error("Không tải được sports-auto.m3u trong 4,5 giây: " + (error?.message || "lỗi nguồn"));
  } finally {
    clearTimeout(timer);
  }
}

function extractEntries(m3u) {
  const entries = [];
  let current = null;
  function finish() {
    if (current && current.some(line => {
      const value = line.trim();
      return value && !value.startsWith("#") && /^(https?|rtsp|rtmp|udp):\/\//i.test(value.split("|")[0]);
    })) entries.push(current);
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
    extraEntries: extras.length,
    extraGroups: [...new Set(extras.map(entry => entryGroup(entry)))],
    mainGroups: [...new Set(extractEntries(mainM3u).map(entry => entryGroup(entry)).filter(Boolean))]
  };
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "audio/x-mpegurl; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD, OPTIONS");
    return res.status(405).send("Method not allowed");
  }

  try {
    const [mainM3u, sportsResult] = await Promise.all([
      Promise.resolve(getVietMiTVPlaylist()).then(text => validatePlaylist(text, "File M3U đã tải lên")),
      fetchSports().then(body => ({ body, live: true })).catch(error => ({
        body: getSportsFallbackM3U(),
        live: false,
        error: String(error)
      }))
    ]);
    const sportsM3u = validatePlaylist(sportsResult.body, sportsResult.live ? "sports-auto.m3u" : "Bản dự phòng thể thao");
    const result = composePlaylist(mainM3u, sportsM3u, getSportsFallbackM3U());
    res.setHeader("X-NM7-Main-Source", "uploaded-m3u");
    res.setHeader("X-NM7-Sports-Source", sportsResult.live ? "live" : "fallback");
    res.setHeader("X-NM7-Main-Group-Count", String(result.mainGroups.length));
    res.setHeader("X-NM7-Extra-Group-Count", String(result.extraGroups.length));
    res.setHeader("X-NM7-Extra-Entry-Count", String(result.extraEntries));
    res.setHeader("X-NM7-Extra-Groups", result.extraGroups.join(", "));
    if (sportsResult.error) res.setHeader("X-NM7-Sports-Fallback-Reason", "upstream-unavailable");
    if (req.method === "HEAD") return res.status(200).end();
    return res.status(200).send(result.m3u);
  } catch (error) {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(502).send("Không thể tạo playlist gộp: " + (error?.message || "lỗi nguồn phát"));
  }
}

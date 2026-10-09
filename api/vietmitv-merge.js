const SOURCES = {
  main: "https://vietmitv.id.vn/vietmitv.m3u",
  sports: "https://raw.githubusercontent.com/phuongnm7/Iptv-phuongnm7/main/sports-auto.m3u?utm_source=chatgpt.com"
};

const TARGET_GROUPS = [
  "Giờ Vàng TV",
  "Gà Vàng 24h TV",
  "Gà Vàng 33 TV",
  "S8 TV",
  "Sao Kê TV"
];

export const config = { maxDuration: 30 };

function normalizeGroup(value) {
  return String(value || "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("vi");
}

function validatePlaylist(text, label) {
  const value = String(text || "").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  if (!/^\s*#EXTM3U\b/i.test(value) || !/^\s*#EXTINF:/im.test(value)) {
    throw new Error(label + " không trả về M3U hợp lệ");
  }
  return value;
}

async function fetchPlaylist(url, label) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 11000);
    try {
      const response = await fetch(url, {
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
      if (!response.ok) {
        throw new Error(label + " phản hồi HTTP " + response.status);
      }
      return validatePlaylist(await response.text(), label);
    } catch (error) {
      lastError = error;
      if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 250));
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(label + " không tải được: " + (lastError?.message || "lỗi không xác định"));
}

function extractEntries(m3u) {
  const entries = [];
  let current = null;
  for (const line of m3u.split("\n")) {
    if (/^\s*#EXTM3U\s*$/i.test(line)) continue;
    if (/^\s*#EXTINF:/i.test(line)) {
      if (current && current.some(item => /^(https?|rtsp|rtmp|udp):\/\//i.test(item.trim().split("|")[0]))) {
        entries.push(current);
      }
      current = [line];
    } else if (current) {
      current.push(line);
    }
  }
  if (current && current.some(item => /^(https?|rtsp|rtmp|udp):\/\//i.test(item.trim().split("|")[0]))) {
    entries.push(current);
  }
  return entries;
}

function entryGroup(entry) {
  const extinf = entry.find(line => /^\s*#EXTINF:/i.test(line)) || "";
  const match = /\bgroup-title\s*=\s*["']([^"']*)["']/i.exec(extinf);
  if (match) return match[1].trim();

  const extgrp = entry.find(line => /^\s*#EXTGRP:/i.test(line)) || "";
  return extgrp.replace(/^\s*#EXTGRP:/i, "").trim();
}

function playlistBody(m3u) {
  return m3u
    .split("\n")
    .filter(line => !/^\s*#EXTM3U\s*$/i.test(line))
    .join("\n")
    .trim();
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
    const [mainM3u, sportsM3u] = await Promise.all([
      fetchPlaylist(SOURCES.main, "VietMiTV"),
      fetchPlaylist(SOURCES.sports, "sports-auto.m3u")
    ]);

    const targetSet = new Set(TARGET_GROUPS.map(normalizeGroup));
    const selectedEntries = extractEntries(sportsM3u).filter(entry =>
      targetSet.has(normalizeGroup(entryGroup(entry)))
    );

    const mainBody = playlistBody(mainM3u);
    if (!mainBody) throw new Error("Playlist VietMiTV không có nội dung kênh");

    const merged = "#EXTM3U\n" +
      mainBody + "\n" +
      selectedEntries.map(entry => entry.join("\n").trim()).join("\n") +
      (selectedEntries.length ? "\n" : "");

    res.setHeader("X-NM7-Main-Source", "VietMiTV");
    res.setHeader("X-NM7-Selected-Group-Count", String(new Set(
      selectedEntries.map(entry => normalizeGroup(entryGroup(entry)))
    ).size));
    res.setHeader("X-NM7-Selected-Channel-Count", String(selectedEntries.length));
    if (req.method === "HEAD") return res.status(200).end();
    return res.status(200).send(merged);
  } catch (error) {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(502).send("Không thể tạo playlist gộp mới: " + (error?.message || "lỗi nguồn phát"));
  }
}

#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const worker = fs.readFileSync('worker.js', 'utf8');
const appFiles = ['web-tv/app.js', 'web-tv/app-safari-policy.js'];

assert.match(worker, /async function playlistResponse\(source,defaultChoice='',env=null,forceRefresh=false\)/,
  'playlistResponse must accept an explicit refresh flag');
assert.match(worker, /if\(!forceRefresh&&hit&&now-hit\.time<CACHE_TTL\)/,
  'force refresh must bypass the in-memory cache');
assert.match(worker, /q\.get\('refresh'\)==='1'/,
  '/api/playlist must pass refresh=1 to playlistResponse');
assert.match(worker, /refreshed:forceRefresh/,
  'successful API response must report whether it bypassed cache');
assert.match(worker, /sport:\s*\[\s*'https:\/\/thethaonm7\.phuongnm7-iptv\.workers\.dev\/playlist\.m3u',\s*'https:\/\/raw\.githubusercontent\.com\/phuongnm7\/Iptv-phuongnm7\/main\/sports-auto\.m3u\?utm_source=chatgpt\.com'/,
  'default sport source must prefer the live Worker and keep GitHub as fallback');

for (const file of appFiles) {
  const source = fs.readFileSync(file, 'utf8');
  assert.match(source, /if\(source==='sport'\)playlistUrl\+='&refresh=1';/,
    file + ': opening/reloading Sport must request a fresh default playlist');
  console.log('PASS ' + file + ': sport requests refresh=1');
}

const html = fs.readFileSync('web-tv/index.html', 'utf8');
assert.ok(html.includes('app-safari-policy.js?v=20261010-sport-refresh1'),
  'index.html must bump the active player cache-buster');

console.log('SPORT_PLAYLIST_REFRESH_TESTS_OK');

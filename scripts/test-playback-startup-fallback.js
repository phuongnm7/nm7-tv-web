#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const files = ['web-tv/app.js', 'web-tv/app-safari-policy.js'];

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');

  assert.match(source, /function startByType\(/, file + ': player startup exists');
  assert.match(source, /waitingForPlayback\|\|\$\('video'\)\.readyState<2\|\|\$\('video'\)\.paused/,
    file + ': startup timeout retries when status remains visible');
  assert.match(source, /nextCandidate\('Timeout phát '\+Math\.round\(wait\/1000\)\+'s · chưa xác nhận video chạy'\)/,
    file + ': timeout reports unconfirmed playback');
  assert.match(source, /var httpStatus=Number\(data&&data\.response/,
    file + ': reads HTTP status from HLS manifest/segment errors');
  assert.match(source, /if\(httpStatus>=400&&httpStatus<=599\)\{\s*nextCandidate\('HLS HTTP '/,
    file + ': does not wait for the 15-second watchdog on explicit HTTP failures');
  assert.match(source, /if\(data&&!S\.proxyAttempt&&data\.type===Hls\.ErrorTypes\.NETWORK_ERROR\)/,
    file + ': direct HLS CORS/network failures switch to proxy before retry backoff');
  assert.ok(source.includes("var wait=kind==='hls'?(isKnownSlow4k?15000:8000):15000;") ||
    source.includes("var wait=kind==='hls'?8000:15000;"),
    file + ': HLS startup timeout is bounded (15 seconds for known 4K, 8 seconds otherwise)');
  assert.doesNotMatch(source, /if\(isKnownSlow4k\)wait=45000/,
    file + ': SCTV4K does not wait 45 seconds before fallback');
  assert.match(source, /S\.hls!==h/,
    file + ': late events from destroyed HLS instances cannot cancel the current attempt');
  assert.match(source, /thử '\+\(nextViaProxy\?'proxy':'trực tiếp'\)/,
    file + ': retry toast reflects whether next attempt is direct or proxied');
  assert.match(source, /if\(l\.indexOf\('#EXTHTTP:'\)===0\)/,
    file + ': local M3U parser reads EXTHTTP headers');
  assert.match(source, /headers:Object\.assign\(\{\},headers\)/,
    file + ': local M3U candidate preserves custom headers');
  assert.match(source, /statusText\.indexOf\('Safari không phát được DASH\/ClearKey nội tuyến\.'\)===0/,
    file + ': preserves intentional Safari external fallback');
  assert.match(source, /addEventListener\('playing',function\(\)\{markPlaying\(S\.generation\)\}\)/,
    file + ': confirms startup when media actually emits playing');

  assert.doesNotMatch(source, /v\.onloadedmetadata=function\(\)\{markPlaying\(gen\)\}/,
    file + ': metadata alone must not be treated as playback');
  assert.doesNotMatch(source, /v\.oncanplay=function\(\)\{markPlaying\(gen\)\}/,
    file + ': canplay alone must not be treated as playback');
  assert.doesNotMatch(source, /p\.load\(url\)\.then\(function\(\)\{\s*markPlaying\(gen\);/,
    file + ': DASH manifest load alone must not clear the watchdog');
  assert.doesNotMatch(source, /STREAM_INITIALIZED,function\(\)\{markPlaying\(gen\)/,
    file + ': DASH stream initialization alone must not clear the watchdog');

  // The player UI previously contained double-escaped \\n sequences, visibly rendered as
  // backslash+n on screen. These should be actual JS newline escapes instead.
  assert.equal((source.match(/\\\\n/g) || []).length, 0,
    file + ': no double-escaped newline in player status/debug text');
  assert.match(source, /Lỗi cuối: '\+String\(reason\|\|'Không rõ'\)\.slice\(0,160\)/,
    file + ': terminal failure exposes a short reason without printing URLs');
  assert.ok(source.includes('function scheduleCandidateRetry()'),
    file + ': simultaneous video-element and HLS.js errors are serialized');
  assert.ok(source.includes('!(proxyFirst&&S.proxyAttempt)'),
    file + ': non-Stalker proxy-first providers are not retried through the same proxy');
  assert.ok(source.includes('function isStalkerTsCandidate(cand,kind)') &&
    source.includes('var allowStalkerDirectFallback=isStalkerTsCandidate(cand,kind);') &&
    source.includes('||allowStalkerDirectFallback'),
    file + ': Stalker MPEG-TS tries the direct endpoint once after proxy failure');
  const helperStart = source.indexOf('function isStalkerTsCandidate(cand,kind){');
  const helperEnd = source.indexOf('\n}', helperStart);
  assert.ok(helperStart >= 0 && helperEnd > helperStart, file + ': Stalker fallback classifier is extractable for behavior tests');
  const isStalkerTsCandidate = new Function(source.slice(helperStart, helperEnd + 2) + '; return isStalkerTsCandidate;')();
  assert.equal(isStalkerTsCandidate({url:'http://mag.example.test/play/live.php?mac=M&stream=1&extension=ts&play_token=T'}, 'mpegts'), true,
    file + ': identifies a tokenized Stalker MPEG-TS stream');
  assert.equal(isStalkerTsCandidate({url:'http://example.test/live.ts'}, 'mpegts'), false,
    file + ': does not classify ordinary TS URLs as Stalker');
  assert.equal(isStalkerTsCandidate({url:'http://mag.example.test/play/live.php?mac=M&stream=1&extension=ts'}, 'mpegts'), false,
    file + ': does not use direct fallback without a playback token');
  assert.equal(isStalkerTsCandidate({url:'http://mag.example.test/play/live.php?mac=M&stream=1&extension=ts&play_token=T'}, 'hls'), false,
    file + ': Stalker direct fallback applies only to MPEG-TS');
  assert.ok(source.includes('if(S.hls)return;'),
    file + ': generic video error listener does not race HLS.js diagnostics');
  assert.ok(source.includes('startFragPrefetch:true'),
    file + ': first HLS fragment may start as soon as listed by the playlist');
  assert.ok(source.includes('enableWorker:!tizenLike'),
    file + ': HLS transmuxing worker is enabled except on older Tizen browsers');
  console.log('PASS', file);
  assert.ok(source.includes("/[?&]extension=(?:ts|m2ts)(?:&|$)/i.test(u)"),
    file + ': classifies Stalker /play/live.php?extension=ts as MPEG-TS');
  console.log('PASS', file);
}

console.log('PASS: startup fallback and status text checks');

// Regression: SCTV4K's direct manifest is valid but its direct TS children return HTTP 400;
// production diagnostics confirm the same children return HTTP 200 through the Worker proxy.
for (const file of ['web-tv/app.js', 'web-tv/app-safari-policy.js']) {
  const source = require('node:fs').readFileSync(file, 'utf8');
  assert.ok(source.includes("if(/vietanhtv\\.id\\.vn/i.test(String(cand.resolvedUrl||cand.url||'')))return true;"),
    file + ': SCTV4K provider is configured to start through proxy first');
  assert.ok(source.includes("var wait=kind==='hls'?(isKnownSlow4k?15000:8000):15000;") ||
    source.includes('var wait=kind==="hls"?(isKnownSlow4k?15000:8000):15000;'),
    file + ': known 4K startup timeout is capped at 15 seconds, not 45 seconds');
}

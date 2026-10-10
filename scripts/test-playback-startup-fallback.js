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
  assert.match(source, /var wait=kind===\'hls\'?8000:15000/,
    file + ': HLS startup watchdog is shorter than the generic 15-second timeout');
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
  console.log('PASS', file);
}

console.log('PASS: startup fallback and status text checks');

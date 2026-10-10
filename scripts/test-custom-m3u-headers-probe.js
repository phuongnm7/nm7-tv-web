#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

async function main() {
  const workerSource = fs.readFileSync('worker.js', 'utf8');
  const nodeSafeSource = workerSource.replace('import { connect } from "cloudflare:sockets";', 'const connect = () => { throw new Error("TCP sockets are unavailable in Node regression tests"); };');
  const moduleUrl = 'data:text/javascript;base64,' +
    Buffer.from(nodeSafeSource, 'utf8').toString('base64');
  const { default: worker } = await import(moduleUrl);
  const originalFetch = global.fetch;
  const seen = [];
  const fullUa = 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/140.0.0.0 Mobile Safari/537.36';
  const sportsUrl = 'https://film4k.net/api/tv/ants/3/index.m3u8';

  const m3u = [
    '#EXTM3U',
    '#EXTINF:-1 tvg-id="dazn-ppv-1" group-title="Quốc tế",|BE| DAZN PPV 1',
    '#EXTHTTP: {"User-Agent":"NM7-Test-Agent/1.0","Referer":"https://referer.example/live/","Origin":"https://origin.example","Accept-Language":"vi-VN","X-Test-Header":"custom-value"}',
    'https://cdn.example/live/index.m3u8',
    '#EXTINF:-1 tvg-id="uk-tnt-1" group-title="Thể thao",UK - TNT SPORTS 1 FHD',
    '#EXTVLCOPT:http-referrer=https://film4k.net/',
    '#EXTVLCOPT:http-origin=https://film4k.net',
    '#EXTVLCOPT:http-user-agent=' + fullUa,
    sportsUrl,
    ''
  ].join('\n');

  try {
    global.fetch = async (input, init = {}) => {
      const url = String(input);
      const method = init.method || 'GET';
      const headers = new Headers(init.headers || {});
      seen.push({ url, method, headers });

      if (url === 'https://playlist.example/list.m3u') {
        const response = new Response(m3u, {
          status: 200,
          headers: { 'Content-Type': 'application/vnd.apple.mpegurl' }
        });
        Object.defineProperty(response, 'url', { value: url, configurable: true });
        return response;
      }

      if ((url === 'https://cdn.example/live/index.m3u8' || url === sportsUrl) && method === 'HEAD') {
        const response = new Response(null, {
          status: 405,
          headers: { 'Content-Type': 'text/plain' }
        });
        Object.defineProperty(response, 'url', { value: url, configurable: true });
        return response;
      }

      if (url === 'https://cdn.example/live/index.m3u8' && method === 'GET') {
        assert.equal(headers.get('user-agent'), 'NM7-Test-Agent/1.0',
          'EXTHTTP User-Agent is passed to probe');
        assert.equal(headers.get('referer'), 'https://referer.example/live/',
          'EXTHTTP Referer is passed to probe');
        assert.equal(headers.get('origin'), 'https://origin.example',
          'EXTHTTP Origin is passed to probe');
        assert.equal(headers.get('accept-language'), 'vi-VN',
          'EXTHTTP extra headers are passed to probe');
        assert.equal(headers.get('x-test-header'), 'custom-value',
          'EXTHTTP custom headers are passed to probe');
        const response = new Response('#EXTM3U\n#EXTINF:4,\nsegment.ts\n', {
          status: 206,
          headers: { 'Content-Type': 'text/plain' }
        });
        Object.defineProperty(response, 'url', { value: url, configurable: true });
        return response;
      }

      if (url === sportsUrl && method === 'GET') {
        assert.equal(headers.get('user-agent'), fullUa,
          'unquoted EXT VlcOpt User-Agent including spaces reaches upstream intact');
        assert.equal(headers.get('referer'), 'https://film4k.net/',
          'EXTVLCOPT Referer is passed intact');
        assert.equal(headers.get('origin'), 'https://film4k.net',
          'EXTVLCOPT Origin is passed intact');
        const response = new Response('#EXTM3U\n#EXTINF:4,\nsegment.ts\n', {
          status: 206,
          headers: { 'Content-Type': 'text/plain' }
        });
        Object.defineProperty(response, 'url', { value: url, configurable: true });
        return response;
      }

      throw new Error('Unexpected fetch target: ' + url);
    };

    const sourceUrl = 'https://playlist.example/list.m3u';
    const sourceResponse = await worker.fetch(new Request(
      'https://nm7-test.example/api/source?u=' + encodeURIComponent(sourceUrl)
    ), {});
    assert.equal(sourceResponse.status, 200, 'custom source loads');
    const sourceData = await sourceResponse.json();
    assert.equal(sourceData.channels.length, 2, 'both custom sports and EXTHTTP channels are parsed');

    const candidate = sourceData.channels[0].candidates[0];
    assert.equal(candidate.ua, 'NM7-Test-Agent/1.0', 'EXTHTTP User-Agent retained');
    assert.equal(candidate.ref, 'https://referer.example/live/', 'EXTHTTP Referer retained');
    assert.equal(candidate.headers.Origin, 'https://origin.example', 'EXTHTTP Origin retained');
    assert.equal(candidate.headers['Accept-Language'], 'vi-VN', 'EXTHTTP extra headers retained');
    assert.equal(candidate.headers['X-Test-Header'], 'custom-value', 'EXTHTTP arbitrary header retained');

    const second = sourceData.channels[1].candidates[0];
    assert.equal(second.url, sportsUrl, 'sports stream URL is retained');
    assert.equal(second.ua, fullUa, 'unquoted User-Agent with spaces is not truncated');
    assert.equal(second.ref, 'https://film4k.net/', 'unquoted EXT VlcOpt Referer retained');
    assert.equal(second.headers.Origin, 'https://film4k.net', 'unquoted EXT VlcOpt Origin retained');

    for (const item of [
      { c: candidate, expectedType: 'hls' },
      { c: second, expectedType: 'hls' }
    ]) {
      const h = item.c.headers || {};
      const q = new URLSearchParams({
        u: item.c.url,
        ua: item.c.ua,
        r: item.c.ref,
        h: JSON.stringify(h)
      });
      const probe = await worker.fetch(new Request(
        'https://nm7-test.example/api/probe?' + q.toString()
      ), {});
      assert.equal(probe.status, 200, 'probe responds');
      const probeData = await probe.json();
      assert.equal(probeData.type, item.expectedType,
        'GET Range probe detects HLS when HEAD is rejected');
      assert.equal(probeData.status, 206, 'probe reports GET response status');
    }

    const appSources = [
      ['web-tv/app.js', fs.readFileSync('web-tv/app.js', 'utf8')],
      ['web-tv/app-safari-policy.js', fs.readFileSync('web-tv/app-safari-policy.js', 'utf8')]
    ];
    for (const [name, source] of appSources) {
      const uaParser = source.slice(source.indexOf('http-user-agent='), source.indexOf('/i.exec(l)', source.indexOf('http-user-agent=')));
      assert.ok(uaParser.includes('(.*)'), name + ' captures entire unquoted User-Agent value');
      assert.ok(!uaParser.includes('[^\\\\s]+'), name + ' no longer truncates User-Agent at first space');
    }

    assert(seen.some(x => x.method === 'HEAD'), 'HEAD attempted first');
    assert(seen.some(x => x.method === 'GET'), 'GET Range fallback used');
    console.log('PASS: EXTHTTP headers and GET Range fallback');
    console.log('PASS: unquoted EXTVLCOPT User-Agent with spaces is preserved in Worker and both players');
  } finally {
    global.fetch = originalFetch;
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

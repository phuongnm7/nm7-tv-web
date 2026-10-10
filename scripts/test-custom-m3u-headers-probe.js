#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');

async function main() {
  const workerSource = require('node:fs').readFileSync('worker.js', 'utf8');
  const moduleUrl = 'data:text/javascript;base64,' +
    Buffer.from(workerSource, 'utf8').toString('base64');
  const { default: worker } = await import(moduleUrl);
  const originalFetch = global.fetch;
  const seen = [];

  const m3u = [
    '#EXTM3U',
    '#EXTINF:-1 tvg-id="dazn-ppv-1" group-title="Quốc tế",|BE| DAZN PPV 1',
    '#EXTHTTP: {"User-Agent":"NM7-Test-Agent/1.0","Referer":"https://referer.example/live/","Origin":"https://origin.example","Accept-Language":"vi-VN","X-Test-Header":"custom-value"}',
    'https://cdn.example/live/index.m3u8',
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
      if (url === 'https://cdn.example/live/index.m3u8' && method === 'HEAD') {
        const response = new Response(null, {
          status: 405,
          headers: { 'Content-Type': 'text/plain' }
        });
        Object.defineProperty(response, 'url', { value: url, configurable: true });
        return response;
      }
      if (url === 'https://cdn.example/live/index.m3u8' && method === 'GET') {
        assert.equal(headers.get('user-agent'), 'NM7-Test-Agent/1.0',
          'probe preserves custom User-Agent');
        assert.equal(headers.get('referer'), 'https://referer.example/live/',
          'probe preserves custom Referer');
        assert.equal(headers.get('origin'), 'https://origin.example',
          'probe preserves custom Origin');
        assert.equal(headers.get('accept-language'), 'vi-VN',
          'probe preserves custom extra headers');
        assert.equal(headers.get('x-test-header'), 'custom-value',
          'probe preserves custom extension headers');
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
    const sourceRequest = new Request(
      'https://nm7-test.example/api/source?u=' + encodeURIComponent(sourceUrl)
    );
    const sourceResponse = await worker.fetch(sourceRequest, {});
    assert.equal(sourceResponse.status, 200, 'custom source loads');
    const sourceData = await sourceResponse.json();
    assert.equal(sourceData.channels.length, 1, 'one custom channel is parsed');
    const candidate = sourceData.channels[0].candidates[0];
    assert.equal(candidate.ua, 'NM7-Test-Agent/1.0', 'M3U User-Agent retained');
    assert.equal(candidate.ref, 'https://referer.example/live/', 'M3U Referer retained');
    assert.equal(candidate.headers.Origin, 'https://origin.example', 'M3U Origin retained');
    assert.equal(candidate.headers['Accept-Language'], 'vi-VN', 'extra M3U headers retained');
    assert.equal(candidate.headers['X-Test-Header'], 'custom-value', 'arbitrary M3U header retained');

    const extra = {
      'Accept-Language': candidate.headers['Accept-Language'],
      'X-Test-Header': candidate.headers['X-Test-Header'],
      Origin: candidate.headers.Origin
    };
    const q = new URLSearchParams({
      u: candidate.url,
      ua: candidate.ua,
      r: candidate.ref,
      h: JSON.stringify(extra)
    });
    const probe = await worker.fetch(
      new Request('https://nm7-test.example/api/probe?' + q.toString()), {}
    );
    assert.equal(probe.status, 200, 'probe responds');
    const probeData = await probe.json();
    assert.equal(probeData.type, 'hls', 'GET range probe detects an HLS manifest even when HEAD is rejected');
    assert.equal(probeData.status, 206, 'probe reports GET response status');
    assert(seen.some(x => x.method === 'HEAD'), 'HEAD attempted first');
    assert(seen.some(x => x.method === 'GET'), 'GET range fallback is used');
    console.log('PASS: custom M3U EXTHTTP headers are parsed and preserved');
    console.log('PASS: probe falls back from rejected HEAD and detects HLS using GET range');
  } finally {
    global.fetch = originalFetch;
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

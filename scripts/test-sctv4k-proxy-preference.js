#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');

async function main() {
  const fs = require('node:fs');
  const src = fs.readFileSync('worker.js', 'utf8');
  const nodeSafeSource = src.replace('import { connect } from "cloudflare:sockets";', 'const connect = () => { throw new Error("TCP sockets are unavailable in Node regression tests"); };');
  const url = 'data:text/javascript;base64,' + Buffer.from(nodeSafeSource, 'utf8').toString('base64');
  const { default: worker } = await import(url);
  const originalFetch = global.fetch;
  const playlist = [
    '#EXTM3U',
    '#EXTINF:-1 group-title="SCTV",SCTV4K',
    'https://vietanhtv.id.vn/live/stream.m3u8',
    '#EXTINF:-1 group-title="Other",Demo HLS',
    'https://other.example/live/stream.m3u8',
    ''
  ].join('\n');

  try {
    global.fetch = async (input) => {
      const target = String(input);
      assert.equal(target, 'https://playlist.example/list.m3u', 'only the fixture playlist is fetched');
      const response = new Response(playlist, {
        status: 200,
        headers: { 'Content-Type': 'application/vnd.apple.mpegurl' }
      });
      Object.defineProperty(response, 'url', { value: target, configurable: true });
      return response;
    };

    const response = await worker.fetch(new Request(
      'https://nm7-test.example/api/source?u=' +
      encodeURIComponent('https://playlist.example/list.m3u')
    ), {});
    assert.equal(response.status, 200);
    const data = await response.json();
    const sctv = data.channels.find(x => x.name === 'SCTV4K');
    const other = data.channels.find(x => x.name === 'Demo HLS');
    assert(sctv, 'SCTV4K channel parsed');
    assert(other, 'control channel parsed');
    const candidate = sctv.candidates.find(x => x.url === 'https://vietanhtv.id.vn/live/stream.m3u8');
    assert(candidate, 'SCTV4K candidate retained');
    assert.equal(candidate.forceProxy, true, 'known provider with HTTP 400 TS segments is proxy-first');
    assert.equal(Boolean(other.candidates[0].forceProxy), false, 'unrelated HLS remains unchanged');
    console.log('PASS: SCTV4K vietanhtv source is marked proxy-first; unrelated HLS is unchanged');
  } finally {
    global.fetch = originalFetch;
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

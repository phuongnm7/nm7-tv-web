#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

async function main() {
  const source = fs.readFileSync('worker.js', 'utf8');
  const dataUrl = 'data:text/javascript;base64,' + Buffer.from(source, 'utf8').toString('base64');
  const mod = await import(dataUrl);
  const worker = mod.default;
  const originalFetch = global.fetch;

  try {
    const segmentBytes = new Uint8Array([0x47, 0x00, 0x01, 0x02, 0x47, 0x03, 0x04, 0x05]);
    global.fetch = async () => new Response(segmentBytes, {
      status: 200,
      headers: { 'Content-Type': 'application/vnd.apple.mpegurl' }
    });

    const segmentUrl = 'https://cdn.example.test/live/segment.ts';
    const segmentRequest = new Request(
      'https://nm7-test.example/api/stream?u=' + encodeURIComponent(segmentUrl)
    );
    const segmentResponse = await worker.fetch(segmentRequest, {});

    assert.equal(segmentResponse.status, 200, 'segment response succeeds');
    assert.equal(segmentResponse.headers.get('content-type'), 'video/mp2t',
      'TS segment MIME is corrected even when upstream falsely calls it an HLS manifest');
    assert.deepEqual(
      new Uint8Array(await segmentResponse.arrayBuffer()),
      segmentBytes,
      'binary TS bytes pass through unchanged; they are not decoded/re-written as text'
    );
    console.log('PASS: mislabeled .ts media segment is passed through byte-for-byte');

    const manifestBody = '#EXTM3U\n#EXT-X-VERSION:3\n#EXTINF:4.0,\nsegment.ts\n#EXT-X-ENDLIST\n';
    global.fetch = async () => new Response(manifestBody, {
      status: 200,
      headers: { 'Content-Type': 'application/vnd.apple.mpegurl' }
    });
    const manifestUrl = 'https://cdn.example.test/live/index.m3u8';
    const manifestRequest = new Request(
      'https://nm7-test.example/api/stream?u=' + encodeURIComponent(manifestUrl)
    );
    const manifestResponse = await worker.fetch(manifestRequest, {});
    const rewritten = await manifestResponse.text();

    assert.equal(manifestResponse.status, 200, 'manifest response succeeds');
    assert.match(manifestResponse.headers.get('content-type') || '', /mpegurl/i,
      'HLS manifest retains an HLS Content-Type');
    assert.match(rewritten, /#EXTM3U/, 'manifest text is still parsed as HLS');
    assert.match(rewritten, /\/api\/stream\?u=/,
      'manifest segment URLs are rewritten through same-origin proxy');
    assert.match(rewritten, /segment\.ts/,
      'manifest still references its segment');
    console.log('PASS: HLS manifest rewriting remains enabled');
  } finally {
    global.fetch = originalFetch;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

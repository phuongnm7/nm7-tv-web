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
    global.fetch = async () => {
      const response = new Response(segmentBytes, {
        status: 200,
        headers: { 'Content-Type': 'application/vnd.apple.mpegurl' }
      });
      // Simulate a CDN redirect that hides the .ts suffix in the final URL.
      Object.defineProperty(response, 'url', {
        value: 'https://cdn.example.test/redirected/media?signature=test',
        configurable: true
      });
      return response;
    };

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

    // Regression: a custom sports stream can return an HLS manifest at an
    // extensionless endpoint with text/plain, so MIME/URL-only detection misses
    // it and relative segment URLs would bypass the proxy rewrite.
    const opaqueManifestUrl = 'https://cdn.example.test/edge/live?id=token';
    const opaqueManifestBody = '#EXTM3U\n#EXT-X-VERSION:3\n#EXTINF:4.0,\nsegments/chunk.ts?sig=child\n#EXT-X-ENDLIST\n';
    const customHeaders = {
      'Accept-Language': 'vi-VN',
      'X-M3U-Token': 'header-value'
    };
    global.fetch = async (input, init = {}) => {
      assert.equal(String(input), opaqueManifestUrl, 'opaque manifest upstream URL is preserved');
      const sent = new Headers(init.headers || {});
      assert.equal(sent.get('user-agent'), 'NM7-Regression-Agent/1.0', 'custom user-agent reaches upstream');
      assert.equal(sent.get('referer'), 'https://referer.example/live', 'custom referer reaches upstream');
      assert.equal(sent.get('accept-language'), 'vi-VN', 'custom M3U headers reach upstream');
      assert.equal(sent.get('x-m3u-token'), 'header-value', 'arbitrary custom header reaches upstream');
      const response = new Response(opaqueManifestBody, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
      Object.defineProperty(response, 'url', { value: opaqueManifestUrl, configurable: true });
      return response;
    };
    const opaqueQuery = new URLSearchParams({
      u: opaqueManifestUrl,
      ua: 'NM7-Regression-Agent/1.0',
      r: 'https://referer.example/live',
      h: JSON.stringify(customHeaders)
    });
    const opaqueManifestResponse = await worker.fetch(
      new Request('https://nm7-test.example/api/stream?' + opaqueQuery.toString()), {}
    );
    const opaqueRewritten = await opaqueManifestResponse.text();
    assert.match(opaqueManifestResponse.headers.get('content-type') || '', /mpegurl/i,
      'extensionless HLS manifest is correctly typed');
    assert.match(opaqueRewritten, /\/api\/stream\?u=/,
      'extensionless manifest segment is rewritten through the Worker proxy');
    assert.match(opaqueRewritten, /segments%2Fchunk\.ts|segments\/chunk\.ts/,
      'relative segment path is retained after rewrite');
    assert.match(opaqueRewritten, /X-M3U-Token|X-M3U-Token%22%3A%22header-value/,
      'custom header context is propagated to child segment requests');
    console.log('PASS: extensionless text/plain HLS manifests are sniffed and rewritten');
    console.log('PASS: User-Agent, Referer and custom headers are preserved by the proxy');

    // Regression: some CDNs give an opaque binary TS child the same misleading
    // mpegurl MIME as its manifest. It must remain byte-for-byte media.
    const opaqueSegmentUrl = 'https://cdn.example.test/opaque/segment?sig=segment';
    const opaqueSegmentBytes = new Uint8Array(564);
    opaqueSegmentBytes[0] = 0x47;
    opaqueSegmentBytes[188] = 0x47;
    opaqueSegmentBytes[376] = 0x47;
    global.fetch = async (input) => {
      assert.equal(String(input), opaqueSegmentUrl, 'opaque segment upstream URL is preserved');
      const response = new Response(opaqueSegmentBytes, {
        status: 200,
        headers: { 'Content-Type': 'application/vnd.apple.mpegurl' }
      });
      Object.defineProperty(response, 'url', { value: opaqueSegmentUrl, configurable: true });
      return response;
    };
    const opaqueSegmentResponse = await worker.fetch(new Request(
      'https://nm7-test.example/api/stream?u=' + encodeURIComponent(opaqueSegmentUrl)
    ), {});
    assert.equal(opaqueSegmentResponse.headers.get('content-type'), 'video/mp2t',
      'opaque binary TS is detected despite misleading mpegurl MIME');
    assert.deepEqual(new Uint8Array(await opaqueSegmentResponse.arrayBuffer()), opaqueSegmentBytes,
      'opaque TS payload is not decoded/re-written as text');
    console.log('PASS: extensionless binary TS mislabeled as HLS is passed through unchanged');

  } finally {
    global.fetch = originalFetch;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

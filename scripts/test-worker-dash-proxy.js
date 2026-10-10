#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');

async function main() {
  const source = require('node:fs').readFileSync('worker.js', 'utf8');
  const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(source, 'utf8').toString('base64');
  const { default: worker } = await import(moduleUrl);
  const originalFetch = global.fetch;
  const seen = [];
  const mediaBytes = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04]);

  try {
    global.fetch = async (input, init = {}) => {
      const url = String(input);
      const headers = new Headers(init.headers || {});
      const method = init.method || 'GET';
      seen.push({url, method, headers});

      if (url === 'https://cdn.example/manifest.mpd') {
        const body = [
          '<?xml version="1.0"?>',
          '<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" type="static">',
          '<Period><AdaptationSet><Representation id="v1">',
          '<BaseURL>https://cdn.example/media/</BaseURL>',
          '<SegmentTemplate initialization="init-$RepresentationID$.mp4" media="chunk-$Number%05d$.m4s" startNumber="1"/>',
          '<SegmentURL media="https://cdn.example/alt/segment-$Number$.m4s"/>',
          '</Representation></AdaptationSet></Period></MPD>'
        ].join('');
        const response = new Response(body, {
          status: 200,
          headers: {'Content-Type': 'application/dash+xml'}
        });
        Object.defineProperty(response, 'url', {value:url, configurable:true});
        return response;
      }

      if (url.startsWith('https://cdn.example/media/') ||
          url.startsWith('https://cdn.example/alt/')) {
        assert.equal(headers.get('user-agent'), 'NM7-DASH-Test/1.0',
          'DASH segment receives custom User-Agent');
        assert.equal(headers.get('referer'), 'https://referer.example/dash/',
          'DASH segment receives custom Referer');
        assert.equal(headers.get('origin'), 'https://origin.example',
          'DASH segment receives custom Origin');
        assert.equal(headers.get('x-custom'), 'preserved',
          'DASH segment receives custom extension header');
        const response = new Response(mediaBytes, {
          status: 200,
          headers: {'Content-Type':'application/vnd.apple.mpegurl'}
        });
        Object.defineProperty(response, 'url', {value:url, configurable:true});
        return response;
      }
      throw new Error('Unexpected upstream request: ' + url);
    };

    const h = {
      Origin: 'https://origin.example',
      'X-Custom': 'preserved'
    };
    const q = new URLSearchParams({
      u: 'https://cdn.example/manifest.mpd',
      ua: 'NM7-DASH-Test/1.0',
      r: 'https://referer.example/dash/',
      h: JSON.stringify(h)
    });
    const response = await worker.fetch(new Request('https://nm7-test.example/api/stream?' + q), {});
    assert.equal(response.status, 200, 'DASH manifest fetch succeeds');
    assert.match(response.headers.get('content-type') || '', /dash\+xml/i);
    const mpd = await response.text();
    assert.match(mpd, /\/api\/dash-resource\/[A-Za-z0-9_-]+\//,
      'DASH BaseURL is rewritten through the same-origin resource proxy');
    assert.match(mpd, /chunk-\$Number%05d\$\.m4s/,
      'relative DASH template token remains intact');
    assert.match(mpd, /segment-\$Number\$\.m4s/,
      'absolute DASH template token remains intact');

    const baseMatch = /<BaseURL>(https:\/\/nm7-test\.example\/api\/dash-resource\/[^<]+\/)<\/BaseURL>/.exec(mpd);
    assert(baseMatch, 'proxied BaseURL is present');
    const relativeSegment = new URL('chunk-00001.m4s', baseMatch[1]).toString();
    const segmentResponse = await worker.fetch(new Request(relativeSegment), {});
    assert.equal(segmentResponse.status, 200, 'relative DASH media request succeeds');
    assert.equal(segmentResponse.headers.get('content-type'), 'video/mp4',
      'M4S MIME is corrected even if upstream mislabels it');
    assert.deepEqual(new Uint8Array(await segmentResponse.arrayBuffer()), mediaBytes,
      'DASH media bytes pass through unchanged');

    const absoluteMatch = /media="(https:\/\/nm7-test\.example\/api\/dash-resource\/[^"]+\/segment-\$Number\$\.m4s)"/.exec(mpd);
    assert(absoluteMatch, 'absolute SegmentURL is rewritten through the proxy');
    const absoluteSegmentUrl = absoluteMatch[1].replace('$Number$', '00002');
    const absoluteSegmentResponse = await worker.fetch(new Request(absoluteSegmentUrl), {});
    assert.equal(absoluteSegmentResponse.status, 200, 'absolute DASH media request succeeds');
    assert.deepEqual(new Uint8Array(await absoluteSegmentResponse.arrayBuffer()), mediaBytes,
      'absolute DASH media bytes pass through unchanged');
    assert.equal(seen.filter(x => x.url.startsWith('https://cdn.example/media/') ||
      x.url.startsWith('https://cdn.example/alt/')).length, 2);
    console.log('PASS: DASH BaseURL and absolute segment templates use same-origin proxy');
    console.log('PASS: DASH segment requests preserve custom headers and binary bytes');
  } finally {
    global.fetch = originalFetch;
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');

async function main() {
  const workerSource = require('node:fs').readFileSync('worker.js', 'utf8');
  const nodeSafeSource = workerSource.replace(/^import \\{ connect \} from [\"']cloudflare:sockets[\"'];\\s*/, 'const connect = () => { throw new Error(\"TCP sockets are unavailable in Node regression tests\"); };\\n');
  const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(nodeSafeSource, 'utf8').toString('base64');
  const { default: worker } = await import(moduleUrl);
  const originalFetch = global.fetch;

  const nativeNm7Ua = 'NM7-TV/1.0.36 Android-TV';
  const customUa = 'Stalker-Custom-Test/2.0';
  const browserUa = 'Mozilla/5.0 (Android) Chrome/140.0 Test';
  let acceptedUa = nativeNm7Ua;
  let acceptedCookie = '';
  const seen = [];

  global.fetch = async (input, init = {}) => {
    const rawUrl = typeof input === 'string' ? input : input.url;
    const url = new URL(rawUrl);
    const method = init.method || (input instanceof Request ? input.method : 'GET');
    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));

    if (url.hostname === 'mag.example.test' || url.hostname === 'media.example.test') {
      seen.push({ host: url.hostname, method, ua: headers.get('user-agent') || '', cookie: headers.get('cookie') || '' });
      if ((headers.get('user-agent') || '') !== acceptedUa || (acceptedCookie && headers.get('cookie') !== acceptedCookie)) {
        return new Response('Forbidden', { status: 403, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
      if (method === 'HEAD') {
        return new Response(null, { status: 200, headers: { 'Content-Type': 'video/mp2t' } });
      }
      return new Response(Uint8Array.from([0x47, 0x40, 0x00, 0x10]), {
        status: 200,
        headers: { 'Content-Type': 'video/mp2t', 'Accept-Ranges': 'bytes' }
      });
    }
    return originalFetch(input, init);
  };

  const stalkerUrl = 'https://mag.example.test/play/live.php?mac=00%3A11%3A22%3A33%3A44%3A55&stream=1314077&extension=ts&play_token=SAFE_TEST';
  const makeWorkerRequest = (path, ua = browserUa) => new Request('https://nm7-test.example' + path, {
    headers: { 'User-Agent': ua }
  });

  try {
    // The player does not pass a UA when the playlist has no explicit header.
    // A Stalker live.php URL must then match the native NM7 Media3 default UA.
    let q = new URLSearchParams({ u: stalkerUrl });
    let response = await worker.fetch(makeWorkerRequest('/api/stream?' + q.toString()), {});
    assert.equal(response.status, 200, 'Stalker TS proxy should be accepted with native NM7 UA');
    assert.equal(response.headers.get('content-type'), 'video/mp2t', 'Stalker TS receives MPEG-TS MIME');
    assert(seen.some(x => x.host === 'mag.example.test' && x.method === 'GET' && x.ua === nativeNm7Ua),
      'Stalker stream request uses native NM7 Android User-Agent');

    // The diagnostic path must make the same UA choice as playback.
    seen.length = 0;
    q = new URLSearchParams({ u: stalkerUrl });
    response = await worker.fetch(makeWorkerRequest('/api/probe?' + q.toString()), {});
    assert.equal(response.status, 200, 'probe endpoint remains available');
    const result = await response.json();
    assert.equal(result.status, 200, 'probe reports the upstream result for the native NM7 UA');
    assert(seen.some(x => x.host === 'mag.example.test' && x.ua === nativeNm7Ua),
      'Stalker probe uses native NM7 Android User-Agent');

    // A real upstream 403 should expose only a coarse reason, never body or credentials.
    acceptedUa = customUa;
    seen.length = 0;
    q = new URLSearchParams({ u: stalkerUrl });
    response = await worker.fetch(makeWorkerRequest('/api/probe?' + q.toString()), {});
    const denied = await response.json();
    assert.equal(denied.status, 403, 'probe retains the real upstream HTTP status');
    assert.equal(denied.errorHint, 'upstream-access-policy', '403 body is classified without returning it');
    assert.equal(denied.bodyClass, 'plain-text', 'probe reports only the safe upstream body class');
    assert.equal(denied.bodyBytes, 9, 'probe reports response byte count without returning body text');
    assert.equal(denied.finalHost, 'mag.example.test', 'probe reports only the final hostname');
    assert.equal(JSON.stringify(denied).includes('Forbidden'), false, 'probe never echoes upstream body text');
    assert.equal(JSON.stringify(denied).includes('SAFE_TEST'), false, 'probe response never exposes tokens');

    // An explicitly supplied per-channel User-Agent must override the fallback.
    acceptedUa = customUa;
    seen.length = 0;
    q = new URLSearchParams({ u: stalkerUrl, ua: customUa });
    response = await worker.fetch(makeWorkerRequest('/api/stream?' + q.toString()), {});
    assert.equal(response.status, 200, 'explicit channel UA is preserved');
    assert(seen.some(x => x.host === 'mag.example.test' && x.ua === customUa),
      'explicit channel User-Agent wins over Stalker fallback');

    // Explicit Cookie headers from playlist metadata must reach the upstream.
    acceptedUa = nativeNm7Ua;
    acceptedCookie = 'session=SAFE_TEST_COOKIE';
    seen.length = 0;
    q = new URLSearchParams({ u: stalkerUrl, h: JSON.stringify({ Cookie: acceptedCookie }) });
    response = await worker.fetch(makeWorkerRequest('/api/stream?' + q.toString()), {});
    assert.equal(response.status, 200, 'explicit Stalker Cookie header is preserved');
    assert(seen.some(x => x.host === 'mag.example.test' && x.cookie === acceptedCookie),
      'explicit playlist Cookie reaches upstream');
    acceptedCookie = '';

    // Non-Stalker media must retain the existing browser/request UA behavior.
    acceptedUa = browserUa;
    seen.length = 0;
    const mediaUrl = 'https://media.example.test/live.ts';
    q = new URLSearchParams({ u: mediaUrl });
    response = await worker.fetch(makeWorkerRequest('/api/stream?' + q.toString(), browserUa), {});
    assert.equal(response.status, 200, 'non-Stalker stream still works');
    assert(seen.some(x => x.host === 'media.example.test' && x.ua === browserUa),
      'non-Stalker requests retain existing UA');

    console.log('PASS: Stalker default UA matches native NM7 TV');
    console.log('PASS: 403 probe returns safe coarse error classification');
    console.log('PASS: explicit per-channel UA overrides default');
    console.log('PASS: explicit playlist Cookie reaches upstream');
    console.log('PASS: non-Stalker UA behavior unchanged');
  } finally {
    global.fetch = originalFetch;
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

// Cookie-forwarding regression is included above; never print cookie values.

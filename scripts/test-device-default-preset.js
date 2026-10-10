#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const appFiles = [
  'web-tv/app.js',
  'web-tv/app-safari-policy.js'
];

const cases = [
  {
    name: 'Android phone identified from user agent',
    navigator: {
      userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36',
      platform: 'Linux armv8l',
      maxTouchPoints: 5
    },
    expected: 2
  },
  {
    name: 'Android identified from User-Agent Client Hints',
    navigator: {
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36',
      platform: 'Linux x86_64',
      userAgentData: { platform: 'Android' },
      maxTouchPoints: 5
    },
    expected: 2
  },
  {
    name: 'iPhone Safari',
    navigator: {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
      platform: 'iPhone',
      maxTouchPoints: 5
    },
    expected: 1
  },
  {
    name: 'iPad Safari with iPad user agent',
    navigator: {
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
      platform: 'iPad',
      maxTouchPoints: 5
    },
    expected: 1
  },
  {
    name: 'iPadOS requesting desktop website',
    navigator: {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',
      platform: 'MacIntel',
      maxTouchPoints: 5
    },
    expected: 1
  },
  {
    name: 'Windows desktop browser defaults to preset 2',
    navigator: {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36',
      platform: 'Win32',
      maxTouchPoints: 0
    },
    expected: 2
  },
  {
    name: 'macOS desktop retains preset 1',
    navigator: {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15',
      platform: 'MacIntel',
      maxTouchPoints: 0
    },
    expected: 1
  },
  {
    name: 'Samsung Tizen TV retains existing preset 1',
    navigator: {
      userAgent: 'Mozilla/5.0 (SMART-TV; Linux; Tizen 3.0) AppleWebKit/538.1 (KHTML, like Gecko) SamsungBrowser/1.1 TV Safari/538.1',
      platform: 'Linux armv7l',
      maxTouchPoints: 0
    },
    expected: 1
  }
];

for (const file of appFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const declaration = source.match(/function detectDefaultTvPreset\(\)\s*\{[\s\S]*?\n\}/);
  assert.ok(declaration, file + ': device preset detector must exist');
  assert.match(source, /tvPreset:\s*detectDefaultTvPreset\(\)/, file + ': preset must initialize before cache lookup');
  assert.match(source, /loadSource\('tv',false,S\.tvPreset\)/, file + ': startup must load detected preset');
  assert.doesNotMatch(source, /loadSource\('tv',false,1\)/, file + ': returning to TV must preserve the detected/selected preset');
  assert.ok(source.includes('Không tải được Nguồn mặc định 2. Vui lòng thử lại.'), file + ': preset 2 failure must replace the loading placeholder');
  assert.match(source, /else if\(requestPreset===1\)fallbackOriginal\(cached,e\);/, file + ': preset 2 failures must not silently load preset 1');
  assert.match(source, /Không tải được nguồn mặc định 2:/, file + ': preset 2 failure must be explicit');

  for (const testCase of cases) {
    const actual = vm.runInNewContext('(' + declaration[0] + ')()', {
      navigator: testCase.navigator
    });
    assert.equal(actual, testCase.expected, file + ': ' + testCase.name);
  }

  console.log('PASS ' + file + ': detector, startup selection, and ' + cases.length + ' platform cases');
}

const indexHtml = fs.readFileSync('web-tv/index.html', 'utf8');
assert.ok(indexHtml.includes('app-safari-policy.js?v=20261010-fast-hls-custom-source1'), 'index.html must bump the active app script cache-buster');

console.log('DEVICE_DEFAULT_TV_PRESET_TESTS_OK');

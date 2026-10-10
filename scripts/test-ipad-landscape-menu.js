#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const appFiles = ['web-tv/app.js', 'web-tv/app-safari-policy.js'];
const desktopIpadMarker = "var ipadDesktop=/Macintosh|MacIntel/i.test(ua+' '+platform)&&maxTouchPoints>1;";

for (const file of appFiles) {
  const source = fs.readFileSync(file, 'utf8');
  assert.ok(source.includes("var platform=String(navigator.platform||'');"),
    file + ': must inspect navigator.platform for iPadOS desktop mode');
  assert.ok(source.includes("var maxTouchPoints=Number(navigator.maxTouchPoints||0);"),
    file + ': must inspect touch point count');
  assert.ok(source.includes(desktopIpadMarker),
    file + ': must detect iPadOS Safari using Macintosh UA plus multiple touch points');
  assert.ok(source.includes('return !!(mobileUA||ipadDesktop||(touch&&small&&(coarse||!ua)));'),
    file + ': iPad desktop mode must not depend on a 1024px screen threshold');
  assert.ok(source.includes("window.addEventListener('orientationchange',mobileModeChange);"),
    file + ': device layout detection must rerun when orientation changes');
  console.log('PASS ' + file + ': desktop-mode iPad detection and orientation refresh');
}

const html = fs.readFileSync('web-tv/index.html', 'utf8');
assert.ok(html.includes('app-safari-policy.js?v=20261010-ipad-landscape-menu1'),
  'index.html must request the updated active Safari policy script');
assert.ok(html.includes('body.mobile-mode #mobileMenuBtn{display:flex;align-items:center;justify-content:center;flex:0 0 46px}'),
  'mobile-mode hamburger button must be visible');
assert.ok(html.includes('body.mobile-mode #homeTabs{display:flex}'),
  'mobile-mode top bar containing the hamburger must be visible');

const workflow = fs.readFileSync('.github/workflows/cloudflare-deploy.yml', 'utf8');
assert.ok(workflow.includes('node scripts/test-ipad-landscape-menu.js'),
  'Cloudflare workflow must run the iPad landscape menu regression test');
assert.ok(workflow.includes('app-safari-policy.js?v=20261010-ipad-landscape-menu1'),
  'production smoke test must request the active updated script');

console.log('IPAD_LANDSCAPE_MENU_REGRESSION_TESTS_OK');
